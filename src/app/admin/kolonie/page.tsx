"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  ExternalLink,
  ImagePlus,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { CAMP_CATEGORY_LABELS, CAMP_MAIN_CATEGORY_ICONS, CAMP_MAIN_CATEGORY_LABELS, DISTRICT_LIST } from "@/lib/mock-data";
import { detectDistrictFromText } from "@/lib/districts";
import { cn, formatDateShort, formatPriceRange, thumbUrl, withCacheBust } from "@/lib/utils";
import type { Camp, Organizer } from "@/types/database";
import { ImageSection } from "@/components/admin/image-section";
import { OrganizerCombobox } from "@/components/admin/organizer-combobox";
import { TaxonomyFields } from "@/components/admin/taxonomy-fields";
import { ensureOrganizerId } from "@/lib/admin-organizers";
import { resolveCategoryLevel1Name, resolveCategoryLevel2Name, resolveCategoryLevel3Name, resolveTypeLevel1Id, resolveTypeLevel2Id } from "@/lib/admin-taxonomy";
import { useAdminTaxonomy } from "@/lib/use-admin-taxonomy";

const MiniMapLazy = lazy(() => import("../miejsca/mini-map").then((m) => ({ default: m.MiniMap })));

// ── Constants (outside component to avoid re-creation on every render) ─────

type DerivedCampStatus = Camp["status"] | "outdated";
type CampListFilter = "all" | "published" | "draft" | "outdated";
const UNCATEGORIZED_GROUP = "__uncategorized__";

const STATUS_ORDER: Record<DerivedCampStatus, number> = {
  draft: 0, published: 1, outdated: 2, cancelled: 3, deleted: 4,
};

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
const labelClass = "block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

const FIELD_ALIASES: Record<string, string[]> = {
  title:               ["title", "tytul", "tytuł", "nazwa", "nazwa turnusu", "nazwa_polkolonii"],
  description_short:   ["description_short", "krotki opis", "krótki opis", "tematyka", "temat", "program"],
  description_long:    ["description_long", "dlugi opis", "długi opis"],
  type_lvl_1:       ["type_lvl_1", "type_id", "type level 1", "typ poziom 1"],
  type_lvl_2:       ["type_lvl_2", "subtype_id", "type level 2", "typ poziom 2"],
  category_lvl_1:      ["category_lvl_1", "category_lvl_1_id", "main_category", "camp_type", "typ", "rodzaj", "typ_oferty", "type"],
  category_lvl_2:      ["category_lvl_2", "category_lvl_2_id", "category", "kategoria", "kategoria_obozu", "camp_subtype", "podtyp"],
  category_lvl_3:      ["category_lvl_3", "category_lvl_3_id", "subcategory", "podkategoria", "sub_category", "dyscyplina"],
  main_category:       ["main_category", "camp_type", "typ", "rodzaj", "typ_oferty", "type"],
  category:            ["category", "kategoria", "kategoria_obozu", "camp_subtype", "podtyp"],
  subcategory:         ["subcategory", "podkategoria", "sub_category", "dyscyplina"],
  date_start:          ["date_start", "termin_od", "data od", "od"],
  date_end:            ["date_end", "termin_do", "data do", "do"],
  duration_days:       ["duration_days", "dni", "liczba dni", "czas trwania"],
  age_min:             ["age_min", "wiek_od", "wiek od"],
  age_max:             ["age_max", "wiek_do", "wiek do"],
  price:               ["price", "cena", "cena_za_tydzien", "cena_za_tydzien (pln, jesli dostepna)", "cena_za_tydzien (PLN, jeśli dostępna)"],
  price_from:          ["price_from", "cena_od", "cena od"],
  price_to:            ["price_to", "cena_do", "cena do"],
  is_free:             ["is_free", "bezplatne", "bezpłatne", "darmowe"],
  meals_included:      ["meals_included", "wyzywienie", "wyzywienie (tak/nie/brak danych)", "jedzenie"],
  transport_included:  ["transport_included", "transport", "dojazd", "dowoz", "dowóz"],
  organizer:           ["organizer", "organizator"],
  organizer_id:        ["organizer_id", "organizator_id"],
  source_url:          ["source_url", "url", "link", "link_zrodlowy"],
  facebook_url:        ["facebook_url", "facebook", "fb", "facebook page"],
  venue_name:          ["venue_name", "miejsce", "nazwa miejsca"],
  venue_address:       ["venue_address", "adres", "address", "lokalizacja"],
  street:              ["street", "ulica"],
  postcode:            ["postcode", "kod", "kod pocztowy", "zip", "postal code"],
  city:                ["city", "miasto", "places"],
  district:            ["district", "dzielnica"],
  lat:                 ["lat", "latitude"],
  lng:                 ["lng", "lon", "longitude"],
  note:                ["note", "notatka", "uwagi", "dodatkowe informacje"],
  status:              ["status", "stan"],
  care_hours:          ["care_hours", "godziny_opieki", "godziny", "hours"],
  seats:               ["seats", "liczba_miejsc", "liczba_miejsc (jesli dostepna)", "liczba_miejsc (jeśli dostępna)", "miejsca"],
};

const CATEGORY_ALIASES: Record<string, Camp["category"]> = {
  sport: "sportowe", sportowa: "sportowe", sportowy: "sportowe", sportowe: "sportowe",
  edukacja: "edukacyjne", edukacyjna: "edukacyjne", edukacyjny: "edukacyjne", edukacyjne: "edukacyjne",
  integracja: "integracyjne", integracyjna: "integracyjne", integracyjny: "integracyjne", integracyjne: "integracyjne",
  przygoda: "przygodowe", przygodowa: "przygodowe", przygodowy: "przygodowe", przygodowe: "przygodowe",
  artystyczna: "artystyczne", artystyczny: "artystyczne", art: "artystyczne", sztuka: "artystyczne", artystyczne: "artystyczne",
  kulinarne: "kulinarne", kulinarna: "kulinarne", kulinaria: "kulinarne", kuchnia: "kulinarne", gotowanie: "kulinarne",
  przyrodnicze: "przyrodnicze", przyrodnicza: "przyrodnicze", przyrodniczy: "przyrodnicze", przyroda: "przyrodnicze", natura: "przyrodnicze",
};

function resolveField(header: string): string | null {
  const key = header.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === key)) return field;
  }
  return null;
}

