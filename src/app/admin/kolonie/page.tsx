"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  MapPin,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { CAMP_CATEGORY_LABELS, CAMP_MAIN_CATEGORY_ICONS, CAMP_MAIN_CATEGORY_LABELS, DISTRICT_LIST } from "@/lib/mock-data";
import { cn, formatDateShort, formatPriceRange, thumbUrl, withCacheBust } from "@/lib/utils";
import type { Camp, Organizer } from "@/types/database";
import { ImageSection } from "@/components/admin/image-section";
import { OrganizerCombobox } from "@/components/admin/organizer-combobox";
import { TaxonomyFields } from "@/components/admin/taxonomy-fields";
import { ensureOrganizerId } from "@/lib/admin-organizers";
import { resolveCategoryLevel1Name, resolveCategoryLevel2Name, resolveCategoryLevel3Name, resolveTypeLevel1Id, resolveTypeLevel2Id } from "@/lib/admin-taxonomy";
import { useAdminTaxonomy } from "@/lib/use-admin-taxonomy";
import { PROMPTS } from "@/lib/prompts";

const MiniMapLazy = lazy(() => import("../miejsca/mini-map").then((m) => ({ default: m.MiniMap })));

// ── Constants (outside component to avoid re-creation on every render) ─────

type DerivedCampStatus = Camp["status"] | "outdated";
type CampListFilter = "all" | "published" | "draft" | "outdated";
type PromptUrlStatus = "in-progress" | "completed";
type UrlTrackingRow = {
  id: string;
  url: string;
  typ: "miejsce" | "kolonie" | "wydarzenia" | "zajecia";
  is_done: boolean;
  last_checked_at: string | null;
};
const UNCATEGORIZED_GROUP = "__uncategorized__";

function withShuffleOrder<T extends Record<string, unknown>>(items: T[]): (T & { __shuffleOrder: number })[] {
  return items.map((item) => ({ ...item, __shuffleOrder: Math.random() }));
}

function getShuffleOrder(item: Record<string, unknown>): number {
  const value = item.__shuffleOrder;
  return typeof value === "number" ? value : Number.MAX_SAFE_INTEGER;
}

