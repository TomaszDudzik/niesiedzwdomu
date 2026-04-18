"use client";

import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from "react";
import {
  ChevronDown,
  ChevronRight,
  ClipboardPaste,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const MiniMapLazy = lazy(() => import("../miejsca/mini-map").then((module) => ({ default: module.MiniMap })));
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS, DISTRICT_LIST } from "@/lib/mock-data";
import { detectDistrictFromText } from "@/lib/districts";
import { cn, formatDateShort, thumbUrl, withCacheBust } from "@/lib/utils";
import type { Activity, Organizer } from "@/types/database";
import { ImageSection } from "@/components/admin/image-section";
import { OrganizerCombobox } from "@/components/admin/organizer-combobox";
import { TaxonomyFields } from "@/components/admin/taxonomy-fields";
import { ensureOrganizerId } from "@/lib/admin-organizers";
import { resolveCategoryLevel1Name, resolveCategoryLevel2Name, resolveCategoryLevel3Name, resolveTypeLevel1Id, resolveTypeLevel2Id } from "@/lib/admin-taxonomy";
import { useAdminTaxonomy } from "@/lib/use-admin-taxonomy";

type DerivedActivityStatus = Activity["status"] | "outdated";
type ActivityListFilter = "all" | "published" | "draft" | "outdated";
const UNCATEGORIZED_GROUP = "__uncategorized__";

const ACTIVITY_ORDER: Activity["activity_type"][] = [
  "sportowe",
  "artystyczne",
  "edukacyjne",
  "muzyczne",
  "taneczne",
  "jezykowe",
  "sensoryczne",
  "inne",
];

const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
const labelClass = "block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

const FIELD_ALIASES: Record<string, string[]> = {
  title: ["title", "tytul", "tytuł", "nazwa", "zajecia", "zajęcia"],
  description_short: ["description_short", "krotki opis", "krótki opis", "opis", "temat"],
  description_long: ["description_long", "dlugi opis", "długi opis", "program"],
  type_lvl_1_id: ["type_lvl_1_id", "type_id", "type level 1", "typ poziom 1"],
  type_lvl_2_id: ["type_lvl_2_id", "subtype_id", "type level 2", "typ poziom 2"],
  category_lvl_1: ["category_lvl_1", "category_lvl_1_id", "main_category", "kategoria glowna", "kategoria główna", "category level 1"],
  category_lvl_2: ["category_lvl_2", "category_lvl_2_id", "category", "kategoria", "typ", "rodzaj", "activity_type", "type"],
  category_lvl_3: ["category_lvl_3", "category_lvl_3_id", "subcategory", "podkategoria", "sub category", "category level 3"],
  activity_type: ["activity_type", "typ", "rodzaj", "kategoria", "type"],
  schedule_summary: ["schedule_summary", "harmonogram", "grafik", "plan", "schedule"],
  days_of_week: ["days_of_week", "dni", "dni_tygodnia", "dni tygodnia"],
  date_start: ["date_start", "data od", "start", "od"],
  date_end: ["date_end", "data do", "koniec", "do"],
  time_start: ["time_start", "godzina od", "start_time", "od godziny"],
  time_end: ["time_end", "godzina do", "end_time", "do godziny"],
  age_min: ["age_min", "wiek od", "min age"],
  age_max: ["age_max", "wiek do", "max age"],
  price_from: ["price_from", "cena od", "price", "cena"],
  price_to: ["price_to", "cena do"],
  is_free: ["is_free", "free", "darmowe", "bezplatne", "bezpłatne"],
  organizer: ["organizer", "organizator"],
  organizer_id: ["organizer_id", "organizator_id"],
  venue_name: ["venue_name", "miejsce", "lokalizacja", "nazwa miejsca"],
  venue_address: ["venue_address", "adres", "address"],
  street: ["street", "ulica", "adres", "address"],
  postcode: ["postcode", "kod", "kod pocztowy", "zip", "postal code"],
  city: ["city", "miasto"],
  lat: ["lat", "latitude"],
  lng: ["lng", "lon", "longitude"],
  district: ["district", "dzielnica"],
  note: ["note", "notatka", "uwagi", "dodatkowe informacje"],
  source_url: ["source_url", "url", "link", "link_zrodlowy"],
  facebook_url: ["facebook_url", "facebook", "fb", "facebook page"],
  status: ["status", "stan"],
  likes: ["likes", "polubienia"],
  dislikes: ["dislikes", "niepolubienia"],
};

function resolveField(header: string): string | null {
  const key = header.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase() === key)) return field;
  }
  return null;
}