function mapCampRow(row: Record<string, unknown>): Camp {
  const priceFrom = typeof row.price_from === "number" ? row.price_from : null;
  const priceSingle = typeof row.price === "number" ? row.price : null;
  const priceTo = typeof row.price_to === "number" ? row.price_to : null;
  const organizerData = row.organizer_data as Record<string, unknown> | null | undefined;
  const organizer = typeof organizerData?.organizer_name === "string" && organizerData.organizer_name.trim().length > 0
    ? organizerData.organizer_name
    : (typeof organizerData?.name === "string" && organizerData.name.trim().length > 0
      ? organizerData.name
      : String(row.organizer || ""));
  const street = typeof row.street === "string" ? row.street : "";
  const postcode = typeof row.postcode === "string" ? row.postcode : null;
  const city = typeof row.city === "string" && row.city.trim().length > 0 ? row.city : "Kraków";
  return {
    ...row,
    content_type: "camp",
    image_url: typeof row.image_cover === "string" && row.image_cover.trim().length > 0
      ? row.image_cover
      : (typeof row.image_url === "string" ? row.image_url : null),
    organizer,
    street,
    postcode,
    city,
    venue_address: [street, postcode, city].filter(Boolean).join(", ") || null,
    price_from: priceFrom ?? priceSingle ?? null,
    price_to: priceTo,
    price: priceFrom ?? priceSingle ?? null,
    is_free: Boolean(row.is_free) || priceFrom === 0 || priceTo === 0 || priceSingle === 0,
  } as Camp;
}

function asNumber(v?: string): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/,/g, ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function inferCategory(raw: string | undefined): Camp["category"] {
  if (!raw) return null;
  return CATEGORY_ALIASES[raw.toLowerCase().trim()] ?? null;
}

function inferMainCategory(mappedType: string | undefined, title: string): Camp["main_category"] {
  const t = (mappedType || "").toLowerCase();
  const n = title.toLowerCase();
  if (t.includes("warsztat") || n.includes("warsztat")) return "warsztaty_wakacyjne";
  if (t.includes("polkoloni") || n.includes("polkoloni")) return "polkolonie";
  if (t.includes("koloni") || t.includes("oboz") || n.includes("koloni") || n.includes("oboz")) return "kolonie";
  return "polkolonie";
}

function getCampGroupKey(camp: Partial<Camp> | Record<string, unknown>) {
  return typeof camp.category_lvl_1 === "string"
    ? camp.category_lvl_1
    : typeof camp.main_category === "string"
      ? camp.main_category
      : UNCATEGORIZED_GROUP;
}

function getCampGroupLabel(group: string) {
  if (group === UNCATEGORIZED_GROUP) return "Bez kategorii";
  return CAMP_MAIN_CATEGORY_LABELS[group as keyof typeof CAMP_MAIN_CATEGORY_LABELS] ?? group;
}

function getCampGroupIcon(group: string) {
  if (group === UNCATEGORIZED_GROUP) return "🏕️";
  return CAMP_MAIN_CATEGORY_ICONS[group as keyof typeof CAMP_MAIN_CATEGORY_ICONS] ?? "🏕️";
}

function sortCampGroupKeys(keys: string[]) {
  return [...keys].sort((left, right) => {
    if (left === UNCATEGORIZED_GROUP) return 1;
    if (right === UNCATEGORIZED_GROUP) return -1;
    return getCampGroupLabel(left).localeCompare(getCampGroupLabel(right), "pl");
  });
}

function inferSeason(dateStart?: string): Camp["season"] {
  if (!dateStart) return "caly_rok";
  const m = new Date(dateStart).getMonth() + 1;
  if ([6, 7, 8].includes(m)) return "lato";
  if ([12, 1, 2].includes(m)) return "zima";
  return "caly_rok";
}