const STATUS_ORDER: Record<DerivedCampStatus, number> = {
  draft: 0, published: 1, outdated: 2, cancelled: 3, deleted: 4,
};

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
const labelClass = "block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1";
const PROMPT_URL_LIST = [
  "https://disport.fun/index.php/polkolonie-krakow/",
  "https://cmjordan.krakow.pl/2026/04/P%C3%93%C5%81KOLONIE-LETNIE-2026",
  "https://www.osrodekwkorzkwi.pl/oferta/wakacje",
  "https://jump4fun.pl/",
  "https://www.hornkrakow.pl/dzieci-i-mlodziez/polkolonie-z-hornem/",
  "https://www.kraul.pl/wyjazdy-i-obozy/lato/aktywna-polkolonia-krakow/",
  "https://teamsport.krakow.pl/kolonie-i-polkolonie-lato-krakow/",
  "https://www.agamasport.pl/polkolonie-krakow/",
  "https://mnk.pl/artykul/wakacje-ze-sztuka-polkolonie-w-mnk-2026",
  "https://cogiteon.pl/edukacja/polkolonie",
  "https://medincusactive.pl/strefy/polkolonie-2026/",
  "https://www.kct.pl/sportowa-polkolonia-oboz-dochodzeniowy/",
  "https://polkoloniakrakow.pl/",
  "https://www.prosportkrakow.pl/oferta/polkolonie/",
  "https://centrum.ksos.pl/polkolonie-sportowe/",
  "https://www.anikino.pl/polkolonie-krakow-2026/zapisy-polkolonia/turnusy",
  "https://polkolonia-pilkarska.pl/",
  "https://malitworcy.pl/polkolonie-z-ceramika/",
  "https://frajdasport.pl/polkolonie",
  "https://www.ckpodgorza.pl/oferta/zajecie/polkolonia-ferie-2026",
  "https://malygeniusz.org/krakow/",
  "https://harcownia.com/polkolonie-krakow",
  "https://moswschod.pl/polkolonie-sportowe/",
  "https://mdk.krakow.pl/",
  "https://polkolonie.earlystage.pl/polkolonie/krakow-biezanow-prokocim-lato/",
] as const;

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
  const [sortBy, setSortBy] = useState<"alpha" | "id">("alpha");

  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const [organizers, setOrganizers] = useState<Organizer[]>([]);

  const [promptPreview, setPromptPreview] = useState<{ title: string; campId: string; prompt: string } | null>(null);
  const [assigningImageId, setAssigningImageId] = useState<string | null>(null);

  const [promptModal, setPromptModal] = useState(false);
  const [activePromptModalView, setActivePromptModalView] = useState<"prompts" | "urls">("prompts");
  const [activePromptTab, setActivePromptTab] = useState(0);
  const [prompts, setPrompts] = useState(PROMPTS);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [editingContent, setEditingContent] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptUrlRows, setPromptUrlRows] = useState<string[]>([...PROMPT_URL_LIST].sort((a, b) => a.localeCompare(b, "pl")));
  const [promptUrlStatuses, setPromptUrlStatuses] = useState<Record<number, PromptUrlStatus>>({});
  const [promptUrlLastChecked, setPromptUrlLastChecked] = useState<Record<number, string | null>>({});
  const [syncingPromptUrls, setSyncingPromptUrls] = useState(false);
  const [buildingDataframe, setBuildingDataframe] = useState(false);
  const [buildResult, setBuildResult] = useState<{ ok: boolean; message: string; failed?: number; newCamps?: { camp_id: string; title: string; image_prompt: string }[] } | null>(null);
  const [imagePromptByCampId, setImagePromptByCampId] = useState<Record<string, string>>({});

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchCamps = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/camps");
    const data = await res.json();
    if (Array.isArray(data)) setCamps(withShuffleOrder(data.map((c: Record<string, unknown>) => mapCampRow(c) as Camp & Record<string, unknown>)));
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
            if (sortBy === "id") return a.id.localeCompare(b.id);
            return a.title.localeCompare(b.title, "pl");
          }),
        }));
      return { type, byOrganizer };
    });
  }, [allGroupKeys, filteredCamps, getEffectiveStatus, sortBy]);

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

  const completedPromptUrlCount = useMemo(
    () => promptUrlRows.filter((_, index) => promptUrlStatuses[index] === "completed").length,
    [promptUrlRows, promptUrlStatuses]
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
    const normalizedTypeLevel1Id = resolveTypeLevel1Id(typeLevel1Options, typeof camp.type_lvl_1 === "string" ? camp.type_lvl_1 : (typeof camp.type_id === "string" ? camp.type_id : null));
    const normalizedTypeLevel2Id = resolveTypeLevel2Id(typeLevel2Options, typeof camp.type_lvl_2 === "string" ? camp.type_lvl_2 : (typeof camp.subtype_id === "string" ? camp.subtype_id : null), normalizedTypeLevel1Id);
    setEditForm({
      camp_id:            getCampExternalId(camp),
      title:              camp.title,
      description_short:  camp.description_short,
      description_long:   camp.description_long,
      type_lvl_1:      normalizedTypeLevel1Id,
      type_lvl_2:      normalizedTypeLevel2Id,
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
      camp_id:            editForm.camp_id ? String(editForm.camp_id).trim() : null,
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
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
    const externalId = getCampExternalId(camp);
    return externalId ? (imagePromptByCampId[externalId] ?? "") : "";
  };

  const hydratePromptUrlState = useCallback((rows: UrlTrackingRow[]) => {
    const ordered = [...rows].sort((a, b) => a.url.localeCompare(b.url, "pl", { sensitivity: "base" }));
    const nextRows = ordered.map((row) => row.url);
    const nextStatuses: Record<number, PromptUrlStatus> = {};
    const nextLastChecked: Record<number, string | null> = {};

    ordered.forEach((row, index) => {
      nextStatuses[index] = row.is_done ? "completed" : "in-progress";
      nextLastChecked[index] = row.last_checked_at;
    });

    setPromptUrlRows(nextRows);
    setPromptUrlStatuses(nextStatuses);
    setPromptUrlLastChecked(nextLastChecked);
  }, []);

  const loadPromptUrls = useCallback(async () => {
    setSyncingPromptUrls(true);
    try {
      const res = await fetch("/api/admin/url-tracking?typ=kolonie");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Nie udało się pobrać URL-i.");

      if (Array.isArray(data) && data.length > 0) {
        hydratePromptUrlState(data as UrlTrackingRow[]);
        return;
      }

      const seedRows = [...PROMPT_URL_LIST].map((url) => ({ url, isDone: false }));
      const seedRes = await fetch("/api/admin/url-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typ: "kolonie", rows: seedRows }),
      });
      const seedData = await seedRes.json();
      if (!seedRes.ok) throw new Error(seedData?.error || "Nie udało się zapisać startowej listy URL-i.");
      hydratePromptUrlState(Array.isArray(seedData) ? seedData as UrlTrackingRow[] : []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Błąd synchronizacji listy URL.");
    } finally {
      setSyncingPromptUrls(false);
    }
  }, [hydratePromptUrlState]);

  const savePromptUrls = useCallback(async () => {
    setSyncingPromptUrls(true);
    try {
      const rows = promptUrlRows.map((url, index) => ({
        url: url.trim(),
        isDone: promptUrlStatuses[index] === "completed",
        lastCheckedAt: promptUrlLastChecked[index] ?? null,
      }));

      const res = await fetch("/api/admin/url-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typ: "kolonie", rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Nie udało się zapisać URL-i.");

      hydratePromptUrlState(Array.isArray(data) ? data as UrlTrackingRow[] : []);
      alert("Zapisano listę URL-i w bazie.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Błąd zapisu URL-i.");
    } finally {
      setSyncingPromptUrls(false);
    }
  }, [hydratePromptUrlState, promptUrlLastChecked, promptUrlRows, promptUrlStatuses]);

  const setPromptUrlStatus = useCallback(async (index: number, nextStatus: PromptUrlStatus) => {
    const url = (promptUrlRows[index] ?? "").trim();

    setPromptUrlStatuses((prev) => ({ ...prev, [index]: nextStatus }));
    if (!url) return;

    try {
      const res = await fetch("/api/admin/url-tracking", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typ: "kolonie", url, isDone: nextStatus === "completed" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Nie udało się zaktualizować statusu URL.");

      setPromptUrlLastChecked((prev) => ({
        ...prev,
        [index]: typeof data?.last_checked_at === "string" ? data.last_checked_at : (prev[index] ?? null),
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Błąd aktualizacji statusu URL.");
    }
  }, [promptUrlRows]);

  const removePromptUrl = useCallback(async (index: number) => {
    const url = (promptUrlRows[index] ?? "").trim();
    if (url) {
      try {
        const params = new URLSearchParams({ typ: "kolonie", url });
        const res = await fetch(`/api/admin/url-tracking?${params.toString()}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Nie udało się usunąć URL z bazy.");
      } catch (error) {
        alert(error instanceof Error ? error.message : "Błąd usuwania URL.");
        return;
      }
    }

    setPromptUrlRows((prev) => prev.filter((_, i) => i !== index));
    setPromptUrlStatuses((prev) => {
      const next: Record<number, PromptUrlStatus> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki !== index) next[ki > index ? ki - 1 : ki] = v;
      });
      return next;
    });
    setPromptUrlLastChecked((prev) => {
      const next: Record<number, string | null> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = Number(k);
        if (ki !== index) next[ki > index ? ki - 1 : ki] = v;
      });
      return next;
    });
  }, [promptUrlRows]);

  const openPromptModal = async () => {
    setActivePromptModalView("prompts");
    setEditingPrompt(false);
    setPromptModal(true);
    void loadPromptUrls();
    try {
      const res = await fetch("/api/admin/prompts");
      const data = await res.json();
      setPrompts(data);
    } catch { /* use static fallback */ }
  };

  const savePrompt = async () => {
    setSavingPrompt(true);
    const updated = prompts.map((p, i) => i === activePromptTab ? { ...p, content: editingContent } : p);
    try {
      await fetch("/api/admin/prompts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
      setPrompts(updated);
      setEditingPrompt(false);
    } catch { /* ignore */ }
    setSavingPrompt(false);
  };

  const buildCampsDataframe = async () => {
    setBuildingDataframe(true);
    setBuildResult(null);
    try {
      const res = await fetch("/api/admin/build-camps", { method: "POST" });
      const data = await res.json();
      setBuildResult({ ok: data.ok, message: data.ok ? data.output : data.error, failed: data.failed ?? 0, newCamps: data.newCamps ?? [] });
      if (data.ok && Array.isArray(data.newCamps)) {
        const promptMap: Record<string, string> = {};
        for (const row of data.newCamps) {
          if (row && typeof row.camp_id === "string" && typeof row.image_prompt === "string") {
            promptMap[row.camp_id] = row.image_prompt;
          }
        }
        if (Object.keys(promptMap).length > 0) {
          setImagePromptByCampId((prev) => ({ ...prev, ...promptMap }));
        }
        await fetchCamps();
      }
    } catch (err) {
      setBuildResult({ ok: false, message: String(err) });
    } finally {
      setBuildingDataframe(false);
    }
  };

  const assignImageForCamp = async (camp: Camp) => {
    const campId = getCampExternalId(camp);
    if (!campId) {
      alert("Ta kolonia nie ma camp_id. Najpierw wygeneruj przez Upload data.");
      return;
    }

    setAssigningImageId(camp.id);
    try {
      const res = await fetch("/api/admin/assign-image-by-camp-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: camp.id, camp_id: campId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(`Błąd: ${data.error || "Nie udało się przypisać obrazu"}`);
        return;
      }
      setCamps((prev) => prev.map((c) =>
        c.id === camp.id
          ? {
              ...c,
              image_url: data.image_cover ?? c.image_url,
              image_cover: data.image_cover ?? c.image_cover,
              image_thumb: data.image_thumb ?? c.image_thumb,
              image_set: data.image_set ?? c.image_set,
              status: "draft",
            }
          : c,
      ));
      alert(`Obraz przypisany dla ${campId}`);
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
          <button
            onClick={openPromptModal}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors"
          >
            <Sparkles size={14} />
            Prompt
          </button>
          <button
            onClick={buildCampsDataframe}
            disabled={buildingDataframe}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors disabled:opacity-50"
          >
            {buildingDataframe ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Upload data
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
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setSortBy("alpha")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", sortBy === "alpha" ? "bg-stone-700 text-white" : "bg-white border border-border text-muted hover:text-foreground hover:border-[#CCC]")}>A-Z</button>
          <button onClick={() => setSortBy("id")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", sortBy === "id" ? "bg-stone-700 text-white" : "bg-white border border-border text-muted hover:text-foreground hover:border-[#CCC]")}>#ID</button>
          <button onClick={toggleAllCategories} className="text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors bg-white border border-border text-muted hover:text-foreground hover:border-[#CCC] ml-1">
            {hasExpandedCategories ? "Zwiń" : "Rozwiń"}
          </button>
        </div>
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
                              {thumbUrl(camp.image_thumb, camp.image_url) ? (
                                <img src={thumbUrl(camp.image_thumb, camp.image_url) || ""} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
                              ) : (
                                <span className="w-16 h-16 rounded bg-stone-100 shrink-0 flex items-center justify-center text-[10px] text-stone-400">—</span>
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

                              <button
                                onClick={() => {
                                  const prompt = getCampImagePrompt(camp);
                                  if (!prompt) { alert("Brak image promptu dla tej kolonii."); return; }
                                  setPromptPreview({ campId: getCampExternalId(camp) || "(brak camp_id)", title: camp.title, prompt });
                                }}
                                className="p-1 rounded hover:bg-accent text-muted transition-colors"
                                title="Pokaż image prompt"
                              >
                                <Sparkles size={13} />
                              </button>

                              <button onClick={() => assignImageForCamp(camp)} className="p-1 rounded hover:bg-accent text-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Przypisz obraz po Camp ID" disabled={assigningImageId === camp.id}>
                                {assigningImageId === camp.id ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                              </button>

                              <button onClick={() => toggleFeatured(camp)} className={cn("p-1 rounded transition-colors", camp.is_featured ? "text-amber-500 hover:bg-amber-50" : "text-muted hover:bg-accent")} title="Wyróżnij">
                                <Star size={13} fill={camp.is_featured ? "currentColor" : "none"} />
                              </button>

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

                              <button onClick={() => handleDelete(camp.id)} className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Usuń">
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {isEditing && (
                              <div className="px-3 pb-3 pt-2 border-t border-border/50">
                                <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Opis oferty</p>
                                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                    <div className="md:col-span-2">
                                      <label className={labelClass}>Tytuł</label>
                                      <input className={inputClass} value={(editForm.title as string) || ""} onChange={(e) => updateField("title", e.target.value)} />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className={labelClass}>CAMP ID</label>
                                      <input
                                        className={`${inputClass} font-mono`}
                                        value={(editForm.camp_id as string) || ""}
                                        onChange={(e) => updateField("camp_id", e.target.value)}
                                        placeholder="CAMP-000001"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className={labelClass}>Organizator</label>
                                      <OrganizerCombobox
                                        organizers={organizers}
                                        value={(editForm.organizer_id as string) || (editForm.organizer as string) || null}
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

      {promptPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-[13px] text-foreground flex items-center gap-2">
                <Sparkles size={14} />
                Image prompt
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(promptPreview.prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:border-[#CCC] transition-colors"
                >
                  <Copy size={12} />
                  Kopiuj prompt
                </button>
                <button onClick={() => setPromptPreview(null)} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-2 overflow-y-auto flex-1">
              <p className="text-[12px] text-muted-foreground">CAMP ID: {promptPreview.campId} — {promptPreview.title}</p>
              <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed bg-stone-50 rounded-lg p-3 border border-border">
                {promptPreview.prompt}
              </pre>
            </div>
          </div>
        </div>
      )}

      {promptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={16} />
                Prompt
              </h2>
              <button onClick={() => { setPromptModal(false); setEditingPrompt(false); setActivePromptModalView("prompts"); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-1 px-5 pt-3 border-b border-border">
              <button
                onClick={() => { setActivePromptModalView("prompts"); setEditingPrompt(false); }}
                className={cn(
                  "px-3 py-1.5 text-[12px] font-medium rounded-t-md transition-colors border-b-2 -mb-px",
                  activePromptModalView === "prompts"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Prompty
              </button>
              <button
                onClick={() => { setActivePromptModalView("urls"); setEditingPrompt(false); }}
                className={cn(
                  "px-3 py-1.5 text-[12px] font-medium rounded-t-md transition-colors border-b-2 -mb-px",
                  activePromptModalView === "urls"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Lista URL
              </button>
            </div>

            {activePromptModalView === "prompts" ? (
              <>
                <div className="flex gap-1 px-5 pt-3 border-b border-border">
                  {prompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => { setActivePromptTab(i); setEditingPrompt(false); }}
                      className={cn(
                        "px-3 py-1.5 text-[12px] font-medium rounded-t-md transition-colors border-b-2 -mb-px",
                        activePromptTab === i
                          ? "border-foreground text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {editingPrompt ? (
                    <textarea
                      className="w-full h-full min-h-[300px] text-sm font-mono text-foreground border border-border rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {prompts[activePromptTab]?.content}
                    </p>
                  )}
                </div>
                <div className="flex justify-between gap-2 px-5 py-4 border-t border-border">
                  <button
                    onClick={() => {
                      if (editingPrompt) {
                        setEditingPrompt(false);
                      } else {
                        setEditingContent(prompts[activePromptTab]?.content ?? "");
                        setEditingPrompt(true);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:border-[#CCC] transition-colors"
                  >
                    <Pencil size={12} />
                    {editingPrompt ? "Anuluj" : "Edytuj"}
                  </button>
                  <div className="flex gap-2">
                    {editingPrompt ? (
                      <button
                        onClick={savePrompt}
                        disabled={savingPrompt}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-foreground rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50"
                      >
                        {savingPrompt ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Zapisz
                      </button>
                    ) : (
                      <button
                        onClick={() => navigator.clipboard.writeText(prompts[activePromptTab]?.content ?? "")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:border-[#CCC] transition-colors"
                      >
                        <Copy size={12} />
                        Kopiuj
                      </button>
                    )}
                    <button onClick={() => { setPromptModal(false); setEditingPrompt(false); setActivePromptModalView("prompts"); }} className="px-3 py-1.5 text-[12px] font-medium text-white bg-foreground rounded-lg hover:bg-stone-700 transition-colors">
                      Zamknij
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-muted-foreground">
                      URL-e. W trakcie: {promptUrlRows.length - completedPromptUrlCount}, Zrobione: {completedPromptUrlCount}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPromptUrlRows((prev) => [...prev, ""])}
                        disabled={syncingPromptUrls}
                        className="px-2.5 py-1 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground transition-colors"
                      >
                        + Dodaj
                      </button>
                    </div>
                  </div>
                  {promptUrlRows.length === 0 ? (
                    <div className="rounded-lg border border-border divide-y divide-border/60">
                      <p className="px-3 py-3 text-[12px] text-muted">Brak URL-i do pokazania.</p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border border-border">
                        <div className="px-3 py-2 border-b border-border bg-accent/20 text-[11px] font-semibold text-muted-foreground">W trakcie</div>
                        <div className="divide-y divide-border/60">
                          {promptUrlRows.map((url, index) => ({ url, index })).filter(({ index }) => promptUrlStatuses[index] !== "completed").map(({ url, index }) => (
                            <div key={`in-progress-${index}-${url}`} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent/30 transition-colors">
                              <input
                                type="text"
                                className="min-w-0 flex-1 px-2 py-1 text-[11px] text-foreground rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                                value={url}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setPromptUrlRows((prev) => prev.map((entry, i) => (i === index ? value : entry)));
                                }}
                              />
                              <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                                Ostatnio: {promptUrlLastChecked[index] ? new Date(promptUrlLastChecked[index] as string).toLocaleString("pl-PL") : "-"}
                              </span>
                              <button
                                type="button"
                                onClick={() => { void setPromptUrlStatus(index, "completed"); }}
                                className="shrink-0 px-2 py-1 text-[10px] font-medium rounded border border-border text-muted hover:text-foreground transition-colors"
                              >
                                Oznacz jako zrobione
                              </button>
                              <button
                                type="button"
                                onClick={() => { void removePromptUrl(index); }}
                                className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border">
                        <div className="px-3 py-2 border-b border-border bg-accent/20 text-[11px] font-semibold text-muted-foreground">Zrobione</div>
                        <div className="divide-y divide-border/60">
                          {promptUrlRows.map((url, index) => ({ url, index })).filter(({ index }) => promptUrlStatuses[index] === "completed").length === 0 ? (
                            <p className="px-3 py-3 text-[12px] text-muted">Brak gotowych URL-i.</p>
                          ) : (
                            promptUrlRows.map((url, index) => ({ url, index })).filter(({ index }) => promptUrlStatuses[index] === "completed").map(({ url, index }) => (
                              <div key={`completed-${index}-${url}`} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent/30 transition-colors">
                                <input
                                  type="text"
                                  className="min-w-0 flex-1 px-2 py-1 text-[11px] text-foreground rounded border border-border bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                                  value={url}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setPromptUrlRows((prev) => prev.map((entry, i) => (i === index ? value : entry)));
                                  }}
                                />
                                <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                                  Ostatnio: {promptUrlLastChecked[index] ? new Date(promptUrlLastChecked[index] as string).toLocaleString("pl-PL") : "-"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => { void setPromptUrlStatus(index, "in-progress"); }}
                                  className="shrink-0 px-2 py-1 text-[10px] font-medium rounded border border-border text-muted hover:text-foreground transition-colors"
                                >
                                  Cofnij do w trakcie
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { void removePromptUrl(index); }}
                                  className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-between gap-2 px-5 py-4 border-t border-border">
                  <button
                    onClick={() => {
                      const selected = promptUrlRows.filter((url, index) => promptUrlStatuses[index] === "completed" && url.trim().length > 0).join("\n");
                      navigator.clipboard.writeText(selected);
                    }}
                    disabled={completedPromptUrlCount === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:border-[#CCC] transition-colors disabled:opacity-50"
                  >
                    <Copy size={12} />
                    Kopiuj zrobione
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { void savePromptUrls(); }}
                      disabled={syncingPromptUrls}
                      className="px-3 py-1.5 text-[12px] font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
                    >
                      {syncingPromptUrls ? "Zapisywanie..." : "Zapisz"}
                    </button>
                    <button onClick={() => { setPromptModal(false); setEditingPrompt(false); setActivePromptModalView("prompts"); }} className="px-3 py-1.5 text-[12px] font-medium text-white bg-foreground rounded-lg hover:bg-stone-700 transition-colors">
                      Zamknij
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {buildResult !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className={`text-base font-semibold flex items-center gap-2 ${buildResult.ok ? "text-green-700" : "text-red-600"}`}>
                <Play size={16} />
                Upload data – {buildResult.ok ? "sukces" : "błąd"}
              </h2>
              <button onClick={() => setBuildResult(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {!buildResult.ok ? (
                <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed bg-stone-50 rounded-lg p-3 border border-border">
                  {buildResult.message || "(brak wyjścia)"}
                </pre>
              ) : (
                <div className="rounded-lg border border-border bg-stone-50 p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {buildResult.newCamps?.length
                      ? `Przetworzono ${buildResult.newCamps.length} kolonii.`
                      : "Brak nowych kolonii do przetworzenia."}
                  </p>
                  {buildResult.failed ? (
                    <p className="text-xs text-red-600">Błąd przy {buildResult.failed} rekordzie/ach (sprawdź logi serwera).</p>
                  ) : null}
                  {buildResult.message ? (
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {buildResult.message}
                    </pre>
                  ) : null}
                </div>
              )}
            </div>
            <div className="flex justify-end items-center px-5 py-4 border-t border-border">
              <button onClick={() => setBuildResult(null)} className="px-3 py-1.5 text-[12px] font-medium text-white bg-foreground rounded-lg hover:bg-stone-700 transition-colors">
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
