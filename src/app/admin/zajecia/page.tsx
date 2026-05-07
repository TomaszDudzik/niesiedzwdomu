"use client";

import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from "react";
import {
  ChevronDown,
  ChevronRight,
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

const MiniMapLazy = lazy(() => import("../miejsca/mini-map").then((module) => ({ default: module.MiniMap })));
import { ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS, DISTRICT_LIST } from "@/lib/mock-data";
import { cn, formatDateShort, thumbUrl, toHourMinute, withCacheBust } from "@/lib/utils";
import type { Activity, Organizer } from "@/types/database";
import { ImageSection } from "@/components/admin/image-section";
import { OrganizerCombobox } from "@/components/admin/organizer-combobox";
import { TaxonomyFields } from "@/components/admin/taxonomy-fields";

import { resolveCategoryLevel1Name, resolveCategoryLevel2Name, resolveCategoryLevel3Name, resolveTypeLevel1Id, resolveTypeLevel2Id } from "@/lib/admin-taxonomy";
import { useAdminTaxonomy } from "@/lib/use-admin-taxonomy";
import { PROMPTS } from "@/lib/prompts";

type DerivedActivityStatus = Activity["status"] | "outdated";
type ActivityListFilter = "all" | "published" | "draft" | "outdated";
type ActivityGroupingMode = "type" | "organizer";
type PromptUrlStatus = "in-progress" | "completed";
type UrlTrackingRow = {
  id: string;
  url: string;
  typ: "miejsce" | "kolonie" | "wydarzenia" | "zajecia";
  is_done: boolean;
  last_checked_at: string | null;
};
const UNCATEGORIZED_GROUP = "__uncategorized__";
const UNASSIGNED_ORGANIZER_GROUP = "__unassigned_organizer__";

function withShuffleOrder<T extends Record<string, unknown>>(items: T[]): (T & { __shuffleOrder: number })[] {
  return items.map((item) => ({ ...item, __shuffleOrder: Math.random() }));
}

function getShuffleOrder(item: Record<string, unknown>): number {
  const value = item.__shuffleOrder;
  return typeof value === "number" ? value : Number.MAX_SAFE_INTEGER;
}

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

const PROMPT_URL_TODO_LIST = [
  "https://warsztatydladziecikrakow.com/",
  "https://nck.krakow.pl/",
  "https://bloniasport.pl/kids/zajecia-dla-dzieci/",
  "https://go4robot.pl/krakow/",
  "https://robocode.pl/",
  "https://www.roboprzygoda.pl/",
  "https://www.krainatworczosci.pl/domowa",
  "https://mck.krakow.pl/for-children",
  "https://www.cmjordan.krakow.pl/",
  "https://cmjordan.krakow.pl/zajecia-stale/zajecia-artystyczne",
  "https://cmjordan.krakow.pl/zajecia-stale/zajecia-artystyczne/ceramika",
  "https://centrum.ksos.pl/",
  "https://www.ckpodgorza.pl/oferta/zajecie/zajecia-plastyczne-dla-dzieci",
  "https://www.ckpodgorza.pl/oferta/zajecie/zajecia-teatralne-dla-dzieci-i-mlodziezy",
  "https://www.ckpodgorza.pl/oferta/zajecie/klub-mlodego-naukowca-1-kopia",
  "https://www.ckpodgorza.pl/oferta/zajecie/warsztaty-sensoryczno-rozwojowe-1",
  "https://www.agamasport.pl/",
  "https://www.agamasport.pl/nauka-plywania-dla-dzieci/",
  "https://malarmo.pl/warsztaty/warsztaty-dla-dzieci/kreatywne",
  "https://malarmo.pl/warsztaty/warsztaty-dla-szkol-i-przedszkoli",
  "https://aak.edu.pl/",
  "https://egurrola.com/szkola-tanca-krakow-zajecia-dla-dzieci/",
  "https://doremisie.com/",
  "https://centrumtancami.pl/",
  "https://domin-krakow.pl/zajecia-plastyczne-6-11-lat/",
  "https://makememusic.pl/",
  "https://pasja.krakow.pl/zajecia-taneczne-w-przedszkolach-i-szkolach/",
  "https://dworek.eu/zajecia-stale/pracownie-plastyczne-dla-dzieci-i-mlodziezy/",
  "https://lokietek.dworek.eu/zajecia-stale/teatr/",
  "https://krakowskieforum.pl/wydarzenie-2737-zajecia_teatralne_dla_dzieci_10_14_lat.html",
  "https://uignasia.com/",
  "https://strefa51krakow.pl/",
  "https://filharmoniakrakow.pl/public/edukacja/muzyczne-bobasy",
  "https://gymnastic.com.pl/",
  "https://gymnastic.com.pl/zajecia/gimnastyka-i-akrobatyka/",
  "https://gymspace.pl/",
  "https://flexbody.pl/",
  "https://www.hifivegym.pl/",
  "https://harcownia.com/akrobatyka",
  "https://football-kids.com/treningi/krakow",
  "https://akademia-diament.pl/",
  "https://poloniakrakow.pl/",
  "https://akademiazglowa.pl/",
  "https://sawgrzegorzki.krakow.pl/akademia-pilkarska-grzegorzki/",
  "https://kskolejarzprokocim.pl/akademia-kolejarz-prokocim-krakow/",
  "https://grapplingkrakow.pl/oferta/",
  "https://karatekrakow.pl/",
  "https://karatedo.krakow.pl/dojo-forty-kleparz-2/",
  "https://www.mania-plywania.pl/",
  "https://szkolarekin.pl/nauka-plywania-dla-dzieci-krakow",
  "https://www.parkwodny.pl/oferta/nauka/",
  "https://teamsport.krakow.pl/",
  "https://www.kraul.pl/",
  "https://nikateam.org/zajecia-dla-przedszkoli",
  "https://helendoron.pl/nauka-angielskiego-krakow/",
  "https://sayhischool.pl/",
  "https://earlystage.pl/pl/szkola/krakow",
  "https://leaderschool.pl/krakow/metody/leo-english/",
  "https://callan.krakow.pl/angielski-dla-dzieci/",
  "https://infinity.edu.pl/angielski-dla-dzieci/",
  "https://bookmeacookie.pl/",
  "https://malitworcy.pl/ceramika-dla-dzieci/",
  "https://www.jumaart.pl/",
  "https://lykoceramika.pl/",
  "https://bialykrolikceramika.pl/warsztaty/",
  "https://fikolki.pl/kazimierz-maluch/",
  "https://sensorki.pl/",
] as const;

const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
const labelClass = "block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
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


export default function AdminActivitiesPage() {
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options, loading: taxonomyLoading } = useAdminTaxonomy();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<ActivityListFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"alpha" | "id">("alpha");
  const [groupingMode, setGroupingMode] = useState<ActivityGroupingMode>("organizer");
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);

  const [promptPreview, setPromptPreview] = useState<{ title: string; activityId: string; prompt: string } | null>(null);
  const [assigningImageId, setAssigningImageId] = useState<string | null>(null);

  const [promptModal, setPromptModal] = useState(false);
  const [activePromptModalView, setActivePromptModalView] = useState<"prompts" | "urls">("prompts");
  const [activePromptTab, setActivePromptTab] = useState(0);
  const [prompts, setPrompts] = useState(PROMPTS);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [editingContent, setEditingContent] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptUrlRows, setPromptUrlRows] = useState<string[]>([]);
  const [promptUrlStatuses, setPromptUrlStatuses] = useState<Record<number, PromptUrlStatus>>({});
  const [promptUrlLastChecked, setPromptUrlLastChecked] = useState<Record<number, string | null>>({});
  const [syncingPromptUrls, setSyncingPromptUrls] = useState(false);
  const [buildingDataframe, setBuildingDataframe] = useState(false);
  const [buildResult, setBuildResult] = useState<{ ok: boolean; message: string; failed?: number; newActivities?: { activity_id: string; title: string; image_prompt: string }[] } | null>(null);
  const [imagePromptByActivityId, setImagePromptByActivityId] = useState<Record<string, string>>({});

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
      setActivities(withShuffleOrder(data.map((row: Record<string, unknown>) => mapActivityRow(row) as Activity & Record<string, unknown>)));
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

  const getOrganizerGroupKey = useCallback((activity: Partial<Activity> | Record<string, unknown>) => {
    if (typeof activity.organizer === "string" && activity.organizer.trim().length > 0) {
      return `name:${activity.organizer.trim().toLowerCase()}`;
    }
    return UNASSIGNED_ORGANIZER_GROUP;
  }, []);

  const organizerGroupMeta = useMemo(() => {
    const meta = new Map<string, { label: string; icon: string }>();
    for (const activity of activities) {
      const organizerName = typeof activity.organizer === "string" && activity.organizer.trim().length > 0
        ? activity.organizer.trim()
        : "Bez organizatora";
      const key = getOrganizerGroupKey(activity);
      if (!meta.has(key)) {
        meta.set(key, {
          label: organizerName,
          icon: key === UNASSIGNED_ORGANIZER_GROUP ? "🫥" : "🏢",
        });
      }
    }

    if (!meta.has(UNASSIGNED_ORGANIZER_GROUP)) {
      meta.set(UNASSIGNED_ORGANIZER_GROUP, { label: "Bez organizatora", icon: "🫥" });
    }

    return meta;
  }, [activities, getOrganizerGroupKey]);

  const getActiveGroupKey = useCallback((activity: Partial<Activity> | Record<string, unknown>) => {
    return groupingMode === "organizer" ? getOrganizerGroupKey(activity) : getActivityGroupKey(activity);
  }, [groupingMode, getOrganizerGroupKey]);

  const getActiveGroupLabel = useCallback((group: string) => {
    if (groupingMode === "organizer") {
      return organizerGroupMeta.get(group)?.label ?? "Bez organizatora";
    }
    return getActivityGroupLabel(group);
  }, [groupingMode, organizerGroupMeta]);

  const getActiveGroupIcon = useCallback((group: string) => {
    if (groupingMode === "organizer") {
      return organizerGroupMeta.get(group)?.icon ?? "🏢";
    }
    return getActivityGroupIcon(group);
  }, [groupingMode, organizerGroupMeta]);

  const sortActiveGroupKeys = useCallback((keys: string[]) => {
    if (groupingMode === "organizer") {
      return [...keys].sort((left, right) => {
        if (left === UNASSIGNED_ORGANIZER_GROUP) return 1;
        if (right === UNASSIGNED_ORGANIZER_GROUP) return -1;
        return getActiveGroupLabel(left).localeCompare(getActiveGroupLabel(right), "pl");
      });
    }
    return sortActivityGroupKeys(keys);
  }, [groupingMode, getActiveGroupLabel]);

  const filteredActivities = useMemo(() => {
    const scopedActivities = typeFilter ? activities.filter((activity) => getActiveGroupKey(activity) === typeFilter) : activities;
    if (statusFilter === "all") return scopedActivities;
    if (statusFilter === "draft") {
      return scopedActivities.filter((activity) => {
        const effectiveStatus = getEffectiveStatus(activity);
        return effectiveStatus === "draft" || effectiveStatus === "cancelled";
      });
    }
    return scopedActivities.filter((activity) => getEffectiveStatus(activity) === statusFilter);
  }, [activities, getActiveGroupKey, getEffectiveStatus, statusFilter, typeFilter]);

  const allGroupKeys = useMemo(() => {
    const groups = new Set<string>();
    activities.forEach((activity) => groups.add(getActiveGroupKey(activity)));
    return sortActiveGroupKeys(Array.from(groups));
  }, [activities, getActiveGroupKey, sortActiveGroupKeys]);

  const groupedActivities = useMemo(
    () => allGroupKeys.map((category) => ({
      category,
      label: getActiveGroupLabel(category),
      items: filteredActivities
        .filter((activity) => getActiveGroupKey(activity) === category)
        .sort((left, right) => {
          const statusDiff = statusOrder[getEffectiveStatus(left)] - statusOrder[getEffectiveStatus(right)];
          if (statusDiff !== 0) return statusDiff;
          const dateDiff = (left.date_start || "").localeCompare(right.date_start || "");
          if (dateDiff !== 0) return dateDiff;
          return left.title.localeCompare(right.title, "pl");
        }),
    })),
    [allGroupKeys, filteredActivities, getActiveGroupKey, getActiveGroupLabel, getEffectiveStatus]
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
        const typeActivities = activities.filter((activity) => getActiveGroupKey(activity) === type);
        const published = typeActivities.filter((activity) => getEffectiveStatus(activity) === "published").length;
        const draft = typeActivities.filter((activity) => {
          const effectiveStatus = getEffectiveStatus(activity);
          return effectiveStatus === "draft" || effectiveStatus === "cancelled";
        }).length;
        const outdated = typeActivities.filter((activity) => getEffectiveStatus(activity) === "outdated").length;
        return [type, { all: typeActivities.length, published, draft, outdated }];
      })
    ),
    [activities, allGroupKeys, getActiveGroupKey, getEffectiveStatus]
  );

  const visibleTypeKeys = useMemo(
    () => sortActiveGroupKeys(Array.from(new Set(filteredActivities.map((activity) => getActiveGroupKey(activity))))),
    [filteredActivities, getActiveGroupKey, sortActiveGroupKeys]
  );

  const hasExpandedCategories = useMemo(
    () => visibleTypeKeys.some((type) => !collapsedCategories[type]),
    [collapsedCategories, visibleTypeKeys]
  );

  const promptSeedUrls = useMemo(() => {
    const urls = new Set<string>(PROMPT_URL_TODO_LIST);
    for (const activity of activities) {
      if (activity.source_url && activity.source_url.trim().length > 0) urls.add(activity.source_url.trim());
      const maybeFacebook = (activity as unknown as Record<string, unknown>).facebook_url;
      if (typeof maybeFacebook === "string" && maybeFacebook.trim().length > 0) urls.add(maybeFacebook.trim());
    }
    return Array.from(urls).sort((a, b) => a.localeCompare(b, "pl"));
  }, [activities]);

  const completedPromptUrlCount = useMemo(
    () => promptUrlRows.filter((_, index) => promptUrlStatuses[index] === "completed").length,
    [promptUrlRows, promptUrlStatuses]
  );

  const inProgressPromptUrlEntries = useMemo(
    () => promptUrlRows
      .map((url, index) => ({ url, index }))
      .filter(({ index }) => promptUrlStatuses[index] !== "completed")
      .sort((a, b) => a.url.localeCompare(b.url, "pl", { sensitivity: "base" })),
    [promptUrlRows, promptUrlStatuses]
  );

  const completedPromptUrlEntries = useMemo(
    () => promptUrlRows
      .map((url, index) => ({ url, index }))
      .filter(({ index }) => promptUrlStatuses[index] === "completed")
      .sort((a, b) => a.url.localeCompare(b.url, "pl", { sensitivity: "base" })),
    [promptUrlRows, promptUrlStatuses]
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
          if (getActiveGroupKey(activity) !== type) return false;
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

  useEffect(() => {
    setTypeFilter(null);
    setCollapsedCategories({});
  }, [groupingMode]);

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
      activity_id: getActivityExternalId(activity),
      title: activity.title,
      description_short: activity.description_short,
      description_long: activity.description_long,
      type_lvl_1: activity.type_lvl_1 ?? activity.type_id ?? null,
      type_lvl_2: activity.type_lvl_2 ?? activity.subtype_id ?? null,
      activity_type: activity.activity_type,
      schedule_summary: activity.schedule_summary,
      days_of_week: activity.days_of_week.join(", "),
      date_start: activity.date_start,
      date_end: activity.date_end,
      time_start: toHourMinute(activity.time_start),
      time_end: toHourMinute(activity.time_end),
      age_min: activity.age_min,
      age_max: activity.age_max,
      price_from: activity.price_from,
      price_to: activity.price_to,
      organizer: activity.organizer,
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
      list_of_activities: activity.list_of_activities ?? "",
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
      activity_id: editForm.activity_id ? String(editForm.activity_id).trim() : null,
      title: String(editForm.title || ""),
      description_short: String(editForm.description_short || ""),
      description_long: String(editForm.description_long || ""),
      type_lvl_1: editForm.type_lvl_1 ? String(editForm.type_lvl_1) : null,
      type_lvl_2: editForm.type_lvl_2 ? String(editForm.type_lvl_2) : null,
      days_of_week: String(editForm.days_of_week || "").split(",").map((part) => part.trim()).filter(Boolean),
      date_start: editForm.date_start,
      date_end: editForm.date_end || null,
      time_start: toHourMinute(String(editForm.time_start || "")) || null,
      time_end: toHourMinute(String(editForm.time_end || "")) || null,
      age_min: editForm.age_min === "" || editForm.age_min === null ? null : Number(editForm.age_min),
      age_max: editForm.age_max === "" || editForm.age_max === null ? null : Number(editForm.age_max),
      price_from: Boolean(editForm.is_free) ? 0 : (editForm.price_from === "" || editForm.price_from === null ? null : Number(editForm.price_from)),
      price_to: Boolean(editForm.is_free) ? 0 : (editForm.price_to === "" || editForm.price_to === null ? null : Number(editForm.price_to)),
      organizer: editForm.organizer ? String(editForm.organizer) : "",
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
      list_of_activities: editForm.list_of_activities ? String(editForm.list_of_activities) : null,
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

  const getActivityExternalId = (activity: Activity) => {
    const raw = (activity as unknown as Record<string, unknown>).activity_id;
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "";
  };

  const getActivityImagePrompt = (activity: Activity) => {
    const raw = (activity as unknown as Record<string, unknown>).image_prompt;
    if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
    const externalId = getActivityExternalId(activity);
    return externalId ? (imagePromptByActivityId[externalId] ?? "") : "";
  };

  const openPromptModal = async () => {
    setActivePromptModalView("prompts");
    setEditingPrompt(false);
    void loadPromptUrls();
    setPromptModal(true);
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
      const res = await fetch("/api/admin/url-tracking?typ=zajecia");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Nie udało się pobrać URL-i.");

      if (Array.isArray(data) && data.length > 0) {
        hydratePromptUrlState(data as UrlTrackingRow[]);
        return;
      }

      const seedRows = promptSeedUrls.map((url) => ({ url, isDone: false }));
      const seedRes = await fetch("/api/admin/url-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typ: "zajecia", rows: seedRows }),
      });
      const seedData = await seedRes.json();
      if (!seedRes.ok) throw new Error(seedData?.error || "Nie udało się zapisać startowej listy URL-i.");
      hydratePromptUrlState(Array.isArray(seedData) ? seedData as UrlTrackingRow[] : []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Błąd synchronizacji listy URL.");
    } finally {
      setSyncingPromptUrls(false);
    }
  }, [hydratePromptUrlState, promptSeedUrls]);

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
        body: JSON.stringify({ typ: "zajecia", rows }),
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
        body: JSON.stringify({ typ: "zajecia", url, isDone: nextStatus === "completed" }),
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
        const params = new URLSearchParams({ typ: "zajecia", url });
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

  const buildActivitiesDataframe = async () => {
    setBuildingDataframe(true);
    setBuildResult(null);
    try {
      const res = await fetch("/api/admin/build-activities", { method: "POST" });
      const data = await res.json();
      setBuildResult({ ok: data.ok, message: data.ok ? data.output : data.error, failed: data.failed ?? 0, newActivities: data.newActivities ?? [] });
      if (data.ok && Array.isArray(data.newActivities)) {
        const promptMap: Record<string, string> = {};
        for (const row of data.newActivities) {
          if (row && typeof row.activity_id === "string" && typeof row.image_prompt === "string") {
            promptMap[row.activity_id] = row.image_prompt;
          }
        }
        if (Object.keys(promptMap).length > 0) {
          setImagePromptByActivityId((prev) => ({ ...prev, ...promptMap }));
        }
        await fetchActivities();
      }
    } catch (err) {
      setBuildResult({ ok: false, message: String(err) });
    } finally {
      setBuildingDataframe(false);
    }
  };

  const assignImageForActivity = async (activity: Activity) => {
    const activityId = getActivityExternalId(activity);
    if (!activityId) {
      alert("Brak activity_id. Najpierw wygeneruj przez Upload data.");
      return;
    }
    setAssigningImageId(activity.id);
    try {
      const res = await fetch("/api/admin/assign-image-by-activity-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activity.id, activity_id: activityId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(`Błąd: ${data.error || "Nie udało się przypisać obrazu"}`);
        return;
      }
      setActivities((prev) => prev.map((a) =>
        a.id === activity.id ? { ...a, image_url: data.image_url, image_cover: data.image_cover, image_thumb: data.image_thumb } : a,
      ));
    } catch (error) {
      alert(`Błąd: ${error instanceof Error ? error.message : "Nie udało się przypisać obrazu"}`);
    } finally {
      setAssigningImageId(null);
    }
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
          <button
            onClick={openPromptModal}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors"
          >
            <Sparkles size={14} />
            Prompt
          </button>
          <button
            onClick={buildActivitiesDataframe}
            disabled={buildingDataframe}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors disabled:opacity-50"
          >
            {buildingDataframe ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Upload data
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
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setSortBy("alpha")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", sortBy === "alpha" ? "bg-stone-700 text-white" : "bg-white border border-border text-muted hover:text-foreground hover:border-[#CCC]")}>A-Z</button>
          <button onClick={() => setSortBy("id")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", sortBy === "id" ? "bg-stone-700 text-white" : "bg-white border border-border text-muted hover:text-foreground hover:border-[#CCC]")}>#ID</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredActivities.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-white px-3 py-4 text-[12px] text-muted">
              Brak rekordów dla tego filtra.
            </div>
          ) : (
            [...filteredActivities]
              .sort((a, b) => {
                if (sortBy === "id") return a.id.localeCompare(b.id);
                return a.title.localeCompare(b.title, "pl");
              })
              .map((activity, index) => {
                        const isDraft = activity.status !== "published";
                        const isEditing = editing === activity.id;
                        return (
                          <div key={activity.id} className={cn("rounded-lg border border-border/70", isDraft ? "bg-stone-100 opacity-70" : "bg-white")}>
                            <div className="flex items-center gap-2.5 px-3 py-2.5">
                              <span className="shrink-0 w-6 text-center text-[11px] font-mono text-muted-foreground">{index + 1}</span>
                              {thumbUrl(activity.image_thumb, activity.image_url) ? (
                                <img src={thumbUrl(activity.image_thumb, activity.image_url) || ""} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
                              ) : (
                                <span className="w-16 h-16 rounded bg-stone-100 shrink-0 flex items-center justify-center text-[10px] text-stone-400">—</span>
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
                                {getActivityExternalId(activity) && (
                                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">ACTIVITY ID: {getActivityExternalId(activity)}</p>
                                )}
                              </div>

                              <button onClick={() => startEditing(activity)} className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Edytuj">
                                <Pencil size={13} />
                              </button>

                              <button
                                onClick={() => {
                                  const prompt = getActivityImagePrompt(activity);
                                  if (!prompt) { alert("Brak image promptu dla tych zajęć."); return; }
                                  setPromptPreview({ activityId: getActivityExternalId(activity) || "(brak activity_id)", title: activity.title, prompt });
                                }}
                                className="p-1 rounded hover:bg-accent text-muted transition-colors"
                                title="Pokaż image prompt"
                              >
                                <Sparkles size={13} />
                              </button>

                              <button onClick={() => assignImageForActivity(activity)} className="p-1 rounded hover:bg-accent text-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Przypisz obraz" disabled={assigningImageId === activity.id}>
                                {assigningImageId === activity.id ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                              </button>

                              <button onClick={() => toggleFeatured(activity)} className={cn("p-1 rounded transition-colors", activity.is_featured ? "text-amber-500 hover:bg-amber-50" : "text-muted hover:bg-accent")} title="Wyróżnij">
                                <Star size={13} fill={activity.is_featured ? "currentColor" : "none"} />
                              </button>

                              {activity.source_url && (
                                <a href={activity.source_url} target="_blank" rel="noopener" className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Zrodlo">
                                  <ExternalLink size={13} />
                                </a>
                              )}

                              {getEffectiveStatus(activity) === "outdated" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700">Outdated</span>
                              ) : (
                                <button onClick={() => toggleStatus(activity)} className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors", activity.status === "published" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-rose-100 text-rose-700 hover:bg-rose-200")}>
                                  {activity.status === "published" ? "Published" : "Draft"}
                                </button>
                              )}

                              <button onClick={() => handleDelete(activity.id)} className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Usun">
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {isEditing && (
                              <div className="px-3 pb-3 pt-2 border-t border-border/50">
                                <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Opis zajęć</p>
                                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                    <div className="md:col-span-2">
                                      <label className={labelClass}>Tytuł</label>
                                      <input className={inputClass} value={(editForm.title as string) || ""} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className={labelClass}>ACTIVITY ID</label>
                                      <input
                                        className={`${inputClass} font-mono`}
                                        value={(editForm.activity_id as string) || ""}
                                        onChange={(e) => setEditForm((current) => ({ ...current, activity_id: e.target.value }))}
                                        placeholder="ACTIVITY-000001"
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className={labelClass}>Organizator</label>
                                      <OrganizerCombobox
                                        organizers={organizers}
                                        value={(editForm.organizer as string) || null}
                                        onChange={(value) => {
                                          const organizer = organizers.find((item) => item.id === value);
                                          setEditForm((current) => ({
                                            ...current,
                                            organizer: organizer ? organizer.organizer_name : (value || ""),
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
                                  </div>
                                  <div className="grid grid-cols-1 gap-3">
                                    <div>
                                      <label className={labelClass}>Lista Aktywności</label>
                                      <input className={inputClass} value={(editForm.list_of_activities as string) || ""} onChange={(e) => setEditForm((c) => ({ ...c, list_of_activities: e.target.value || null }))} placeholder="e.g. Piłka nożna;Taniec;Pływanie" />
                                    </div>
                                  </div>
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
                                      onTypeLevel1Change={(value) => setEditForm((current) => ({ ...current, type_lvl_1: value }))}
                                      onTypeLevel2Change={(value) => setEditForm((current) => ({ ...current, type_lvl_2: value }))}
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
              })
          )}
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
              <p className="text-[12px] text-muted-foreground">ACTIVITY ID: {promptPreview.activityId} — {promptPreview.title}</p>
              <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed bg-stone-50 rounded-lg p-3 border border-border">
                {promptPreview.prompt}
              </pre>
            </div>
          </div>
        </div>
      )}

      {promptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col mx-4">
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
                  <div className="rounded-lg border border-border">
                    <div className="px-3 py-2 border-b border-border bg-accent/20 text-[11px] font-semibold text-muted-foreground">Widok tekstowy (zaznacz i kopiuj Ctrl+C)</div>
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nieoznaczone</p>
                        <textarea
                          readOnly
                          spellCheck={false}
                          value={inProgressPromptUrlEntries.map(({ url }) => url).filter((url) => url.trim().length > 0).join("\n")}
                          className="w-full min-h-[180px] max-h-[280px] resize-y rounded border border-border bg-white px-2 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Zrobione</p>
                        <textarea
                          readOnly
                          spellCheck={false}
                          value={completedPromptUrlEntries.map(({ url }) => url).filter((url) => url.trim().length > 0).join("\n")}
                          className="w-full min-h-[180px] max-h-[280px] resize-y rounded border border-border bg-white px-2 py-1.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </div>
                    </div>
                  </div>
                  {promptUrlRows.length === 0 ? (
                    <div className="rounded-lg border border-border divide-y divide-border/60">
                      <p className="px-3 py-3 text-[12px] text-muted">Brak URL-i do pokazania.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border">
                        <div className="px-3 py-2 border-b border-border bg-accent/20 text-[11px] font-semibold text-muted-foreground">W trakcie</div>
                        <div className="divide-y divide-border/60">
                          {inProgressPromptUrlEntries.map(({ url, index }) => (
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
                          {completedPromptUrlEntries.length === 0 ? (
                            <p className="px-3 py-3 text-[12px] text-muted">Brak gotowych URL-i.</p>
                          ) : (
                            completedPromptUrlEntries.map(({ url, index }) => (
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
                    </div>
                  )}
                </div>
                <div className="flex justify-between gap-2 px-5 py-4 border-t border-border">
                  <p className="text-[11px] text-muted-foreground self-center">Zaznacz dowolne linie w polu tekstowym i skopiuj skrótem Ctrl+C.</p>
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
                    {buildResult.newActivities?.length
                      ? `Przetworzono ${buildResult.newActivities.length} zajęć.`
                      : "Brak nowych zajęć do przetworzenia."}
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