function calcDurationDays(from?: string, to?: string): number {
  if (!from || !to) return 5;
  const diff = Math.round((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Number.isFinite(diff) && diff > 0 ? diff : 5;
}

function normalizeImportStatus(value?: string): Camp["status"] {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "published" || normalized === "opublikowany") return "published";
  if (normalized === "cancelled" || normalized === "anulowany") return "cancelled";
  if (normalized === "deleted" || normalized === "usuniety" || normalized === "usunięty") return "deleted";
  return "draft";
}

function detectDistrict(location: string): Camp["district"] {
  return detectDistrictFromText(location);
}

function splitAddress(venueAddress: string) {
  const parts = venueAddress.split(",").map((p) => p.trim()).filter(Boolean);
  return {
    street: parts.length >= 2 ? parts.slice(0, -1).join(", ") : parts[0] || "",
    city:   parts.length >= 2 ? parts[parts.length - 1] : "Kraków",
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AdminCampsPage() {
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options, loading: taxonomyLoading } = useAdminTaxonomy();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [collapsedOrganizers, setCollapsedOrganizers] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<CampListFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const [organizers, setOrganizers] = useState<Organizer[]>([]);

  const [pasteModal, setPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteHeaders, setPasteHeaders] = useState<string[]>([]);
  const [pastePreview, setPastePreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });

  const [promptPreview, setPromptPreview] = useState<{ title: string; campId: string; prompt: string } | null>(null);
  const [assigningImageId, setAssigningImageId] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchCamps = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/camps");
    const data = await res.json();
    if (Array.isArray(data)) setCamps(data.map((c: Record<string, unknown>) => mapCampRow(c)));
    setLoading(false);
  }, []);

  useEffect(() => { fetchCamps(); }, [fetchCamps]);

  useEffect(() => {
    fetch("/api/admin/organizers")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setOrganizers(data); });
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────

  const getEffectiveStatus = useCallback((camp: Camp): DerivedCampStatus => {
    const today = new Date().toISOString().slice(0, 10);
    const end = camp.date_end ? camp.date_end.slice(0, 10) : null;
    if (camp.status === "published" && end && end < today) return "outdated";
    return camp.status;
  }, []);

  const filteredCamps = useMemo(() => {
    const scoped = typeFilter ? camps.filter((c) => getCampGroupKey(c) === typeFilter) : camps;
    if (statusFilter === "all") return scoped;
    if (statusFilter === "draft") return scoped.filter((c) => { const s = getEffectiveStatus(c); return s === "draft" || s === "cancelled"; });
    return scoped.filter((c) => getEffectiveStatus(c) === statusFilter);
  }, [camps, typeFilter, statusFilter, getEffectiveStatus]);

  const allGroupKeys = useMemo(() => {
    const groups = new Set<string>();
    camps.forEach((camp) => groups.add(getCampGroupKey(camp)));
    return sortCampGroupKeys(Array.from(groups));
  }, [camps]);

  const groupedByType = useMemo(() => {
    return allGroupKeys.map((type) => {
      const typeItems = filteredCamps.filter((c) => getCampGroupKey(c) === type);
      const organizerGroups = new Map<string, { organizer: string; items: Camp[] }>();

      typeItems.forEach((camp) => {
        const organizer = (camp.organizer_data?.organizer_name ?? camp.organizer) || "Brak organizatora";
        const key = camp.organizer_id ? `id:${camp.organizer_id}` : organizer.toLowerCase();
        const existing = organizerGroups.get(key);
        if (existing) {
          existing.items.push(camp);
          return;
        }
        organizerGroups.set(key, { organizer, items: [camp] });
      });

      const byOrganizer = Array.from(organizerGroups.values())
        .sort((a, b) => a.organizer.localeCompare(b.organizer, "pl"))
        .map((group) => ({
          organizer: group.organizer,
          items: group.items.sort((a, b) => {
            const sd = STATUS_ORDER[getEffectiveStatus(a)] - STATUS_ORDER[getEffectiveStatus(b)];
            return sd !== 0 ? sd : a.title.localeCompare(b.title, "pl");
          }),
        }));
      return { type, byOrganizer };
    });
  }, [allGroupKeys, filteredCamps, getEffectiveStatus]);

  const publishedCount = useMemo(() => camps.filter((c) => getEffectiveStatus(c) === "published").length, [camps, getEffectiveStatus]);
  const draftCount    = useMemo(() => camps.filter((c) => { const s = getEffectiveStatus(c); return s === "draft" || s === "cancelled"; }).length, [camps, getEffectiveStatus]);
  const outdatedCount = useMemo(() => camps.filter((c) => getEffectiveStatus(c) === "outdated").length, [camps, getEffectiveStatus]);

  const sectionStats = useMemo(() => Object.fromEntries(
    allGroupKeys.map((type) => {
      const tc = camps.filter((c) => getCampGroupKey(c) === type);
      return [type, {
        all:      tc.length,
        published: tc.filter((c) => getEffectiveStatus(c) === "published").length,
        draft:    tc.filter((c) => { const s = getEffectiveStatus(c); return s === "draft" || s === "cancelled"; }).length,
        outdated: tc.filter((c) => getEffectiveStatus(c) === "outdated").length,
      }];
    })
  ), [allGroupKeys, camps, getEffectiveStatus]);

  const displayedTypeKeys = useMemo(
    () => groupedByType.filter(({ type }) => !typeFilter || type === typeFilter).map(({ type }) => type),
    [groupedByType, typeFilter]
  );
  const toggleOrganizer = (key: string) =>
    setCollapsedOrganizers((prev) => ({ ...prev, [key]: !prev[key] }));
  const hasExpandedCategories = useMemo(
    () => displayedTypeKeys.some((t) => !collapsedCategories[t]),
    [displayedTypeKeys, collapsedCategories]
  );

  // ── Filter / collapse helpers ──────────────────────────────────────────────

  const toggleCategory = (type: string) =>
    setCollapsedCategories((prev) => ({ ...prev, [type]: !prev[type] }));

  const toggleAllCategories = () => {
    if (displayedTypeKeys.length === 0) return;
    setCollapsedCategories(Object.fromEntries(displayedTypeKeys.map((t) => [t, hasExpandedCategories])));
  };

  const toggleStatusFilter = (filter: CampListFilter) => {
    const next = statusFilter === filter ? "all" : filter;
    setTypeFilter(null);
    setStatusFilter(next);
    setCollapsedCategories(Object.fromEntries(
      allGroupKeys.map((type) => [
        type,
        camps.filter((c) => {
          if (getCampGroupKey(c) !== type) return false;
          if (next === "all") return true;
          if (next === "draft") { const s = getEffectiveStatus(c); return s === "draft" || s === "cancelled"; }
          return getEffectiveStatus(c) === next;
        }).length === 0,
      ])
    ));
  };

  const toggleTypeStatusFilter = (type: string, filter: CampListFilter) => {
    if (typeFilter === type && statusFilter === filter) { setTypeFilter(null); setStatusFilter("all"); return; }
    setTypeFilter(type);
    setStatusFilter(filter);
    setCollapsedCategories((prev) => ({ ...prev, [type]: false }));
  };

  // ── Paste import ───────────────────────────────────────────────────────────

  const parsePastedData = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) { setPasteHeaders([]); setPastePreview([]); return; }

    // Remove literal newlines inside JSON/Python string values (e.g. URLs with trailing \n before closing quote)
    const fixLiteralNewlines = (s: string) => {
      let r = "", inStr = false, esc = false;
      for (const c of s) {
        if (esc) { r += c; esc = false; }
        else if (c === "\\" && inStr) { r += c; esc = true; }
        else if (c === '"') { inStr = !inStr; r += c; }
        else if (inStr && (c === "\n" || c === "\r")) { /* drop literal newlines inside strings */ }
        else r += c;
      }
      return r;
    };

    const structMatch = trimmed.match(/[\[{][\s\S]*[\]}]/);
    if (structMatch) {
      const raw = fixLiteralNewlines(structMatch[0]
        .replace(/#[^\n]*/g, "")
        .replace(/<NA>/g, "null")
        .replace(/\bNaN\b/g, "null"));

      const pythonToJson = (input: string) => {
        let out = ""; let inSingle = false; let escaped = false;
        for (const ch of input) {
          if (inSingle) {
            if (escaped) { out += ch; escaped = false; continue; }
            if (ch === "\\") { out += "\\\\"; escaped = true; continue; }
            if (ch === "'") { inSingle = false; out += '"'; continue; }
            if (ch === '"') { out += '\\"'; continue; }
            out += ch; continue;
          }
          if (ch === "'") { inSingle = true; out += '"'; continue; }
          out += ch;
        }
        return out;
      };

      for (const attempt of [raw, pythonToJson(raw)]) {
        try {
          const obj = JSON.parse(
            attempt.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bNone\b/g, "null")
          );
          if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
            const headers = [...new Set(obj.flatMap((o: Record<string, unknown>) => Object.keys(o)))];
            setPasteHeaders(headers);
            setPastePreview(obj.map((o: Record<string, unknown>) => {
              const row: Record<string, string> = {};
              headers.forEach((h) => { row[h] = o[h] != null ? String(o[h]) : ""; });
              return row;
            }));
            return;
          }
        } catch { /* try next */ }
      }
    }

    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) { setPasteHeaders([]); setPastePreview([]); return; }
    const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1)
      .map((line) => {
        const vals = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ""; });
        return row;
      })
      .filter((r) => Object.values(r).some(Boolean));
    setPasteHeaders(headers);
    setPastePreview(rows);
  };

  const runPasteImport = async () => {
    if (pastePreview.length === 0) return;
    setImporting(true);
    setImportProgress({ done: 0, total: pastePreview.length });
    const imported: Camp[] = [];
    const knownOrganizers = [...organizers];

    for (let i = 0; i < pastePreview.length; i++) {
      const row = pastePreview[i];
      const mapped: Record<string, string> = {};
      for (const header of pasteHeaders) {
        const field = resolveField(header);
        if (field) mapped[field] = row[header] || "";
      }

      if (!mapped.title) { setImportProgress({ done: i + 1, total: pastePreview.length }); continue; }

      const dateStart  = mapped.date_start || new Date().toISOString().slice(0, 10);
      const dateEnd    = mapped.date_end || dateStart;
      const priceFrom  = asNumber(mapped.price_from) ?? asNumber(mapped.price);
      const priceTo    = asNumber(mapped.price_to);
      const shortDesc  = mapped.description_short || "Opis oferty";
      const careHours  = mapped.care_hours ? `Godziny opieki: ${mapped.care_hours}.` : "";
      const seats      = mapped.seats ? `Liczba miejsc: ${mapped.seats}.` : "";
      const longDesc   = mapped.description_long || `${shortDesc}${careHours ? ` ${careHours}` : ""}${seats ? ` ${seats}` : ""}`.trim();
      const venueAddress = mapped.venue_address?.trim() || "";
      const splitLegacyAddress = venueAddress ? splitAddress(venueAddress) : { street: "", city: "Kraków" };
      const street = mapped.street?.trim() || splitLegacyAddress.street;
      const postcode = mapped.postcode?.trim() || null;
      const cityHint   = mapped.city?.trim() || splitLegacyAddress.city || "";
      const city = cityHint || "Kraków";
      const organizerName = mapped.organizer || (!isUUID(mapped.organizer_id || "") ? mapped.organizer_id || "" : "") || mapped.venue_name || "Organizator";
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
      const typeLevel1Id = resolveTypeLevel1Id(typeLevel1Options, mapped.type_lvl_1?.trim() || null);
      const typeLevel2Id = resolveTypeLevel2Id(typeLevel2Options, mapped.type_lvl_2?.trim() || null, typeLevel1Id);
      const categoryLevel1 = resolveCategoryLevel1Name(
        categoryLevel1Options,
        mapped.category_lvl_1?.trim() || inferMainCategory(mapped.main_category, mapped.title),
      );
      const categoryLevel2 = resolveCategoryLevel2Name(
        categoryLevel2Options,
        mapped.category_lvl_2?.trim() || inferCategory(mapped.category),
        categoryLevel1,
        categoryLevel1Options,
      );
      const categoryLevel3 = resolveCategoryLevel3Name(
        categoryLevel3Options,
        mapped.category_lvl_3?.trim() || mapped.subcategory?.trim() || null,
        categoryLevel2,
        categoryLevel2Options,
      );
      const district = mapped.district?.trim() ? detectDistrict(mapped.district) : detectDistrict([street, postcode, city].filter(Boolean).join(", "));
      const lat = asNumber(mapped.lat);
      const lng = asNumber(mapped.lng);
      const status = normalizeImportStatus(mapped.status);

      try {
        // Step 1 — create camp with core data
        const res = await fetch("/api/admin/camps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title:            mapped.title.trim(),
            description_short: shortDesc,
            description_long:  longDesc,
            type_lvl_1:     typeLevel1Id,
            type_lvl_2:     typeLevel2Id,
            date_start:        dateStart,
            date_end:          dateEnd,
            category_lvl_1:    categoryLevel1,
            category_lvl_2:    categoryLevel2,
            category_lvl_3:    categoryLevel3,
            season:            inferSeason(dateStart),
            duration_days:     asNumber(mapped.duration_days) || calcDurationDays(dateStart, dateEnd),
            meals_included:    ["tak", "true", "1"].includes((mapped.meals_included || "").toLowerCase()),
            transport_included: ["tak", "true", "1"].includes((mapped.transport_included || "").toLowerCase()),
            age_min:           asNumber(mapped.age_min),
            age_max:           asNumber(mapped.age_max),
            price_from:        priceFrom,
            price_to:          priceTo,
            is_free:           ["tak", "true", "1"].includes((mapped.is_free || "").toLowerCase()) || (priceFrom ?? priceTo ?? null) === 0,
            organizer_id:      organizerId,
            source_url:        mapped.source_url?.trim() || null,
            facebook_url:      mapped.facebook_url?.trim() || null,
            street,
            postcode,
            city,
            district,
            note:              mapped.note?.trim() || null,
          }),
        });
        const data = await res.json();
        if (!data?.id) { setImportProgress({ done: i + 1, total: pastePreview.length }); continue; }
        imported.push(mapCampRow(data));

        if (status !== "draft") {
          await fetch("/api/admin/camps", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.id, status }),
          });
          const idx = imported.findIndex((c) => c.id === data.id);
          if (idx !== -1) imported[idx] = { ...imported[idx], status };
        }

        // Step 2 — geocode and apply district + lat/lng
        if (lat !== null && lng !== null) {
          await fetch("/api/admin/camps", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: data.id, lat, lng, district }),
          });
          const idx = imported.findIndex((c) => c.id === data.id);
          if (idx !== -1) imported[idx] = { ...imported[idx], lat, lng, district };
        } else if (street) {
          try {
            if (i > 0) await new Promise((r) => setTimeout(r, 1100));
            const geoRes = await fetch("/api/admin/geocode", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ address: street, city }),
            });
            const geo = await geoRes.json();
            const geocodedDistrict = (geo.district || district) as Camp["district"];
            if (geo.lat && geo.lng) {
              await fetch("/api/admin/camps", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: data.id, lat: geo.lat, lng: geo.lng, district: geocodedDistrict }),
              });
              if (geo.postcode || geo.city) {
                await fetch("/api/admin/camps", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: data.id, ...(geo.postcode && !postcode ? { postcode: geo.postcode } : {}), ...(geo.city ? { city: geo.city } : {}) }),
                });
              }
              const idx = imported.findIndex((c) => c.id === data.id);
              if (idx !== -1) imported[idx] = {
                ...imported[idx],
                lat: geo.lat,
                lng: geo.lng,
                district: geocodedDistrict,
                ...(geo.postcode && !postcode ? { postcode: geo.postcode } : {}),
                ...(geo.city ? { city: geo.city } : {}),
              };
            } else if (geocodedDistrict && geocodedDistrict !== "Inne") {
              await fetch("/api/admin/camps", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: data.id, district: geocodedDistrict }),
              });
              const idx = imported.findIndex((c) => c.id === data.id);
              if (idx !== -1) imported[idx] = { ...imported[idx], district: geocodedDistrict };
            }
          } catch { /* geocoding is best-effort */ }
        }

        // Step 3 — pick a random photo from the category folder in Supabase storage
        const campMainCat = categoryLevel1;
        const campCategory = categoryLevel2;
        if (campMainCat) {
          try {
            const photoRes = await fetch("/api/admin/random-photo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: data.id,
                main_category: campMainCat,
                category: campCategory,
                subcategory: categoryLevel3,
              }),
            });
            const photo = await photoRes.json();
            if (photo.image_url) {
              const idx = imported.findIndex((c) => c.id === data.id);
              if (idx !== -1) imported[idx] = { ...imported[idx], image_url: photo.image_url };
            }
          } catch { /* photo assignment is best-effort */ }
        }
      } catch { /* skip row */ }

      setImportProgress({ done: i + 1, total: pastePreview.length });
    }

    setCamps((prev) => [...imported, ...prev]);
    setImporting(false);
    setPasteModal(false);
    setPasteText("");
    setPasteHeaders([]);
    setPastePreview([]);
    alert(`Zaimportowano ${imported.length} z ${pastePreview.length} kolonii`);
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const startEditing = (camp: Camp) => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setEditing(camp.id);
    const legacyAddress = splitAddress(camp.venue_address || "");
    const street = typeof camp.street === "string" && camp.street.trim().length > 0 ? camp.street : legacyAddress.street;
    const city = typeof camp.city === "string" && camp.city.trim().length > 0 ? camp.city : legacyAddress.city;
    const row = camp as unknown as Record<string, unknown>;
    setEditForm({
      title:              camp.title,
      description_short:  camp.description_short,
      description_long:   camp.description_long,
      type_lvl_1:      camp.type_lvl_1 ?? camp.type_id ?? null,
      type_lvl_2:      camp.type_lvl_2 ?? camp.subtype_id ?? null,
      category_lvl_1:     camp.category_lvl_1 ?? camp.main_category,
      category_lvl_2:     camp.category_lvl_2 ?? camp.category ?? null,
      category_lvl_3:     camp.category_lvl_3 ?? camp.subcategory ?? null,
      season:             camp.season,
      date_start:         camp.date_start,
      date_end:           camp.date_end,
      duration_days:      camp.duration_days,
      age_min:            camp.age_min,
      age_max:            camp.age_max,
      price_from:         row.price_from ?? camp.price_from ?? camp.price,
      price_to:           row.price_to ?? camp.price_to ?? null,
      organizer:          camp.organizer,
      organizer_id:       camp.organizer_id ?? null,
      source_url:         camp.source_url,
      facebook_url:       camp.facebook_url ?? "",
      venue_name:         camp.venue_name,
      venue_address:      camp.venue_address,
      street,
      postcode:           camp.postcode ?? "",
      city,
      district:           camp.district,
      lat:                camp.lat ?? null,
      lng:                camp.lng ?? null,
      note:               camp.note ?? "",
      is_free:            camp.is_free,
      is_featured:        camp.is_featured,
      meals_included:     camp.meals_included,
      transport_included: camp.transport_included,
      status:             camp.status,
    });
  };

  const saveEdit = async (id: string) => {
    let newImageCover: string | null = null;

    if (pendingFile) {
      setUploadingImage(id);
      try {
        const formData = new FormData();
        formData.append("file", pendingFile);
        formData.append("id", id);
        formData.append("target", "camps");
        const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
        const data = await res.json();
        if (data.image_cover) {
          newImageCover = `${String(data.image_cover).split("?")[0]}?t=${Date.now()}`;
        } else {
          alert(`Błąd obrazka: ${data.error || "Nie udało się"}`);
        }
      } catch {
        alert("Błąd połączenia przy wgrywaniu obrazka");
      }
      setUploadingImage(null);
    }

    const dateStart = String(editForm.date_start || "");
    const dateEnd   = String(editForm.date_end || "");
    const organizerName = editForm.organizer_id && !isUUID(String(editForm.organizer_id))
      ? String(editForm.organizer_id)
      : (editForm.organizer ? String(editForm.organizer) : null);
    const organizerId = await ensureOrganizerId({
      organizers,
      organizerId: editForm.organizer_id && isUUID(String(editForm.organizer_id)) ? String(editForm.organizer_id) : null,
      organizerName,
      city: editForm.city ? String(editForm.city) : "Kraków",
      onOrganizerCreated: (organizer) => {
        setOrganizers((current) => current.some((entry) => entry.id === organizer.id) ? current : [...current, organizer]);
      },
    });

    const updates: Record<string, unknown> = {
      title:              String(editForm.title || ""),
      description_short:  String(editForm.description_short || ""),
      description_long:   String(editForm.description_long || ""),
      type_lvl_1:      editForm.type_lvl_1 ? String(editForm.type_lvl_1) : null,
      type_lvl_2:      editForm.type_lvl_2 ? String(editForm.type_lvl_2) : null,
      category_lvl_1:     editForm.category_lvl_1,
      category_lvl_2:     editForm.category_lvl_2 ?? null,
      category_lvl_3:     editForm.category_lvl_3 ?? null,
      season:             editForm.season,
      date_start:         dateStart,
      date_end:           dateEnd,
      duration_days:      Number(editForm.duration_days) || calcDurationDays(dateStart, dateEnd),
      age_min:            editForm.age_min == null || editForm.age_min === "" ? null : Number(editForm.age_min),
      age_max:            editForm.age_max == null || editForm.age_max === "" ? null : Number(editForm.age_max),
      price_from:         Boolean(editForm.is_free) ? 0 : (editForm.price_from == null || editForm.price_from === "" ? null : Number(editForm.price_from)),
      price_to:           Boolean(editForm.is_free) ? 0 : (editForm.price_to == null || editForm.price_to === "" ? null : Number(editForm.price_to)),
      organizer_id:       organizerId,
      source_url:         editForm.source_url ? String(editForm.source_url) : null,
      facebook_url:       editForm.facebook_url ? String(editForm.facebook_url) : null,
      street:             String(editForm.street || "").trim(),
      postcode:           editForm.postcode ? String(editForm.postcode).trim() : null,
      city:               String(editForm.city || "Kraków").trim() || "Kraków",
      district:           editForm.district,
      note:               editForm.note ? String(editForm.note) : null,
      meals_included:     Boolean(editForm.meals_included),
      transport_included: Boolean(editForm.transport_included),
      status:             editForm.status,
    };
    if (newImageCover) {
      updates.image_cover = newImageCover;
      updates.image_set = null;
    }

    const res = await fetch("/api/admin/camps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) { alert(`Błąd zapisu: ${data.error || "Nieznany błąd"}`); return; }

    // Persist geocoded coords
    if (typeof editForm.lat === "number" && typeof editForm.lng === "number") {
      fetch("/api/admin/camps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, lat: editForm.lat, lng: editForm.lng, district: editForm.district }),
      }).catch(() => {});
    }

    if (data.updated) {
      setCamps((prev) => prev.map((c) =>
        c.id === id
          ? {
              ...mapCampRow(data.updated as Record<string, unknown>),
              image_cover: withCacheBust(typeof data.updated.image_cover === "string" ? data.updated.image_cover : null),
              image_thumb: withCacheBust(typeof data.updated.image_thumb === "string" ? data.updated.image_thumb : null),
              lat: (editForm.lat as number) ?? c.lat,
              lng: (editForm.lng as number) ?? c.lng,
            }
          : c
      ));
    }
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setEditing(null);
    setEditForm({});
  };

  const createCamp = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch("/api/admin/camps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:              "Nowa kolonia",
        description_short:  "Opis oferty",
        description_long:   "",
        date_start:         today,
        date_end:           today,
        main_category:      "polkolonie",
        season:             "lato",
        duration_days:      5,
        meals_included:     false,
        transport_included: false,
        age_min:            null,
        age_max:            null,
        price_from:         null,
        price_to:           null,
        district:           "Inne",
        street:             "",
        postcode:           null,
        city:               "Kraków",
        note:               null,
        organizer_id:       null,
        source_url:         null,
        facebook_url:       null,
      }),
    });
    const data = await res.json();
    if (data?.id) {
      const newCamp = mapCampRow(data);
      setCamps((prev) => [newCamp, ...prev]);
      startEditing(newCamp);
    } else {
      alert(`Błąd: ${data.error || "Nie udało się utworzyć kolonii"}`);
    }
  };

  const toggleStatus = async (camp: Camp) => {
    const newStatus = camp.status === "published" ? "draft" : "published";
    const res = await fetch("/api/admin/camps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: camp.id, status: newStatus }),
    });
    if (res.ok) setCamps((prev) => prev.map((c) => (c.id === camp.id ? { ...c, status: newStatus } : c)));
  };

  const toggleFeatured = async (camp: Camp) => {
    const next = !camp.is_featured;
    const res = await fetch("/api/admin/camps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: camp.id, is_featured: next }),
    });
    const data = await res.json();
    if (!res.ok) { alert(`Błąd: ${data.error || "Nie udało się"}`); return; }
    setCamps((prev) => prev.map((c) => (c.id === camp.id ? { ...c, is_featured: next } : c)));
  };

  const getCampExternalId = (camp: Camp) => {
    const raw = (camp as unknown as Record<string, unknown>).camp_id;
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "";
  };

  const getCampImagePrompt = (camp: Camp) => {
    const raw = (camp as unknown as Record<string, unknown>).image_prompt;
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "";
  };

  const assignImageForCamp = async (camp: Camp) => {
    const campId = getCampExternalId(camp);
    if (!campId) {
      alert("Brak camp_id. Najpierw wygeneruj przez Upload data.");
      return;
    }
    setAssigningImageId(camp.id);
    try {
      const res = await fetch("/api/admin/assign-image-by-event-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: camp.id, event_id: campId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(`Błąd: ${data.error || "Nie udało się przypisać obrazu"}`);
        return;
      }
      setCamps((prev) => prev.map((c) =>
        c.id === camp.id ? { ...c, image_url: data.image_url, image_cover: data.image_cover, image_thumb: data.image_thumb } : c,
      ));
    } catch (error) {
      alert(`Błąd: ${error instanceof Error ? error.message : "Nie udało się przypisać obrazu"}`);
    } finally {
      setAssigningImageId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno chcesz usunąć?")) return;
    await fetch("/api/admin/camps", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCamps((prev) => prev.filter((c) => c.id !== id));
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
    const street = String(editForm.street || "").trim();
    const city   = String(editForm.city || "Kraków").trim() || "Kraków";
    if (!street) return;
    setGeocoding(true);
    try {
      const res  = await fetch("/api/admin/geocode", {
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
          ...(data.postcode ? { postcode: data.postcode } : {}),
          ...(data.district ? { district: data.district } : {}),
        }));
      }
    } catch { /* silent */ }
    setGeocoding(false);
  };

  const updateField = (key: string, value: unknown) =>
    setEditForm((prev) => ({ ...prev, [key]: value }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Kolonie</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setPasteModal(true)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <ClipboardPaste size={14} /> Wklej dane
          </button>
          <button onClick={createCamp} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-foreground rounded-xl hover:bg-stone-700 transition-colors">
            <Plus size={14} /> Dodaj
          </button>
          <button onClick={fetchCamps} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => toggleStatusFilter("all")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>{camps.length} kolonii</button>
        <button onClick={() => toggleStatusFilter("published")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>{publishedCount} published</button>
        <button onClick={() => toggleStatusFilter("draft")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", draftCount > 0 ? (statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200") : (statusFilter === "draft" ? "bg-stone-300 text-stone-700" : "bg-stone-200 text-stone-500 hover:bg-stone-300"))}>{draftCount} draft</button>
        <button onClick={() => toggleStatusFilter("outdated")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "outdated" ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-700 hover:bg-amber-200")}>{outdatedCount} outdated</button>
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
          {groupedByType.filter(({ type }) => !typeFilter || type === typeFilter).map(({ type, byOrganizer }) => {
            const expanded = !collapsedCategories[type];
            const stats = sectionStats[type] ?? { all: 0, published: 0, draft: 0, outdated: 0 };
            const allItems = byOrganizer.flatMap((g) => g.items);
            return (
              <div key={type}>
                <div className="w-full flex items-center gap-2 mb-2 rounded-md px-1.5 py-1 hover:bg-accent/50 transition-colors">
                  <button type="button" onClick={() => toggleCategory(type)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground rotate-180" />}
                    <span className="text-lg">{getCampGroupIcon(type)}</span>
                    <h2 className="text-[13px] font-semibold text-foreground">{getCampGroupLabel(type)}</h2>
                  </button>
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "all")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>{stats.all} all</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "published")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>{stats.published} published</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "draft")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", stats.draft > 0 ? (typeFilter === type && statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200") : (typeFilter === type && statusFilter === "draft" ? "bg-stone-300 text-stone-700" : "bg-stone-200 text-stone-500 hover:bg-stone-300"))}>{stats.draft} draft</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "outdated")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "outdated" ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-700 hover:bg-amber-200")}>{stats.outdated} outdated</button>
                  </div>
                </div>

                {expanded && (
                  allItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 bg-white px-3 py-4 text-[12px] text-muted">
                      Brak rekordów dla tego filtra.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {byOrganizer.filter((g) => g.items.length > 0).map(({ organizer, items }) => {
                        const orgKey = `${type}::${organizer}`;
                        const orgExpanded = !collapsedOrganizers[orgKey];
                        return (
                          <div key={orgKey}>
                            <button
                              type="button"
                              onClick={() => toggleOrganizer(orgKey)}
                              className="flex items-center gap-1.5 w-full text-left px-1.5 py-0.5 rounded hover:bg-accent/40 transition-colors mb-1"
                            >
                              {orgExpanded ? <ChevronDown size={12} className="text-muted-foreground shrink-0" /> : <ChevronUp size={12} className="text-muted-foreground shrink-0 rotate-180" />}
                              <span className="text-[11px] font-semibold text-muted-foreground truncate">{organizer}</span>
                              <span className="ml-auto text-[10px] text-muted shrink-0">{items.length}</span>
                            </button>
                            {orgExpanded && (
                              <div className="space-y-1.5 pl-3 border-l border-border/40 ml-1.5">
                                {items.map((camp, index) => {
                        const isEditing = editing === camp.id;
                        const effectiveStatus = getEffectiveStatus(camp);
                        const isDraft = effectiveStatus !== "published";
                        const externalUrl = camp.source_url || camp.facebook_url;
                        return (
                          <div key={camp.id} className={cn("rounded-lg border border-border/70", isDraft ? "bg-stone-100 opacity-70" : "bg-white")}>
                            <div className="flex items-center gap-2.5 px-3 py-2.5">
                              <span className="shrink-0 w-6 text-center text-[11px] font-mono text-muted-foreground">{index + 1}</span>
                              <span className="shrink-0 text-lg">{getCampGroupIcon(getCampGroupKey(camp))}</span>

                              {thumbUrl(camp.image_thumb, camp.image_url) ? (
                                <img src={thumbUrl(camp.image_thumb, camp.image_url) || ""} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                              ) : (
                                <span className="w-8 h-8 rounded bg-stone-100 shrink-0 flex items-center justify-center text-[10px] text-stone-400">—</span>
                              )}

                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-foreground truncate">{camp.title}</p>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5 flex-wrap">
                                  {camp.organizer && <><span className="truncate max-w-[140px]">{camp.organizer}</span><span className="opacity-40">·</span></>}
                                  <span>{formatDateShort(camp.date_start)}{camp.date_end ? ` – ${formatDateShort(camp.date_end)}` : ""}</span>
                                  <span className="opacity-40">·</span>
                                  <span>{formatPriceRange(camp.price_from, camp.price_to, camp.is_free)}</span>
                                  {(camp.street || camp.city) && <><span className="opacity-40">·</span><span className="truncate max-w-[160px]">{[camp.street, camp.postcode, camp.city].filter(Boolean).join(", ")}</span></>}
                                </div>
                                {getCampExternalId(camp) && (
                                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">CAMP ID: {getCampExternalId(camp)}</p>
                                )}
                              </div>

                              <button onClick={() => startEditing(camp)} className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Edytuj"><Pencil size={13} /></button>
                              {externalUrl && (
                                <a href={externalUrl} target="_blank" rel="noopener" className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Źródło">
                                  <ExternalLink size={13} />
                                </a>
                              )}
                              {effectiveStatus === "outdated" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700">Outdated</span>
                              ) : (
                                <button onClick={() => toggleStatus(camp)} className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors",
                                  camp.status === "published" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                )}>
                                  {camp.status === "published" ? "Published" : camp.status === "cancelled" ? "Cancelled" : "Draft"}
                                </button>
                              )}
                              {getCampImagePrompt(camp) && (
                                <button onClick={() => setPromptPreview({ campId: camp.id, title: camp.title, prompt: getCampImagePrompt(camp) })} className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Pokaż image prompt">
                                  <Sparkles size={13} />
                                </button>
                              )}
                              <button onClick={() => assignImageForCamp(camp)} className="p-1 rounded hover:bg-accent text-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Przypisz obraz" disabled={assigningImageId === camp.id}>
                                {assigningImageId === camp.id ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                              </button>
                              <button onClick={() => handleDelete(camp.id)} className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Usuń">
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {isEditing && (
                              <div className="px-3 pb-3 pt-2 border-t border-border/50">
                                <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Opis oferty</p>
                                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                    <div className="md:col-span-3">
                                      <label className={labelClass}>Tytuł</label>
                                      <input className={inputClass} value={(editForm.title as string) || ""} onChange={(e) => updateField("title", e.target.value)} />
                                    </div>
                                    <div className="md:col-span-3">
                                      <label className={labelClass}>Organizator</label>
                                      <OrganizerCombobox
                                        organizers={organizers}
                                        value={(editForm.organizer_id as string) || null}
                                        onChange={(organizerId) => {
                                          const organizer = organizers.find((item) => item.id === organizerId);
                                          updateField("organizer_id", organizerId);
                                          updateField("organizer", organizer ? organizer.organizer_name : (organizerId || ""));
                                        }}
                                        inputClassName={inputClass}
                                      />
                                    </div>
                                    <div className="md:col-span-6">
                                      <label className={labelClass}>Krótki opis</label>
                                      <textarea rows={2} className={inputClass} value={(editForm.description_short as string) || ""} onChange={(e) => updateField("description_short", e.target.value)} />
                                    </div>
                                    <div className="md:col-span-6">
                                      <label className={labelClass}>Długi opis</label>
                                      <textarea rows={5} className={inputClass} value={(editForm.description_long as string) || ""} onChange={(e) => updateField("description_long", e.target.value)} />
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
                                      selectedTypeLevel1Id={typeof editForm.type_lvl_1 === "string" ? editForm.type_lvl_1 : null}
                                      selectedTypeLevel2Id={typeof editForm.type_lvl_2 === "string" ? editForm.type_lvl_2 : null}
                                      selectedCategoryLevel1={typeof editForm.category_lvl_1 === "string" ? editForm.category_lvl_1 : null}
                                      selectedCategoryLevel2={typeof editForm.category_lvl_2 === "string" ? editForm.category_lvl_2 : null}
                                      selectedCategoryLevel3={typeof editForm.category_lvl_3 === "string" ? editForm.category_lvl_3 : null}
                                      loading={taxonomyLoading}
                                      inputClass={inputClass}
                                      labelClass={labelClass}
                                      onTypeLevel1Change={(value) => updateField("type_lvl_1", value)}
                                      onTypeLevel2Change={(value) => updateField("type_lvl_2", value)}
                                      onCategoryLevel1Change={(value) => updateField("category_lvl_1", value)}
                                      onCategoryLevel2Change={(value) => updateField("category_lvl_2", value)}
                                      onCategoryLevel3Change={(value) => updateField("category_lvl_3", value)}
                                    />
                                  </div>
                                </div>

                                <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Linki</p>
                                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                    <div className="md:col-span-3">
                                      <label className={labelClass}>URL źródła</label>
                                      <input className={inputClass} value={(editForm.source_url as string) || ""} onChange={(e) => updateField("source_url", e.target.value)} placeholder="https://..." />
                                    </div>
                                    <div className="md:col-span-3">
                                      <label className={labelClass}>Facebook</label>
                                      <input className={inputClass} value={(editForm.facebook_url as string) || ""} onChange={(e) => updateField("facebook_url", e.target.value)} placeholder="https://facebook.com/..." />
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Szczegóły oferty</p>
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                      <div>
                                        <label className={labelClass}>Data od</label>
                                        <input type="date" className={inputClass} value={(editForm.date_start as string) || ""} onChange={(e) => updateField("date_start", e.target.value)} />
                                      </div>
                                      <div>
                                        <label className={labelClass}>Data do</label>
                                        <input type="date" className={inputClass} value={(editForm.date_end as string) || ""} onChange={(e) => updateField("date_end", e.target.value || null)} />
                                      </div>
                                      <div>
                                        <label className={labelClass}>Wiek od</label>
                                        <input type="number" min={0} max={18} className={inputClass} value={editForm.age_min == null ? "" : String(editForm.age_min)} onChange={(e) => updateField("age_min", e.target.value ? Number(e.target.value) : null)} />
                                      </div>
                                      <div>
                                        <label className={labelClass}>Wiek do</label>
                                        <input type="number" min={0} max={18} className={inputClass} value={editForm.age_max == null ? "" : String(editForm.age_max)} onChange={(e) => updateField("age_max", e.target.value ? Number(e.target.value) : null)} />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                      <div>
                                        <label className={labelClass}>Cena od (zł)</label>
                                        <input type="number" min={0} className={inputClass} value={editForm.price_from == null ? "" : String(editForm.price_from)} onChange={(e) => updateField("price_from", e.target.value ? Number(e.target.value) : null)} />
                                      </div>
                                      <div>
                                        <label className={labelClass}>Cena do (zł)</label>
                                        <input type="number" min={0} className={inputClass} value={editForm.price_to == null ? "" : String(editForm.price_to)} onChange={(e) => updateField("price_to", e.target.value ? Number(e.target.value) : null)} />
                                      </div>
                                      <div className="md:col-span-2 flex items-center gap-4 pb-2">
                                        <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                                          <input type="checkbox" checked={Boolean(editForm.meals_included)} onChange={(e) => updateField("meals_included", e.target.checked)} className="rounded border-border" />
                                          Wyżywienie
                                        </label>
                                        <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                                          <input type="checkbox" checked={Boolean(editForm.transport_included)} onChange={(e) => updateField("transport_included", e.target.checked)} className="rounded border-border" />
                                          Transport
                                        </label>
                                      </div>
                                    </div>
                                    <div className="md:col-span-6">
                                      <label className={labelClass}>Notatka</label>
                                      <textarea rows={4} className={inputClass} value={(editForm.note as string) || ""} onChange={(e) => updateField("note", e.target.value)} placeholder="Dodatkowe informacje o ofercie." />
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                  <div className="rounded-lg border border-border/50 p-3 space-y-2">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lokalizacja</p>
                                    <div>
                                      <label className={labelClass}>Ulica</label>
                                      <div className="relative">
                                        <input
                                          className={inputClass}
                                          value={(editForm.street as string) || ""}
                                          placeholder="np. ul. Skarbowa 2"
                                          onChange={(e) => { updateField("street", e.target.value); updateField("lat", null); updateField("lng", null); }}
                                          onBlur={geocodeAddress}
                                        />
                                        {geocoding && <Loader2 size={12} className="animate-spin text-muted absolute right-2 top-1/2 -translate-y-1/2" />}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className={labelClass}>Kod pocztowy</label>
                                        <input className={inputClass} value={(editForm.postcode as string) || ""} onChange={(e) => updateField("postcode", e.target.value)} placeholder="np. 30-001" />
                                      </div>
                                      <div>
                                        <label className={labelClass}>Miasto</label>
                                        <input className={inputClass} value={(editForm.city as string) || "Kraków"} onChange={(e) => updateField("city", e.target.value)} />
                                      </div>
                                      <div>
                                        <label className={labelClass}>Dzielnica</label>
                                        <select className={inputClass} value={(editForm.district as string) || "Inne"} onChange={(e) => updateField("district", e.target.value)}>
                                          {DISTRICT_LIST.map((d) => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                    <div>
                                      <label className={labelClass}>Współrzędne</label>
                                      <div className="flex items-center gap-2">
                                        <input type="number" step="any" className={inputClass} value={(editForm.lat as number) ?? ""} onChange={(e) => updateField("lat", e.target.value ? Number(e.target.value) : null)} placeholder="Lat" />
                                        <input type="number" step="any" className={inputClass} value={(editForm.lng as number) ?? ""} onChange={(e) => updateField("lng", e.target.value ? Number(e.target.value) : null)} placeholder="Lng" />
                                        <button onClick={geocodeAddress} disabled={geocoding} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground hover:border-primary/30 transition-colors shrink-0 disabled:opacity-50">
                                          {geocoding ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} />}
                                          {geocoding ? "Szukam..." : "Znajdź"}
                                        </button>
                                      </div>
                                    </div>
                                    {typeof editForm.lat === "number" && typeof editForm.lng === "number" && (
                                      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 160 }}>
                                        <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-accent/20 text-[11px] text-muted">Ładowanie mapy...</div>}>
                                          <MiniMapLazy lat={editForm.lat as number} lng={editForm.lng as number} />
                                        </Suspense>
                                      </div>
                                    )}
                                  </div>

                                  <ImageSection
                                    imageUrl={camp.image_url}
                                    imageCover={camp.image_cover}
                                    imageThumb={camp.image_thumb}
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <button onClick={() => saveEdit(camp.id)} disabled={uploadingImage === camp.id} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors disabled:opacity-50">
                                    {uploadingImage === camp.id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                                    {uploadingImage === camp.id ? "Wgrywanie..." : "Zapisz"}
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
                <p className="text-[11px] text-muted mt-0.5">Wklej tabelę z Excela, Google Sheets lub dane JSON/DataFrame</p>
              </div>
              <button onClick={() => { setPasteModal(false); setPasteText(""); setPasteHeaders([]); setPastePreview([]); }} className="p-1.5 rounded hover:bg-accent text-muted transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
              <textarea
                className="w-full h-40 px-3 py-2 rounded-lg border border-border text-[12px] font-mono bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); parsePastedData(e.target.value); }}
              />
              {pasteHeaders.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rozpoznane kolumny</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pasteHeaders.map((h) => {
                      const field = resolveField(h);
                      return (
                        <span key={h} className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", field ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                          {h}{field ? ` -> ${field}` : " (pominięta)"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {pastePreview.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Podgląd ({pastePreview.length} wierszy)</p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-accent/30">
                          {pasteHeaders.filter((h) => resolveField(h)).map((h) => (
                            <th key={h} className="px-2.5 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{resolveField(h)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pastePreview.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-border/50">
                            {pasteHeaders.filter((h) => resolveField(h)).map((h) => (
                              <td key={h} className="px-2.5 py-1.5 text-foreground max-w-[220px] truncate">{row[h] || <span className="text-muted/40">—</span>}</td>
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
              <p className="text-[11px] text-muted">Kolonie zostaną dodane jako Draft.</p>
              <div className="flex items-center gap-2">
                {importing && <span className="text-[11px] text-muted">{importProgress.done}/{importProgress.total} — tworzenie + geokodowanie + zdjęcia...</span>}
                <button onClick={() => { setPasteModal(false); setPasteText(""); setPasteHeaders([]); setPastePreview([]); }} className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:text-foreground transition-colors">Anuluj</button>
                <button
                  onClick={runPasteImport}
                  disabled={importing || pastePreview.length === 0 || !pasteHeaders.some((h) => resolveField(h) === "title")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {importing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {importing ? "Importowanie..." : `Importuj ${pastePreview.length} kolonii`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {promptPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-[13px] text-foreground">Image Prompt</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(promptPreview.prompt)}
                  className="p-1.5 rounded hover:bg-accent text-muted transition-colors text-[12px] font-medium"
                >
                  Kopiuj prompt
                </button>
                <button onClick={() => setPromptPreview(null)} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-[12px] text-muted-foreground">{promptPreview.campId} — {promptPreview.title}</p>
              <p className="text-[12px] text-foreground mt-3 whitespace-pre-wrap">{promptPreview.prompt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