function asNumber(value?: string): number | null {
  if (!value) return null;
  const parsed = Number(String(value).replace(/,/g, ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTime(value?: string): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}:00`;
}

function detectDistrict(location: string): Activity["district"] {
  return detectDistrictFromText(location);
}

function normalizeActivityStatus(value?: string): Activity["status"] {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "published" || normalized === "opublikowany") return "published";
  if (normalized === "cancelled" || normalized === "anulowany") return "cancelled";
  if (normalized === "deleted" || normalized === "usuniety" || normalized === "usunięty") return "deleted";
  return "draft";
}

function inferActivityType(mappedType: string | undefined, title: string): Activity["activity_type"] {
  const text = `${mappedType || ""} ${title}`.toLowerCase();
  if (text.includes("sport") || text.includes("pił") || text.includes("pilk") || text.includes("ruch")) return "sportowe";
  if (text.includes("taniec")) return "taneczne";
  if (text.includes("muzyk") || text.includes("śpiew") || text.includes("spiew")) return "muzyczne";
  if (text.includes("język") || text.includes("jezyk") || text.includes("english")) return "jezykowe";
  if (text.includes("sensory")) return "sensoryczne";
  if (text.includes("warsztat") || text.includes("art") || text.includes("rys") || text.includes("plasty")) return "artystyczne";
  if (text.includes("nauk") || text.includes("robot") || text.includes("kodow") || text.includes("edu")) return "edukacyjne";
  return "inne";
}

function formatPriceRange(activity: Activity): string {
  if (activity.is_free) return "Bezpłatnie";
  if (activity.price_from !== null && activity.price_to !== null) return `${activity.price_from}-${activity.price_to} zł`;
  if (activity.price_from !== null) return `od ${activity.price_from} zł`;
  if (activity.price_to !== null) return `do ${activity.price_to} zł`;
  return "Cena do ustalenia";
}

function getActivityGroupKey(activity: Partial<Activity> | Record<string, unknown>) {
  return typeof activity.category_lvl_1 === "string"
    ? activity.category_lvl_1
    : typeof activity.main_category === "string"
      ? activity.main_category
      : typeof activity.activity_type === "string"
        ? activity.activity_type
        : UNCATEGORIZED_GROUP;
}

function getActivityGroupLabel(group: string) {
  if (group === UNCATEGORIZED_GROUP) return "Bez kategorii";
  return ACTIVITY_TYPE_LABELS[group as keyof typeof ACTIVITY_TYPE_LABELS] ?? group;
}

function getActivityGroupIcon(group: string) {
  if (group === UNCATEGORIZED_GROUP) return "✨";
  return ACTIVITY_TYPE_ICONS[group as keyof typeof ACTIVITY_TYPE_ICONS] ?? "✨";
}

function sortActivityGroupKeys(keys: string[]) {
  return [...keys].sort((left, right) => {
    if (left === UNCATEGORIZED_GROUP) return 1;
    if (right === UNCATEGORIZED_GROUP) return -1;
    return getActivityGroupLabel(left).localeCompare(getActivityGroupLabel(right), "pl");
  });
}

function parseStructuredText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { headers: [] as string[], rows: [] as Record<string, string>[] };

  const structMatch = trimmed.match(/[\[{][\s\S]*[\]}]/);
  if (!structMatch) return { headers: [] as string[], rows: [] as Record<string, string>[] };

  const raw = structMatch[0]
    .replace(/#[^\n]*/g, "")
    .replace(/<NA>/g, "null")
    .replace(/\bNaN\b/g, "null");

  const pythonLikeToJson = (input: string) => {
    let output = "";
    let inSingle = false;
    let escaped = false;

    for (let index = 0; index < input.length; index++) {
      const char = input[index];
      if (inSingle) {
        if (escaped) {
          output += char;
          escaped = false;
          continue;
        }
        if (char === "\\") {
          output += "\\\\";
          escaped = true;
          continue;
        }
        if (char === "'") {
          inSingle = false;
          output += '"';
          continue;
        }
        if (char === '"') {
          output += '\\"';
          continue;
        }
        output += char;
        continue;
      }
      if (char === "'") {
        inSingle = true;
        output += '"';
        continue;
      }
      output += char;
    }

    return output;
  };

  const attempts = [
    raw,
    raw.replace(/(?<=[{,[\s])'/g, '"').replace(/'(?=\s*[:,\]}])/g, '"'),
    pythonLikeToJson(raw),
  ];

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(
        attempt.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bNone\b/g, "null")
      );
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
        const headers = [...new Set(parsed.flatMap((row: Record<string, unknown>) => Object.keys(row)))];
        const rows = parsed.map((row: Record<string, unknown>) => {
          const values: Record<string, string> = {};
          headers.forEach((header) => {
            values[header] = row[header] != null ? String(row[header]) : "";
          });
          return values;
        });
        return { headers, rows };
      }
    } catch {
      // try next parser strategy
    }
  }

  return { headers: [] as string[], rows: [] as Record<string, string>[] };
}

function parseDelimitedText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return { headers: [] as string[], rows: [] as Record<string, string>[] };

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (lines.length < 2) return { headers: [] as string[], rows: [] as Record<string, string>[] };

  const separator = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map((cell) => cell.trim());
  if (headers.length < 2) return { headers: [] as string[], rows: [] as Record<string, string>[] };

  const rows = lines.slice(1).map((line) => {
    const values = line.split(separator);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || "").trim();
    });
    return row;
  });

  return { headers, rows };
}

export default function AdminActivitiesPage() {
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options, loading: taxonomyLoading } = useAdminTaxonomy();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<ActivityListFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [pasteModal, setPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteHeaders, setPasteHeaders] = useState<string[]>([]);
  const [pastePreview, setPastePreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);

  const mapActivityRow = useCallback((row: Record<string, unknown>): Activity => ({
    ...row,
    content_type: "activity",
    image_url: typeof row.image_cover === "string" && row.image_cover.trim().length > 0
      ? row.image_cover
      : (typeof row.image_url === "string" ? row.image_url : null),
    activity_type: inferActivityType(
      typeof row.category_lvl_1 === "string" ? row.category_lvl_1 : undefined,
      typeof row.title === "string" ? row.title : "",
    ),
    schedule_summary: [
      Array.isArray(row.days_of_week) ? row.days_of_week.map(String).join(", ") : "",
      typeof row.time_start === "string" && typeof row.time_end === "string"
        ? `${row.time_start.slice(0, 5)}-${row.time_end.slice(0, 5)}`
        : (typeof row.time_start === "string" ? row.time_start.slice(0, 5) : ""),
    ].filter(Boolean).join(" · ") || null,
    organizer: typeof (row.organizer_data as Record<string, unknown> | null | undefined)?.organizer_name === "string"
      ? String((row.organizer_data as Record<string, unknown>).organizer_name)
      : String(row.organizer || ""),
    street: typeof row.street === "string" ? row.street : "",
    city: typeof row.city === "string" && row.city.trim().length > 0 ? row.city : "Kraków",
    days_of_week: Array.isArray(row.days_of_week) ? row.days_of_week.map(String) : [],
    price_from: typeof row.price_from === "number" ? row.price_from : null,
    price_to: typeof row.price_to === "number" ? row.price_to : null,
    is_free: Boolean(row.is_free) || row.price_from === 0 || row.price_to === 0,
  }) as Activity, []);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/activities");
    const data = await response.json();
    if (Array.isArray(data)) {
      setActivities(data.map((row: Record<string, unknown>) => mapActivityRow(row)));
    }
    setLoading(false);
  }, [mapActivityRow]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    fetch("/api/admin/organizers")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) setOrganizers(data);
      });
  }, []);

  const getEffectiveStatus = useCallback((activity: Activity): DerivedActivityStatus => {
    const today = new Date().toISOString().slice(0, 10);
    const endDate = activity.date_end ? activity.date_end.slice(0, 10) : null;
    if (activity.status === "published" && endDate && endDate < today) return "outdated";
    return activity.status;
  }, []);

  const statusOrder: Record<DerivedActivityStatus, number> = {
    draft: 0,
    published: 1,
    outdated: 2,
    cancelled: 3,
    deleted: 4,
  };

  const filteredActivities = useMemo(() => {
    const scopedActivities = typeFilter ? activities.filter((activity) => getActivityGroupKey(activity) === typeFilter) : activities;
    if (statusFilter === "all") return scopedActivities;
    if (statusFilter === "draft") {
      return scopedActivities.filter((activity) => {
        const effectiveStatus = getEffectiveStatus(activity);
        return effectiveStatus === "draft" || effectiveStatus === "cancelled";
      });
    }
    return scopedActivities.filter((activity) => getEffectiveStatus(activity) === statusFilter);
  }, [activities, getEffectiveStatus, statusFilter, typeFilter]);

  const allGroupKeys = useMemo(() => {
    const groups = new Set<string>();
    activities.forEach((activity) => groups.add(getActivityGroupKey(activity)));
    return sortActivityGroupKeys(Array.from(groups));
  }, [activities]);

  const groupedActivities = useMemo(
    () => allGroupKeys.map((type) => ({
      type,
      items: filteredActivities
        .filter((activity) => getActivityGroupKey(activity) === type)
        .sort((left, right) => {
          const statusDiff = statusOrder[getEffectiveStatus(left)] - statusOrder[getEffectiveStatus(right)];
          if (statusDiff !== 0) return statusDiff;
          const dateDiff = (left.date_start || "").localeCompare(right.date_start || "");
          if (dateDiff !== 0) return dateDiff;
          return left.title.localeCompare(right.title, "pl");
        }),
    })),
    [allGroupKeys, filteredActivities, getEffectiveStatus]
  );

  const publishedCount = useMemo(
    () => activities.filter((activity) => getEffectiveStatus(activity) === "published").length,
    [activities, getEffectiveStatus]
  );
  const draftCount = useMemo(
    () => activities.filter((activity) => {
      const effectiveStatus = getEffectiveStatus(activity);
      return effectiveStatus === "draft" || effectiveStatus === "cancelled";
    }).length,
    [activities, getEffectiveStatus]
  );
  const outdatedCount = useMemo(
    () => activities.filter((activity) => getEffectiveStatus(activity) === "outdated").length,
    [activities, getEffectiveStatus]
  );

  const sectionStats = useMemo(
    () => Object.fromEntries(
      allGroupKeys.map((type) => {
        const typeActivities = activities.filter((activity) => getActivityGroupKey(activity) === type);
        const published = typeActivities.filter((activity) => getEffectiveStatus(activity) === "published").length;
        const draft = typeActivities.filter((activity) => {
          const effectiveStatus = getEffectiveStatus(activity);
          return effectiveStatus === "draft" || effectiveStatus === "cancelled";
        }).length;
        const outdated = typeActivities.filter((activity) => getEffectiveStatus(activity) === "outdated").length;
        return [type, { all: typeActivities.length, published, draft, outdated }];
      })
    ),
    [activities, allGroupKeys, getEffectiveStatus]
  );

  const visibleTypeKeys = useMemo(
    () => sortActivityGroupKeys(Array.from(new Set(filteredActivities.map((activity) => getActivityGroupKey(activity))))),
    [filteredActivities]
  );

  const hasExpandedCategories = useMemo(
    () => visibleTypeKeys.some((type) => !collapsedCategories[type]),
    [collapsedCategories, visibleTypeKeys]
  );

  const toggleCategory = (type: string) => {
    setCollapsedCategories((current) => ({ ...current, [type]: !current[type] }));
  };

  const toggleStatusFilter = (filter: ActivityListFilter) => {
    const nextFilter = statusFilter === filter ? "all" : filter;
    setTypeFilter(null);
    setStatusFilter(nextFilter);
    const nextCollapsed = Object.fromEntries(
      allGroupKeys.map((type) => {
        const matchingItems = activities.filter((activity) => {
          if (getActivityGroupKey(activity) !== type) return false;
          if (nextFilter === "all") return true;
          if (nextFilter === "draft") {
            const effectiveStatus = getEffectiveStatus(activity);
            return effectiveStatus === "draft" || effectiveStatus === "cancelled";
          }
          return getEffectiveStatus(activity) === nextFilter;
        });
        return [type, matchingItems.length === 0];
      })
    );
    setCollapsedCategories(nextCollapsed);
  };

  const toggleTypeStatusFilter = (type: string, filter: ActivityListFilter) => {
    if (typeFilter === type && statusFilter === filter) {
      setTypeFilter(null);
      setStatusFilter("all");
      return;
    }
    setTypeFilter(type);
    setStatusFilter(filter);
    setCollapsedCategories((current) => ({ ...current, [type]: false }));
  };

  const toggleAllCategories = () => {
    if (visibleTypeKeys.length === 0) return;
    setCollapsedCategories(Object.fromEntries(visibleTypeKeys.map((type) => [type, hasExpandedCategories])));
  };

  const parsePastedData = (text: string) => {
    const structured = parseStructuredText(text);
    if (structured.headers.length > 0) {
      setPasteHeaders(structured.headers);
      setPastePreview(structured.rows);
      return;
    }

    const delimited = parseDelimitedText(text);
    setPasteHeaders(delimited.headers);
    setPastePreview(delimited.rows);
  };

  const runPasteImport = async () => {
    if (pastePreview.length === 0) return;
    setImporting(true);
    setImportProgress({ done: 0, total: pastePreview.length });

    const imported: Activity[] = [];
    const knownOrganizers = [...organizers];

    for (let index = 0; index < pastePreview.length; index++) {
      const row = pastePreview[index];
      const mapped: Record<string, string> = {};

      for (const header of pasteHeaders) {
        const field = resolveField(header);
        if (field) mapped[field] = row[header] || "";
      }

      if (!mapped.title) {
        setImportProgress({ done: index + 1, total: pastePreview.length });
        continue;
      }

      const dateStart = mapped.date_start || new Date().toISOString().slice(0, 10);
      const dateEnd = mapped.date_end || null;
      const priceFrom = asNumber(mapped.price_from);
      const priceTo = asNumber(mapped.price_to);
      const street = mapped.street?.trim() || mapped.venue_address?.trim() || "";
      const postcode = mapped.postcode?.trim() || null;
      const city = mapped.city?.trim() || "Kraków";
      const district = mapped.district?.trim() ? detectDistrict(mapped.district) : detectDistrict([street, postcode, city].filter(Boolean).join(", "));
      const lat = asNumber(mapped.lat);
      const lng = asNumber(mapped.lng);
      const organizerName = mapped.organizer?.trim() || (!isUUID(mapped.organizer_id || "") ? mapped.organizer_id?.trim() || "" : "") || mapped.venue_name?.trim() || "Organizator";
      const organizerId = await ensureOrganizerId({
        organizers: knownOrganizers,
        organizerId: isUUID(mapped.organizer_id || "") ? mapped.organizer_id : null,
        organizerName,
        city,
        onOrganizerCreated: (organizer) => {
          knownOrganizers.push(organizer);
          setOrganizers((current) => current.some((entry) => entry.id === organizer.id) ? current : [...current, organizer]);
        },
      });
      const typeLevel1Id = resolveTypeLevel1Id(typeLevel1Options, mapped.type_lvl_1_id?.trim() || null);
      const typeLevel2Id = resolveTypeLevel2Id(typeLevel2Options, mapped.type_lvl_2_id?.trim() || null, typeLevel1Id);
      const categoryLevel1 = resolveCategoryLevel1Name(
        categoryLevel1Options,
        mapped.category_lvl_1?.trim() || inferActivityType(mapped.activity_type, mapped.title),
      );
      const categoryLevel2 = resolveCategoryLevel2Name(
        categoryLevel2Options,
        mapped.category_lvl_2?.trim() || null,
        categoryLevel1,
        categoryLevel1Options,
      );
      const categoryLevel3 = resolveCategoryLevel3Name(
        categoryLevel3Options,
        mapped.category_lvl_3?.trim() || null,
        categoryLevel2,
        categoryLevel2Options,
      );
      const status = normalizeActivityStatus(mapped.status);

      const payload = {
        title: mapped.title.trim(),
        description_short: mapped.description_short || "Opis zajęć",
        description_long: mapped.description_long || mapped.description_short || "",
        type_lvl_1_id: typeLevel1Id,
        type_lvl_2_id: typeLevel2Id,
        category_lvl_1: categoryLevel1,
        category_lvl_2: categoryLevel2,
        category_lvl_3: categoryLevel3,
        days_of_week: mapped.days_of_week ? mapped.days_of_week.split(/[,;/]/).map((part) => part.trim()).filter(Boolean) : [],
        date_start: dateStart,
        date_end: dateEnd,
        time_start: normalizeTime(mapped.time_start),
        time_end: normalizeTime(mapped.time_end),
        age_min: asNumber(mapped.age_min),
        age_max: asNumber(mapped.age_max),
        price_from: priceFrom,
        price_to: priceTo,
        district,
        street,
        postcode,
        city,
        lat,
        lng,
        note: mapped.note?.trim() || null,
        organizer_id: organizerId,
        source_url: mapped.source_url || null,
        facebook_url: mapped.facebook_url || null,
        status,
        likes: asNumber(mapped.likes) ?? 0,
        dislikes: asNumber(mapped.dislikes) ?? 0,
      };

      try {
        const response = await fetch("/api/admin/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : "Nie udało się zaimportować wiersza");
        }
        if (data?.id) {
          imported.push(mapActivityRow(data));

          // Geocode address to get accurate district
          if (status !== "draft") {
            await fetch("/api/admin/activities", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: data.id, status }),
            });
            const idx = imported.findIndex((a) => a.id === data.id);
            if (idx !== -1) imported[idx] = { ...imported[idx], status };
          }

          if (street && (lat == null || lng == null)) {
            try {
              if (index > 0) await new Promise((r) => setTimeout(r, 1100));
              const geoRes = await fetch("/api/admin/geocode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: street, city }),
              });
              const geo = await geoRes.json();
              const nextPatch: Record<string, unknown> = { id: data.id };
              if (geo.lat && geo.lng) {
                nextPatch.lat = geo.lat;
                nextPatch.lng = geo.lng;
              }
              if (geo.district) {
                nextPatch.district = geo.district;
              }
              if (geo.postcode && !postcode) {
                nextPatch.postcode = geo.postcode;
              }
              if (geo.city) {
                nextPatch.city = geo.city;
              }
              if (Object.keys(nextPatch).length > 1) {
                await fetch("/api/admin/activities", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(nextPatch),
                });
                const idx = imported.findIndex((a) => a.id === data.id);
                if (idx !== -1) imported[idx] = {
                  ...imported[idx],
                  ...(geo.lat && geo.lng ? { lat: geo.lat, lng: geo.lng } : {}),
                  ...(geo.district ? { district: geo.district as Activity["district"] } : {}),
                  ...(geo.postcode && !postcode ? { postcode: geo.postcode } : {}),
                  ...(geo.city ? { city: geo.city } : {}),
                };
              }
            } catch { /* geocoding is best-effort */ }
          }
        }
      } catch {
        // skip invalid row
      }

      setImportProgress({ done: index + 1, total: pastePreview.length });
    }

    setActivities((current) => [...imported, ...current]);
    setImporting(false);
    setPasteModal(false);
    setPasteText("");
    setPasteHeaders([]);
    setPastePreview([]);
    if (imported.length === 0) {
      alert("Nie udało się zaimportować żadnych zajęć. Sprawdź kolumny i czy tabela activities istnieje w bazie.");
      return;
    }
    alert(`Zaimportowano ${imported.length} z ${pastePreview.length} zajęć`);
  };

  const handleFileSelect = (file: File) => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
  };

  const clearPendingFile = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  };

  const geocodeAddress = async () => {
    const street = String(editForm.street || editForm.venue_address || "").trim();
    const city = String(editForm.city || "Kraków").trim() || "Kraków";
    if (!street) return;
    setGeocoding(true);
    try {
      const res = await fetch("/api/admin/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: street, city }),
      });
      const data = await res.json();
      if (data.lat && data.lng) {
        setEditForm((prev) => ({
          ...prev,
          lat: data.lat,
          lng: data.lng,
          ...(data.city ? { city: data.city } : {}),
          ...(data.postcode ? { postcode: data.postcode } : {}),
          ...(data.district ? { district: data.district } : {}),
        }));
      }
    } catch { /* silent */ }
    setGeocoding(false);
  };

  const startEditing = (activity: Activity) => {
    setEditing(activity.id);
    setEditForm({
      title: activity.title,
      description_short: activity.description_short,
      description_long: activity.description_long,
      type_lvl_1_id: activity.type_lvl_1_id ?? activity.type_id ?? null,
      type_lvl_2_id: activity.type_lvl_2_id ?? activity.subtype_id ?? null,
      activity_type: activity.activity_type,
      schedule_summary: activity.schedule_summary,
      days_of_week: activity.days_of_week.join(", "),
      date_start: activity.date_start,
      date_end: activity.date_end,
      time_start: activity.time_start ? activity.time_start.slice(0, 5) : "",
      time_end: activity.time_end ? activity.time_end.slice(0, 5) : "",
      age_min: activity.age_min,
      age_max: activity.age_max,
      price_from: activity.price_from,
      price_to: activity.price_to,
      organizer: activity.organizer,
      organizer_id: activity.organizer_id ?? null,
      source_url: activity.source_url,
      facebook_url: activity.facebook_url || "",
      category_lvl_1: activity.category_lvl_1 ?? activity.main_category ?? null,
      category_lvl_2: activity.category_lvl_2 ?? activity.category ?? null,
      category_lvl_3: activity.category_lvl_3 ?? activity.subcategory ?? null,
      venue_name: activity.venue_name,
      venue_address: activity.venue_address,
      street: activity.street ?? "",
      postcode: activity.postcode ?? "",
      city: activity.city ?? "Kraków",
      lat: activity.lat ?? null,
      lng: activity.lng ?? null,
      district: activity.district,
      note: activity.note ?? "",
      is_free: activity.is_free,
      is_featured: activity.is_featured,
    });
  };

  const saveEdit = async (id: string) => {
    let newImageCover: string | null = null;
    if (pendingFile) {
      setUploadingImage(id);
      const formData = new FormData();
      formData.append("file", pendingFile);
      formData.append("id", id);
      formData.append("target", "activities");
      try {
        const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
        const data = await res.json();
        if (data.image_cover) newImageCover = `${data.image_cover.split("?")[0]}?t=${Date.now()}`;
      } catch { /* ignore */ }
      setUploadingImage(null);
      clearPendingFile();
    }

    const updates = {
      title: String(editForm.title || ""),
      description_short: String(editForm.description_short || ""),
      description_long: String(editForm.description_long || ""),
      type_lvl_1_id: editForm.type_lvl_1_id ? String(editForm.type_lvl_1_id) : null,
      type_lvl_2_id: editForm.type_lvl_2_id ? String(editForm.type_lvl_2_id) : null,
      days_of_week: String(editForm.days_of_week || "").split(",").map((part) => part.trim()).filter(Boolean),
      date_start: editForm.date_start,
      date_end: editForm.date_end || null,
      time_start: editForm.time_start ? `${String(editForm.time_start)}:00` : null,
      time_end: editForm.time_end ? `${String(editForm.time_end)}:00` : null,
      age_min: editForm.age_min === "" || editForm.age_min === null ? null : Number(editForm.age_min),
      age_max: editForm.age_max === "" || editForm.age_max === null ? null : Number(editForm.age_max),
      price_from: Boolean(editForm.is_free) ? 0 : (editForm.price_from === "" || editForm.price_from === null ? null : Number(editForm.price_from)),
      price_to: Boolean(editForm.is_free) ? 0 : (editForm.price_to === "" || editForm.price_to === null ? null : Number(editForm.price_to)),
      organizer_id: editForm.organizer_id || null,
      source_url: editForm.source_url ? String(editForm.source_url) : null,
      facebook_url: editForm.facebook_url ? String(editForm.facebook_url) : null,
      category_lvl_1: editForm.category_lvl_1 ? String(editForm.category_lvl_1) : null,
      category_lvl_2: editForm.category_lvl_2 ? String(editForm.category_lvl_2) : null,
      category_lvl_3: editForm.category_lvl_3 ? String(editForm.category_lvl_3) : null,
      street: String(editForm.street || editForm.venue_address || "").trim(),
      postcode: editForm.postcode ? String(editForm.postcode).trim() : null,
      city: String(editForm.city || "Kraków").trim() || "Kraków",
      lat: editForm.lat === "" || editForm.lat === null ? null : Number(editForm.lat),
      lng: editForm.lng === "" || editForm.lng === null ? null : Number(editForm.lng),
      district: editForm.district,
      note: editForm.note ? String(editForm.note) : null,
      ...(newImageCover ? { image_cover: newImageCover, image_set: null } : {}),
    };

    const response = await fetch("/api/admin/activities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const data = await response.json();

    if (!response.ok) {
      alert(`Blad zapisu: ${data.error || "Nieznany blad"}`);
      return;
    }

    if (data.updated) {
      setActivities((current) => current.map((activity) => (
        activity.id === id
          ? {
              ...mapActivityRow(data.updated as Record<string, unknown>),
              image_cover: withCacheBust(typeof data.updated.image_cover === "string" ? data.updated.image_cover : null),
              image_thumb: withCacheBust(typeof data.updated.image_thumb === "string" ? data.updated.image_thumb : null),
            }
          : activity
      )));
    }

    setEditing(null);
    setEditForm({});
  };

  const createActivity = async () => {
    const payload = {
      title: "Nowe zajęcia",
      description_short: "Opis zajęć",
      description_long: "",
      image_url: null,
      days_of_week: [],
      date_start: new Date().toISOString().slice(0, 10),
      date_end: null,
      time_start: null,
      time_end: null,
      age_min: null,
      age_max: null,
      price_from: null,
      price_to: null,
      district: "Inne",
      street: "",
      postcode: null,
      city: "Kraków",
      lat: null,
      lng: null,
      note: null,
      organizer_id: null,
      source_url: null,
      facebook_url: null,
    };

    const response = await fetch("/api/admin/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(`Błąd dodawania: ${data.error || "Nie udało się dodać zajęć"}`);
      return;
    }
    if (data?.id) {
      const newActivity = mapActivityRow(data as Record<string, unknown>);
      setActivities((current) => [newActivity, ...current]);
      setCollapsedCategories((current) => ({ ...current, [newActivity.activity_type]: false }));
      startEditing(newActivity);
    }
  };

  const toggleStatus = async (activity: Activity) => {
    const newStatus = activity.status === "published" ? "draft" : "published";
    const response = await fetch("/api/admin/activities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activity.id, status: newStatus }),
    });
    if (response.ok) {
      setActivities((current) => current.map((item) => (
        item.id === activity.id ? { ...item, status: newStatus } : item
      )));
    }
  };

  const toggleFeatured = async (activity: Activity) => {
    const nextFeatured = !activity.is_featured;
    const response = await fetch("/api/admin/activities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activity.id, is_featured: nextFeatured }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(`Błąd: ${data.error || "Nie udało się zapisać wyróżnienia"}`);
      return;
    }
    setActivities((current) => current.map((item) => (
      item.id === activity.id ? { ...item, is_featured: nextFeatured } : item
    )));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno chcesz usunac?")) return;
    await fetch("/api/admin/activities", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setActivities((current) => current.filter((activity) => activity.id !== id));
  };

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Zajęcia</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setPasteModal(true)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <ClipboardPaste size={14} />
            Wklej dane
          </button>
          <button onClick={createActivity} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-foreground rounded-xl hover:bg-stone-700 transition-colors">
            <Plus size={14} />
            Dodaj
          </button>
          <button onClick={fetchActivities} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => toggleStatusFilter("all")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>
          {activities.length} zajęć
        </button>
        <button onClick={() => toggleStatusFilter("published")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>
          {publishedCount} published
        </button>
        <button onClick={() => toggleStatusFilter("draft")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", draftCount > 0 ? (statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200") : (statusFilter === "draft" ? "bg-stone-300 text-stone-700" : "bg-stone-200 text-stone-500 hover:bg-stone-300"))}>
          {draftCount} draft
        </button>
        <button onClick={() => toggleStatusFilter("outdated")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "outdated" ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-700 hover:bg-amber-200")}>
          {outdatedCount} outdated
        </button>
        <button onClick={toggleAllCategories} className="ml-auto text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors bg-white border border-border text-muted hover:text-foreground hover:border-[#CCC]">
          {hasExpandedCategories ? "Zwiń wszystkie" : "Rozwiń wszystkie"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : (
        <div className="space-y-6">
          {groupedActivities.filter(({ type }) => !typeFilter || type === typeFilter).map(({ type, items }) => {
            const expanded = !collapsedCategories[type];
            const stats = sectionStats[type] ?? { all: 0, published: 0, draft: 0, outdated: 0 };
            return (
              <div key={type}>
                <div className="w-full flex items-center gap-2 mb-2 rounded-md px-1.5 py-1 hover:bg-accent/50 transition-colors">
                  <button type="button" onClick={() => toggleCategory(type)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                    <span className="text-lg">{getActivityGroupIcon(type)}</span>
                    <h2 className="text-[13px] font-semibold text-foreground">{getActivityGroupLabel(type)}</h2>
                  </button>
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "all")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>{stats.all} all</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "published")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>{stats.published} published</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "draft")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", stats.draft > 0 ? (typeFilter === type && statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200") : (typeFilter === type && statusFilter === "draft" ? "bg-stone-300 text-stone-700" : "bg-stone-200 text-stone-500 hover:bg-stone-300"))}>{stats.draft} draft</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "outdated")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "outdated" ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-700 hover:bg-amber-200")}>{stats.outdated} outdated</button>
                  </div>
                </div>

                {expanded && (
                  items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 bg-white px-3 py-4 text-[12px] text-muted">
                      Brak rekordów dla tego filtra.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map((activity, index) => {
                        const isDraft = activity.status !== "published";
                        const isEditing = editing === activity.id;
                        return (
                          <div key={activity.id} className={cn("rounded-lg border border-border/70", isDraft ? "bg-stone-100 opacity-70" : "bg-white")}>
                            <div className="flex items-center gap-2.5 px-3 py-2.5">
                              <span className="shrink-0 w-6 text-center text-[11px] font-mono text-muted-foreground">{index + 1}</span>
                              <span className="shrink-0 text-lg">{ACTIVITY_TYPE_ICONS[activity.activity_type]}</span>
                              {thumbUrl(activity.image_thumb, activity.image_url) ? (
                                <img src={thumbUrl(activity.image_thumb, activity.image_url) || ""} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                              ) : (
                                <span className="w-8 h-8 rounded bg-stone-100 shrink-0 flex items-center justify-center text-[10px] text-stone-400">—</span>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-foreground truncate">{activity.title}</p>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5">
                                  <span>{ACTIVITY_TYPE_LABELS[activity.activity_type]}</span>
                                  <span className="opacity-40">·</span>
                                  <span>{formatDateShort(activity.date_start)}{activity.date_end ? ` - ${formatDateShort(activity.date_end)}` : ""}</span>
                                  <span className="opacity-40">·</span>
                                  <span>{formatPriceRange(activity)}</span>
                                  <span className="opacity-40">·</span>
                                  <span className="truncate max-w-[180px]">{activity.organizer}</span>
                                </div>
                              </div>

                              <button onClick={() => startEditing(activity)} className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Edytuj">
                                <Pencil size={13} />
                              </button>

                              {activity.source_url && (
                                <a href={activity.source_url} target="_blank" rel="noopener" className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Zrodlo">
                                  <ExternalLink size={13} />
                                </a>
                              )}

                              <button onClick={() => toggleStatus(activity)} className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors", activity.status === "published" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-rose-100 text-rose-700 hover:bg-rose-200")}>
                                {activity.status === "published" ? "Published" : "Draft"}
                              </button>

                              <button onClick={() => handleDelete(activity.id)} className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Usun">
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {isEditing && (
                              <div className="px-3 pb-3 pt-2 border-t border-border/50">
                                <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Opis zajęć</p>
                                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                    <div className="md:col-span-3">
                                      <label className={labelClass}>Tytuł</label>
                                      <input className={inputClass} value={(editForm.title as string) || ""} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} />
                                    </div>
                                    <div className="md:col-span-3">
                                      <label className={labelClass}>Organizator</label>
                                      <OrganizerCombobox
                                        organizers={organizers}
                                        value={(editForm.organizer_id as string) || null}
                                        onChange={(organizerId) => {
                                          const organizer = organizers.find((item) => item.id === organizerId);
                                          setEditForm((current) => ({
                                            ...current,
                                            organizer_id: organizerId,
                                            organizer: organizer ? organizer.organizer_name : "",
                                          }));
                                        }}
                                        inputClassName={inputClass}
                                      />
                                    </div>
                                    <div className="md:col-span-6">
                                      <label className={labelClass}>Krótki opis</label>
                                      <textarea rows={2} className={inputClass} value={(editForm.description_short as string) || ""} onChange={(event) => setEditForm((current) => ({ ...current, description_short: event.target.value }))} />
                                    </div>
                                    <div className="md:col-span-6">
                                      <label className={labelClass}>Długi opis</label>
                                      <textarea rows={5} className={inputClass} value={(editForm.description_long as string) || ""} onChange={(event) => setEditForm((current) => ({ ...current, description_long: event.target.value }))} />
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Klasyfikacja</p>
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                                    <TaxonomyFields
                                      typeLevel1Options={typeLevel1Options}
                                      typeLevel2Options={typeLevel2Options}
                                      categoryLevel1Options={categoryLevel1Options}
                                      categoryLevel2Options={categoryLevel2Options}
                                      categoryLevel3Options={categoryLevel3Options}
                                      selectedTypeLevel1Id={typeof editForm.type_lvl_1_id === "string" ? editForm.type_lvl_1_id : null}
                                      selectedTypeLevel2Id={typeof editForm.type_lvl_2_id === "string" ? editForm.type_lvl_2_id : null}
                                      selectedCategoryLevel1={typeof editForm.category_lvl_1 === "string" ? editForm.category_lvl_1 : null}
                                      selectedCategoryLevel2={typeof editForm.category_lvl_2 === "string" ? editForm.category_lvl_2 : null}
                                      selectedCategoryLevel3={typeof editForm.category_lvl_3 === "string" ? editForm.category_lvl_3 : null}
                                      loading={taxonomyLoading}
                                      inputClass={inputClass}
                                      labelClass={labelClass}
                                      onTypeLevel1Change={(value) => setEditForm((current) => ({ ...current, type_lvl_1_id: value }))}
                                      onTypeLevel2Change={(value) => setEditForm((current) => ({ ...current, type_lvl_2_id: value }))}
                                      onCategoryLevel1Change={(value) => setEditForm((current) => ({ ...current, category_lvl_1: value, category_lvl_2: null, category_lvl_3: null }))}
                                      onCategoryLevel2Change={(value) => setEditForm((current) => ({ ...current, category_lvl_2: value, category_lvl_3: null }))}
                                      onCategoryLevel3Change={(value) => setEditForm((current) => ({ ...current, category_lvl_3: value }))}
                                    />
                                  </div>
                                </div>

                                <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Linki</p>
                                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                    <div className="md:col-span-3">
                                      <label className={labelClass}>URL źródła</label>
                                      <input className={inputClass} value={(editForm.source_url as string) || ""} onChange={(event) => setEditForm((current) => ({ ...current, source_url: event.target.value }))} placeholder="https://..." />
                                    </div>
                                    <div className="md:col-span-3">
                                      <label className={labelClass}>Facebook</label>
                                      <input className={inputClass} value={(editForm.facebook_url as string) || ""} onChange={(event) => setEditForm((current) => ({ ...current, facebook_url: event.target.value }))} placeholder="https://facebook.com/..." />
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Szczegóły zajęć</p>
                                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                    <div>
                                      <label className={labelClass}>Data od</label>
                                      <input type="date" className={inputClass} value={(editForm.date_start as string) || ""} onChange={(e) => setEditForm((c) => ({ ...c, date_start: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Data do</label>
                                      <input type="date" className={inputClass} value={(editForm.date_end as string) || ""} onChange={(e) => setEditForm((c) => ({ ...c, date_end: e.target.value || null }))} />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Godzina od</label>
                                      <input type="time" className={inputClass} value={(editForm.time_start as string) || ""} onChange={(e) => setEditForm((c) => ({ ...c, time_start: e.target.value || null }))} />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Godzina do</label>
                                      <input type="time" className={inputClass} value={(editForm.time_end as string) || ""} onChange={(e) => setEditForm((c) => ({ ...c, time_end: e.target.value || null }))} />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Wiek od</label>
                                      <input type="number" min={0} max={18} className={inputClass} value={editForm.age_min === null ? "" : String(editForm.age_min ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, age_min: event.target.value ? Number(event.target.value) : null }))} />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Wiek do</label>
                                      <input type="number" min={0} max={18} className={inputClass} value={editForm.age_max === null ? "" : String(editForm.age_max ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, age_max: event.target.value ? Number(event.target.value) : null }))} />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Cena od</label>
                                      <input type="number" min={0} className={inputClass} value={editForm.price_from === null ? "" : String(editForm.price_from ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, price_from: event.target.value ? Number(event.target.value) : null }))} />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Cena do</label>
                                      <input type="number" min={0} className={inputClass} value={editForm.price_to === null ? "" : String(editForm.price_to ?? "")} onChange={(event) => setEditForm((current) => ({ ...current, price_to: event.target.value ? Number(event.target.value) : null }))} />
                                    </div>
                                    <div className="md:col-span-4 flex items-center gap-4 pt-5">
                                      <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                                        <input type="checkbox" checked={Boolean(editForm.is_free)} onChange={(e) => setEditForm((c) => ({ ...c, is_free: e.target.checked }))} className="rounded border-border" />
                                        Bezpłatne
                                      </label>
                                    </div>
                                    <div className="md:col-span-6">
                                      <label className={labelClass}>Notatka</label>
                                      <textarea rows={4} className={inputClass} value={(editForm.note as string) || ""} onChange={(event) => setEditForm((current) => ({ ...current, note: event.target.value }))} placeholder="Dodatkowe informacje o zajęciach." />
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Feedback</p>
                                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                    <div className="md:col-span-3">
                                      <label className={labelClass}>Likes</label>
                                      <input type="number" min={0} className={inputClass} value={(editForm.likes as number) ?? 0} onChange={(e) => setEditForm((c) => ({ ...c, likes: Number(e.target.value) || 0 }))} />
                                    </div>
                                    <div className="md:col-span-3">
                                      <label className={labelClass}>Dislikes</label>
                                      <input type="number" min={0} className={inputClass} value={(editForm.dislikes as number) ?? 0} onChange={(e) => setEditForm((c) => ({ ...c, dislikes: Number(e.target.value) || 0 }))} />
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                  <div className="rounded-lg border border-border/50 p-3 space-y-3">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lokalizacja</p>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="col-span-2">
                                        <label className={labelClass}>Ulica</label>
                                        <div className="relative">
                                          <input
                                            className={inputClass}
                                            value={(editForm.street as string) || (editForm.venue_address as string) || ""}
                                            placeholder="np. ul. Skarbowa 2"
                                            onChange={(event) => setEditForm((current) => ({ ...current, street: event.target.value, venue_address: event.target.value, lat: null, lng: null }))}
                                            onBlur={geocodeAddress}
                                          />
                                          {geocoding && (
                                            <Loader2 size={12} className="animate-spin text-muted absolute right-2 top-1/2 -translate-y-1/2" />
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        <label className={labelClass}>Kod pocztowy</label>
                                        <input className={inputClass} value={(editForm.postcode as string) || ""} onChange={(event) => setEditForm((current) => ({ ...current, postcode: event.target.value }))} placeholder="np. 30-001" />
                                      </div>
                                      <div>
                                        <label className={labelClass}>Miasto</label>
                                        <input className={inputClass} value={(editForm.city as string) || "Kraków"} onChange={(event) => setEditForm((current) => ({ ...current, city: event.target.value }))} />
                                      </div>
                                      <div className="col-span-2">
                                        <label className={labelClass}>Współrzędne</label>
                                        <div className="flex items-center gap-2">
                                          <input type="number" step="any" className={inputClass} value={(editForm.lat as number) ?? ""} onChange={(e) => setEditForm((current) => ({ ...current, lat: e.target.value ? Number(e.target.value) : null }))} placeholder="Lat" />
                                          <input type="number" step="any" className={inputClass} value={(editForm.lng as number) ?? ""} onChange={(e) => setEditForm((current) => ({ ...current, lng: e.target.value ? Number(e.target.value) : null }))} placeholder="Lng" />
                                          <button onClick={geocodeAddress} disabled={geocoding} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground hover:border-primary/30 transition-colors shrink-0 disabled:opacity-50">
                                            {geocoding ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} />}
                                            {geocoding ? "Szukam..." : "Znajdź"}
                                          </button>
                                        </div>
                                      </div>
                                      <div className="col-span-2">
                                        <label className={labelClass}>Dzielnica</label>
                                        <select className={inputClass} value={(editForm.district as string) || "Inne"} onChange={(event) => setEditForm((current) => ({ ...current, district: event.target.value }))}>
                                          {DISTRICT_LIST.map((district) => (
                                            <option key={district} value={district}>{district}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                    {typeof editForm.lat === "number" && typeof editForm.lng === "number" && (
                                      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 180 }}>
                                        <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-accent/20 text-[11px] text-muted">Ładowanie mapy...</div>}>
                                          <MiniMapLazy lat={editForm.lat as number} lng={editForm.lng as number} />
                                        </Suspense>
                                      </div>
                                    )}
                                  </div>

                                  <ImageSection
                                    imageUrl={activity.image_url}
                                    imageCover={activity.image_cover}
                                    imageThumb={activity.image_thumb}
                                    pendingPreview={pendingPreview}
                                    onFileSelect={handleFileSelect}
                                    onClearPending={clearPendingFile}
                                    table="activities"
                                    itemId={activity.id}
                                    typeLvl1Id={String(editForm.type_lvl_1_id || activity.type_lvl_1_id || activity.type_id || "") || null}
                                    typeLvl2Id={String(editForm.type_lvl_2_id || activity.type_lvl_2_id || activity.subtype_id || "") || null}
                                    categoryLvl1={String(editForm.category_lvl_1 || activity.category_lvl_1 || activity.main_category || "")}
                                    categoryLvl2={String(editForm.category_lvl_2 || activity.category_lvl_2 || activity.category || "")}
                                    categoryLvl3={String(editForm.category_lvl_3 || activity.category_lvl_3 || activity.subcategory || "")}
                                    onRandomPhoto={(cover, thumb, setId) => setActivities((prev) => prev.map((a) => a.id === activity.id ? { ...a, image_cover: cover, image_thumb: thumb, image_set: setId ?? a.image_set } : a))}
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <button onClick={() => saveEdit(activity.id)} disabled={uploadingImage === activity.id} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors disabled:opacity-50">
                                    {uploadingImage === activity.id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                                    {uploadingImage === activity.id ? "Wgrywanie..." : "Zapisz"}
                                  </button>
                                  <button onClick={() => { clearPendingFile(); setEditing(null); setEditForm({}); }} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground transition-colors">
                                    <X size={11} /> Anuluj
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {pasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-[15px] font-bold text-foreground">Wklej dane</h2>
                <p className="text-[11px] text-muted mt-0.5">Wklej tabele z Excela, Google Sheets lub DataFrame</p>
              </div>
              <button onClick={() => { setPasteModal(false); setPasteText(""); setPastePreview([]); setPasteHeaders([]); }} className="p-1.5 rounded hover:bg-accent text-muted transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
              <textarea
                className="w-full h-40 px-3 py-2 rounded-lg border border-border text-[12px] font-mono bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                value={pasteText}
                onChange={(event) => {
                  setPasteText(event.target.value);
                  parsePastedData(event.target.value);
                }}
              />

              {pasteHeaders.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rozpoznane kolumny</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pasteHeaders.map((header) => {
                      const field = resolveField(header);
                      return (
                        <span key={header} className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", field ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                          {header} {field ? `-> ${field}` : "(pominieta)"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {pastePreview.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Podglad ({pastePreview.length} wierszy)</p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-accent/30">
                          {pasteHeaders.filter((header) => resolveField(header)).map((header) => (
                            <th key={header} className="px-2.5 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{resolveField(header)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pastePreview.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t border-border/50">
                            {pasteHeaders.filter((header) => resolveField(header)).map((header) => (
                              <td key={header} className="px-2.5 py-1.5 text-foreground max-w-[200px] truncate">{row[header] || <span className="text-muted/40">-</span>}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
              <p className="text-[11px] text-muted">Zajęcia zostana dodane jako Draft</p>
              <div className="flex items-center gap-2">
                {importing && <span className="text-[11px] text-muted">{importProgress.done}/{importProgress.total}</span>}
                <button onClick={() => { setPasteModal(false); setPasteText(""); setPastePreview([]); setPasteHeaders([]); }} className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:text-foreground transition-colors">
                  Anuluj
                </button>
                <button
                  onClick={runPasteImport}
                  disabled={importing || pastePreview.length === 0 || !pasteHeaders.some((header) => resolveField(header) === "title")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {importing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {importing ? "Importowanie..." : `Importuj ${pastePreview.length} zajęć`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}