"use client";

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import {
  Plus, Pencil, Trash2, RefreshCw,
  ChevronDown, ChevronUp, X,
  Loader2, Save, ExternalLink,
  Star, MapPin, Copy,
  Sparkles, Play, ImagePlus,
} from "lucide-react";
import { CATEGORY_ICONS, CATEGORY_LABELS, DISTRICT_LIST } from "@/lib/mock-data";
import { PROMPTS } from "@/lib/prompts";
import { normalizeDistrictName } from "@/lib/districts";
import { cn, formatDateShort, formatHourMinuteRange, formatPriceRange, slugify, thumbUrl, toHourMinute, withCacheBust } from "@/lib/utils";
import type { Event } from "@/types/database";
import { ImageSection } from "@/components/admin/image-section";
import { TaxonomyFields } from "@/components/admin/taxonomy-fields";
import { resolveCategoryLevel1Name, resolveCategoryLevel2Name, resolveCategoryLevel3Name, resolveTypeLevel1Id, resolveTypeLevel2Id } from "@/lib/admin-taxonomy";
import { useAdminTaxonomy } from "@/lib/use-admin-taxonomy";

type DerivedEventStatus = Event["status"] | "outdated";
type EventListFilter = "all" | "published" | "draft" | "outdated";
type EventGroupingMode = "type" | "organizer";
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

const MiniMapLazy = lazy(() => import("../miejsca/mini-map").then((module) => ({ default: module.MiniMap })));

// ═══════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════

export default function AdminSourcesPage() {
  return <AdminCanonicalEventsPanel />;
}

function AdminCanonicalEventsPanel() {
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options, loading: taxonomyLoading } = useAdminTaxonomy();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EventListFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"alpha" | "id">("alpha");
  const [groupingMode, setGroupingMode] = useState<EventGroupingMode>("organizer");
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
    const [buildResult, setBuildResult] = useState<{ ok: boolean; message: string; failed?: number; newEvents?: { event_id: string; title: string; image_prompt: string }[] } | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [assigningEventImageId, setAssigningEventImageId] = useState<string | null>(null);
  const [promptPreview, setPromptPreview] = useState<{ title: string; eventId: string; prompt: string } | null>(null);
  const [imagePromptByEventId, setImagePromptByEventId] = useState<Record<string, string>>({});

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/events");
    const data = await res.json();
    if (Array.isArray(data)) {
      setEvents(withShuffleOrder(data.map((event) => ({ ...event, content_type: "event" }))));
    }
    setLoading(false);
  }, []);

  const getEventExternalId = (event: Event) => {
    const raw = (event as unknown as Record<string, unknown>).event_id;
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "";
  };

  const getEventImagePrompt = (event: Event) => {
    const raw = (event as unknown as Record<string, unknown>).image_prompt;
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }

    const externalId = getEventExternalId(event);
    return externalId ? (imagePromptByEventId[externalId] ?? "") : "";
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const promptSeedUrls = useMemo(() => {
    const urls = new Set<string>();
    for (const event of events) {
      if (event.source_url && event.source_url.trim().length > 0) urls.add(event.source_url.trim());
      if (event.facebook_url && event.facebook_url.trim().length > 0) urls.add(event.facebook_url.trim());
    }
    return Array.from(urls).sort((a, b) => a.localeCompare(b, "pl"));
  }, [events]);

  const completedPromptUrlCount = useMemo(
    () => promptUrlRows.filter((_, index) => promptUrlStatuses[index] === "completed").length,
    [promptUrlRows, promptUrlStatuses]
  );

  const visibleEvents = useMemo(() => events.filter((event) => event.status !== "deleted"), [events]);

  const getEffectiveStatus = useCallback((event: Event): DerivedEventStatus => {
    const today = new Date().toISOString().slice(0, 10);
    const endDate = event.date_end?.slice(0, 10);
    if (event.status === "published" && endDate && endDate < today) return "outdated";
    return event.status;
  }, []);

  const statusOrder: Record<DerivedEventStatus, number> = {
    draft: 0,
    published: 1,
    outdated: 2,
    cancelled: 3,
    deleted: 4,
  };

  const getEventGroupKey = useCallback((event: Partial<Event> | Record<string, unknown>) => {
    return typeof event.category_lvl_1 === "string"
      ? event.category_lvl_1
      : typeof event.main_category === "string"
        ? event.main_category
        : typeof event.category_lvl_2 === "string"
          ? event.category_lvl_2
          : typeof event.category === "string"
            ? event.category
            : UNCATEGORIZED_GROUP;
  }, []);

  const getOrganizerGroupKey = useCallback((event: Partial<Event> | Record<string, unknown>) => {
    if (typeof event.organizer === "string" && event.organizer.trim().length > 0) {
      return `name:${event.organizer.trim().toLowerCase()}`;
    }

    return UNASSIGNED_ORGANIZER_GROUP;
  }, []);

  const organizerGroupMeta = useMemo(() => {
    const meta = new Map<string, { label: string; icon: string }>();

    for (const event of visibleEvents) {
      const organizerName = typeof event.organizer === "string" && event.organizer.trim().length > 0
        ? event.organizer.trim()
        : "Bez organizatora";
      const key = getOrganizerGroupKey(event);
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
  }, [visibleEvents, getOrganizerGroupKey]);

  const getEventGroupLabel = useCallback((group: string) => {
    if (group === UNCATEGORIZED_GROUP) return "Bez kategorii";
    return CATEGORY_LABELS[group as keyof typeof CATEGORY_LABELS] ?? group;
  }, []);

  const getEventGroupIcon = useCallback((group: string) => {
    if (group === UNCATEGORIZED_GROUP) return "📅";
    return CATEGORY_ICONS[group as keyof typeof CATEGORY_ICONS] ?? "📅";
  }, []);

  const sortEventGroupKeys = useCallback((keys: string[]) => {
    return [...keys].sort((left, right) => {
      if (left === UNCATEGORIZED_GROUP) return 1;
      if (right === UNCATEGORIZED_GROUP) return -1;
      return getEventGroupLabel(left).localeCompare(getEventGroupLabel(right), "pl");
    });
  }, [getEventGroupLabel]);

  const getActiveGroupKey = useCallback((event: Partial<Event> | Record<string, unknown>) => {
    return groupingMode === "organizer" ? getOrganizerGroupKey(event) : getEventGroupKey(event);
  }, [groupingMode, getOrganizerGroupKey, getEventGroupKey]);

  const getActiveGroupLabel = useCallback((group: string) => {
    if (groupingMode === "organizer") {
      return organizerGroupMeta.get(group)?.label ?? "Bez organizatora";
    }
    return getEventGroupLabel(group);
  }, [groupingMode, organizerGroupMeta, getEventGroupLabel]);

  const getActiveGroupIcon = useCallback((group: string) => {
    if (groupingMode === "organizer") {
      return organizerGroupMeta.get(group)?.icon ?? "🏢";
    }
    return getEventGroupIcon(group);
  }, [groupingMode, organizerGroupMeta, getEventGroupIcon]);

  const sortActiveGroupKeys = useCallback((keys: string[]) => {
    if (groupingMode === "organizer") {
      return [...keys].sort((left, right) => {
        if (left === UNASSIGNED_ORGANIZER_GROUP) return 1;
        if (right === UNASSIGNED_ORGANIZER_GROUP) return -1;
        return getActiveGroupLabel(left).localeCompare(getActiveGroupLabel(right), "pl");
      });
    }
    return sortEventGroupKeys(keys);
  }, [groupingMode, getActiveGroupLabel, sortEventGroupKeys]);

  const filteredEvents = useMemo(() => {
    const scopedEvents = categoryFilter ? visibleEvents.filter((event) => getActiveGroupKey(event) === categoryFilter) : visibleEvents;
    if (statusFilter === "all") return scopedEvents;
    if (statusFilter === "draft") {
      return scopedEvents.filter((event) => {
        const effectiveStatus = getEffectiveStatus(event);
        return effectiveStatus === "draft" || effectiveStatus === "cancelled";
      });
    }
    return scopedEvents.filter((event) => getEffectiveStatus(event) === statusFilter);
  }, [visibleEvents, categoryFilter, statusFilter, getEffectiveStatus, getActiveGroupKey]);

  const allGroupKeys = useMemo(() => {
    const groups = new Set<string>();
    visibleEvents.forEach((event) => groups.add(getActiveGroupKey(event)));
    return sortActiveGroupKeys(Array.from(groups));
  }, [visibleEvents, getActiveGroupKey, sortActiveGroupKeys]);

  const groupedEvents = useMemo(() => (
    allGroupKeys.map((category) => ({
      category,
      label: getActiveGroupLabel(category),
      items: filteredEvents
        .filter((event) => getActiveGroupKey(event) === category)
        .sort((a, b) => {
          if (sortBy === "id") return a.id.localeCompare(b.id);
          return a.title.localeCompare(b.title, "pl");
        }),
    }))
  ), [allGroupKeys, filteredEvents, getEffectiveStatus, getActiveGroupKey, getActiveGroupLabel, sortBy]);
  const displayedGroups = useMemo(
    () => groupedEvents.filter(({ category }) => !categoryFilter || category === categoryFilter),
    [groupedEvents, categoryFilter]
  );

  const publishedCount = useMemo(() => visibleEvents.filter((event) => getEffectiveStatus(event) === "published").length, [visibleEvents, getEffectiveStatus]);
  const draftCount = useMemo(() => visibleEvents.filter((event) => getEffectiveStatus(event) === "draft" || getEffectiveStatus(event) === "cancelled").length, [visibleEvents, getEffectiveStatus]);
  const outdatedCount = useMemo(() => visibleEvents.filter((event) => getEffectiveStatus(event) === "outdated").length, [visibleEvents, getEffectiveStatus]);
  const categoryStats = useMemo(() => Object.fromEntries(
    allGroupKeys.map((category) => {
      const categoryEvents = visibleEvents.filter((event) => getActiveGroupKey(event) === category);
      const published = categoryEvents.filter((event) => getEffectiveStatus(event) === "published").length;
      const draft = categoryEvents.filter((event) => {
        const effectiveStatus = getEffectiveStatus(event);
        return effectiveStatus === "draft" || effectiveStatus === "cancelled";
      }).length;
      const outdated = categoryEvents.filter((event) => getEffectiveStatus(event) === "outdated").length;
      return [category, { all: categoryEvents.length, published, draft, outdated }];
    })
  ), [allGroupKeys, visibleEvents, getEffectiveStatus, getActiveGroupKey]);
  const visibleCategoryKeys = useMemo(() => displayedGroups.map(({ category }) => category), [displayedGroups]);
  const hasExpandedCategories = useMemo(() => visibleCategoryKeys.some((category) => !collapsedCategories[category]), [visibleCategoryKeys, collapsedCategories]);

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleAllCategories = () => {
    if (visibleCategoryKeys.length === 0) return;
    setCollapsedCategories(
      Object.fromEntries(visibleCategoryKeys.map((category) => [category, hasExpandedCategories]))
    );
  };

  const toggleStatusFilter = (filter: EventListFilter) => {
    const nextFilter = statusFilter === filter ? "all" : filter;
    setCategoryFilter(null);
    setStatusFilter(nextFilter);
    const nextCollapsed = Object.fromEntries(
      allGroupKeys.map((category) => {
        const matchingItems = visibleEvents.filter((event) => {
          if (getActiveGroupKey(event) !== category) return false;
          if (nextFilter === "all") return true;
          if (nextFilter === "draft") {
            const effectiveStatus = getEffectiveStatus(event);
            return effectiveStatus === "draft" || effectiveStatus === "cancelled";
          }
          return getEffectiveStatus(event) === nextFilter;
        });
        return [category, matchingItems.length === 0];
      })
    );
    setCollapsedCategories(nextCollapsed);
  };

  useEffect(() => {
    setCategoryFilter(null);
    setCollapsedCategories({});
  }, [groupingMode]);

  const toggleCategoryStatusFilter = (category: string, filter: EventListFilter) => {
    if (categoryFilter === category && statusFilter === filter) {
      setCategoryFilter(null);
      setStatusFilter("all");
      return;
    }
    setCategoryFilter(category);
    setStatusFilter(filter);
    setCollapsedCategories((prev) => ({ ...prev, [category]: false }));
  };

  const updateField = (key: string, value: unknown) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const startEditing = (event: Event) => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setEditing(event.id);
    setEditForm({
      event_id: getEventExternalId(event),
      title: event.title,
      slug: event.slug,
      description_short: event.description_short,
      description_long: event.description_long,
      type_lvl_1: event.type_lvl_1 ?? event.type_id ?? null,
      type_lvl_2: event.type_lvl_2 ?? event.subtype_id ?? null,
      category_lvl_2: event.category_lvl_2 ?? event.category,
      date_start: event.date_start,
      date_end: event.date_end,
      time_start: toHourMinute(event.time_start),
      time_end: toHourMinute(event.time_end),
      age_min: event.age_min,
      age_max: event.age_max,
      price_from: event.price_from,
      price_to: event.price_to,
      is_free: event.is_free,
      district: event.district,
      street: event.street,
      postcode: event.postcode ?? "",
      city: event.city,
      lat: event.lat,
      lng: event.lng,
      note: event.note ?? "",
      organizer: event.organizer,
      source_url: event.source_url,
      facebook_url: event.facebook_url ?? "",
      category_lvl_1: event.category_lvl_1 ?? event.main_category ?? null,
      category_lvl_3: event.category_lvl_3 ?? event.subcategory ?? null,
      is_featured: event.is_featured,
      status: event.status,
      likes: event.likes,
      dislikes: event.dislikes,
    });
  };

  const createEvent = async () => {
    const now = Date.now();
    const title = "Nowe wydarzenie";
    const payload = {
      content_type: "event",
      title,
      slug: slugify(`${title}-${now}`),
      description_short: "Opis wydarzenia",
      description_long: "",
      image_url: null,
      date_start: new Date().toISOString().slice(0, 10),
      date_end: null,
      time_start: null,
      time_end: null,
      age_min: null,
      age_max: null,
      price_from: null,
      price_to: null,
      is_free: false,
      category: "inne",
      district: "Inne",
      street: "",
      postcode: null,
      city: "Kraków",
      lat: null,
      lng: null,
      note: null,
      organizer: null,
      source_url: null,
      facebook_url: null,
      is_featured: false,
      status: "draft",
    };

    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data?.id) {
      const newEvent = { ...data, content_type: "event" } as Event;
      setEvents((prev) => [newEvent, ...prev]);
      startEditing(newEvent);
    } else {
      alert(`Błąd: ${data.error || "Nie udało się utworzyć wydarzenia"}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno chcesz usunąć?")) return;
    await fetch("/api/admin/events", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  const toggleStatus = async (event: Event) => {
    const newStatus = event.status === "published" ? "draft" : "published";
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: event.id, status: newStatus }),
    });
    if (res.ok) {
      setEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, status: newStatus } : item)));
    }
  };

  const toggleFeatured = async (event: Event) => {
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: event.id, is_featured: !event.is_featured }),
    });
    if (res.ok) {
      setEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, is_featured: !item.is_featured } : item)));
    }
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

  const saveEdit = async (id: string) => {
    let newImageCover: string | null = null;

    if (pendingFile) {
      setUploadingImage(id);
      try {
        const formData = new FormData();
        formData.append("file", pendingFile);
        formData.append("id", id);
        formData.append("target", "events");
        const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
        const data = await res.json();
        if (data.image_cover) {
          newImageCover = `${data.image_cover.split("?")[0]}?t=${Date.now()}`;
        } else {
          alert(`Błąd obrazka: ${data.error || "Nie udało się"}`);
        }
      } catch {
        alert("Błąd połączenia przy wgrywaniu obrazka");
      }
      setUploadingImage(null);
    }

    const priceFromValue = editForm.price_from === "" || editForm.price_from === null ? null : Number(editForm.price_from);
    const priceToValue = editForm.price_to === "" || editForm.price_to === null ? null : Number(editForm.price_to);
    const slugValue = String(editForm.slug || "").trim();

    const updates: Record<string, unknown> = {
      event_id: editForm.event_id ? String(editForm.event_id).trim() : null,
      title: String(editForm.title || ""),
      slug: slugValue || slugify(String(editForm.title || "")),
      description_short: String(editForm.description_short || ""),
      description_long: String(editForm.description_long || ""),
      type_lvl_1: editForm.type_lvl_1 ? String(editForm.type_lvl_1) : null,
      type_lvl_2: editForm.type_lvl_2 ? String(editForm.type_lvl_2) : null,
      category_lvl_2: editForm.category_lvl_2,
      date_start: editForm.date_start,
      date_end: editForm.date_end || null,
      time_start: toHourMinute(String(editForm.time_start || "")) || null,
      time_end: toHourMinute(String(editForm.time_end || "")) || null,
      age_min: editForm.age_min === "" || editForm.age_min === null ? null : Number(editForm.age_min),
      age_max: editForm.age_max === "" || editForm.age_max === null ? null : Number(editForm.age_max),
      price_from: Number.isFinite(priceFromValue) ? priceFromValue : null,
      price_to: Number.isFinite(priceToValue) ? priceToValue : null,
      is_free: Boolean(editForm.is_free),
      district: editForm.district,
      street: String(editForm.street || "").trim(),
      postcode: editForm.postcode ? String(editForm.postcode).trim() : null,
      city: String(editForm.city || "Kraków").trim() || "Kraków",
      lat: editForm.lat === "" || editForm.lat === null ? null : Number(editForm.lat),
      lng: editForm.lng === "" || editForm.lng === null ? null : Number(editForm.lng),
      note: editForm.note ? String(editForm.note) : null,
      organizer: editForm.organizer ? String(editForm.organizer).trim() : null,
      source_url: editForm.source_url ? String(editForm.source_url) : null,
      facebook_url: editForm.facebook_url ? String(editForm.facebook_url) : null,
      category_lvl_1: editForm.category_lvl_1 ? String(editForm.category_lvl_1) : null,
      category_lvl_3: editForm.category_lvl_3 ? String(editForm.category_lvl_3) : null,
      is_featured: Boolean(editForm.is_featured),
      status: editForm.status,
      likes: Number(editForm.likes) || 0,
      dislikes: Number(editForm.dislikes) || 0,
    };

    if (newImageCover) {
      updates.image_cover = newImageCover;
      updates.image_set = null;
    }

    let res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    let data = await res.json();

    if (!res.ok && data.error?.includes("facebook_url")) {
      const { facebook_url: _facebookUrl, ...updatesWithoutFacebook } = updates;
      res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatesWithoutFacebook }),
      });
      data = await res.json();
    }

    if (!res.ok) {
      alert(`Błąd zapisu: ${data.error || "Nieznany błąd"}`);
      return;
    }

    const updatedEvent = data.updated as Record<string, unknown> | undefined;
    setEvents((prev) => prev.map((event) => (
      event.id === id
        ? (updatedEvent
            ? ({
                ...event,
                ...updatedEvent,
                image_cover: typeof updatedEvent.image_cover === "string" ? withCacheBust(updatedEvent.image_cover) : updatedEvent.image_cover,
                image_thumb: typeof updatedEvent.image_thumb === "string" ? withCacheBust(updatedEvent.image_thumb) : updatedEvent.image_thumb,
              } as Event)
          : { ...event, ...updates, ...(newImageCover ? { image_cover: newImageCover } : {}) } as Event)
        : event
    )));
    clearPendingFile();
    setEditing(null);
    setEditForm({});
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
      const res = await fetch("/api/admin/url-tracking?typ=wydarzenia");
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
        body: JSON.stringify({ typ: "wydarzenia", rows: seedRows }),
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
        body: JSON.stringify({ typ: "wydarzenia", rows }),
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
        body: JSON.stringify({ typ: "wydarzenia", url, isDone: nextStatus === "completed" }),
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
        const params = new URLSearchParams({ typ: "wydarzenia", url });
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

  const showImagePrompt = (event: Event) => {
    const prompt = getEventImagePrompt(event);
    const eventId = getEventExternalId(event);

    if (!prompt) {
      alert("Brak image promptu dla tego wydarzenia.");
      return;
    }

    setPromptPreview({
      title: event.title,
      eventId: eventId || "(brak event_id)",
      prompt,
    });
  };

  const assignImageForEvent = async (event: Event) => {
    const eventId = getEventExternalId(event);
    if (!eventId) {
      alert("To wydarzenie nie ma event_id. Najpierw wygeneruj przez Upload data.");
      return;
    }

    setAssigningEventImageId(event.id);
    try {
      const res = await fetch("/api/admin/assign-image-by-event-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, event_id: eventId }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Nie udało się przypisać obrazu.");
        return;
      }

      setEvents((prev) => prev.map((item) => (
        item.id === event.id
          ? {
            ...item,
            image_cover: withCacheBust(data.image_cover) ?? data.image_cover,
            image_thumb: withCacheBust(data.image_thumb) ?? data.image_thumb,
            image_set: data.image_set ?? item.image_set,
            status: "draft",
          }
          : item
      )));
      alert(`Obraz przypisany dla ${eventId}`);
    } catch {
      alert("Błąd połączenia podczas przypisywania obrazu.");
    } finally {
      setAssigningEventImageId(null);
    }
  };

  const buildEventsDataframe = async () => {
    setBuildingDataframe(true);
    setBuildResult(null);
    try {
      const res = await fetch("/api/admin/build-events", { method: "POST" });
      const data = await res.json();
        setBuildResult({ ok: data.ok, message: data.ok ? data.output : data.error, failed: data.failed ?? 0, newEvents: data.newEvents ?? [] });

      if (data.ok && Array.isArray(data.newEvents)) {
        const promptMap: Record<string, string> = {};
        for (const row of data.newEvents) {
          if (row && typeof row.event_id === "string" && typeof row.image_prompt === "string") {
            promptMap[row.event_id] = row.image_prompt;
          }
        }
        if (Object.keys(promptMap).length > 0) {
          setImagePromptByEventId((prev) => ({ ...prev, ...promptMap }));
        }
        await fetchEvents();
      }
    } catch (err) {
      setBuildResult({ ok: false, message: String(err) });
    } finally {
      setBuildingDataframe(false);
    }
  };

  const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
  const labelClass = "block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Wydarzenia</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={openPromptModal}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors"
          >
            <Sparkles size={14} />
            Prompt
          </button>
          <button
            onClick={buildEventsDataframe}
            disabled={buildingDataframe}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors disabled:opacity-50"
          >
            {buildingDataframe ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            Upload data
          </button>
          <button onClick={createEvent} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-foreground rounded-xl hover:bg-stone-700 transition-colors">
            <Plus size={14} />
            Dodaj
          </button>
          <button onClick={fetchEvents} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="inline-flex items-center rounded-lg border border-border bg-white p-0.5">
          <button
            type="button"
            onClick={() => setGroupingMode("type")}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              groupingMode === "type"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Po typie
          </button>
          <button
            type="button"
            onClick={() => setGroupingMode("organizer")}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
              groupingMode === "organizer"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Po organizatorze
          </button>
        </div>

        <button onClick={() => toggleStatusFilter("all")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>{visibleEvents.length} wydarzeń</button>
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
          {displayedGroups.map(({ category, label, items }) => {
            const expanded = !collapsedCategories[category];
            const stats = categoryStats[category] ?? { all: 0, published: 0, draft: 0, outdated: 0 };
            return (
              <div key={category}>
                <div className="w-full flex items-center gap-2 mb-2 rounded-md px-1.5 py-1 hover:bg-accent/50 transition-colors">
                  <button type="button" onClick={() => toggleCategory(category)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground rotate-180" />}
                    <span className="text-lg">{getActiveGroupIcon(category)}</span>
                    <h2 className="text-[13px] font-semibold text-foreground">{label}</h2>
                  </button>
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <button type="button" onClick={() => toggleCategoryStatusFilter(category, "all")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", categoryFilter === category && statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>{stats.all} all</button>
                    <button type="button" onClick={() => toggleCategoryStatusFilter(category, "published")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", categoryFilter === category && statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>{stats.published} published</button>
                    <button type="button" onClick={() => toggleCategoryStatusFilter(category, "draft")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", stats.draft > 0 ? (categoryFilter === category && statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200") : (categoryFilter === category && statusFilter === "draft" ? "bg-stone-300 text-stone-700" : "bg-stone-200 text-stone-500 hover:bg-stone-300"))}>{stats.draft} draft</button>
                    <button type="button" onClick={() => toggleCategoryStatusFilter(category, "outdated")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", categoryFilter === category && statusFilter === "outdated" ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-700 hover:bg-amber-200")}>{stats.outdated} outdated</button>
                  </div>
                </div>

                {expanded && (
                  items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 bg-white px-3 py-4 text-[12px] text-muted">
                      Brak rekordów dla tego filtra.
                    </div>
                  ) : (
                  <div className="space-y-1.5">
                    {items.map((event, index) => {
                      const isEditing = editing === event.id;
                      const effectiveStatus = getEffectiveStatus(event);
                      const isDraft = effectiveStatus !== "published";
                      return (
                        <div key={event.id} className={cn("rounded-lg border border-border/70", isDraft ? "bg-stone-100 opacity-70" : "bg-white")}>
                          <div className="flex items-center gap-2.5 px-3 py-2.5">
                            <span className="shrink-0 w-6 text-center text-[11px] font-mono text-muted-foreground">{index + 1}</span>
                            {thumbUrl(event.image_thumb, event.image_url) ? (
                              <img src={thumbUrl(event.image_thumb, event.image_url) || ""} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
                            ) : (
                              <span className="w-16 h-16 rounded bg-stone-100 shrink-0 flex items-center justify-center text-[10px] text-stone-400">—</span>
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-foreground truncate">{event.title}</p>
                              {getEventExternalId(event) ? (
                                <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">EVENT ID: {getEventExternalId(event)}</p>
                              ) : null}
                              <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5 flex-wrap">
                                <span>{CATEGORY_LABELS[event.category as keyof typeof CATEGORY_LABELS] ?? event.category}</span>
                                <span className="opacity-40">·</span>
                                <span>{formatDateShort(event.date_start)}{event.date_end ? ` - ${formatDateShort(event.date_end)}` : ""}</span>
                                {formatHourMinuteRange(event.time_start, event.time_end) && (
                                  <>
                                    <span className="opacity-40">·</span>
                                    <span>{formatHourMinuteRange(event.time_start, event.time_end)}</span>
                                  </>
                                )}
                                <span className="opacity-40">·</span>
                                <span>{formatPriceRange(event.price_from, event.price_to, event.is_free)}</span>
                                <span className="opacity-40">·</span>
                                <span className="truncate max-w-[180px]">{[event.street, event.city].filter(Boolean).join(", ") || event.district}</span>
                              </div>
                            </div>

                            <button onClick={() => startEditing(event)} className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Edytuj">
                              <Pencil size={13} />
                            </button>

                            <button
                              onClick={() => showImagePrompt(event)}
                              className="p-1 rounded hover:bg-accent text-muted transition-colors"
                              title="Pokaż image prompt"
                            >
                              <Sparkles size={13} />
                            </button>

                            <button
                              onClick={() => assignImageForEvent(event)}
                              className="p-1 rounded hover:bg-accent text-muted transition-colors"
                              title="Przypisz obraz po Event ID"
                              disabled={assigningEventImageId === event.id}
                            >
                              {assigningEventImageId === event.id ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                            </button>

                            <button onClick={() => toggleFeatured(event)} className={cn("p-1 rounded transition-colors", event.is_featured ? "text-amber-500 hover:bg-amber-50" : "text-muted hover:bg-accent")} title="Wyróżnij">
                              <Star size={13} fill={event.is_featured ? "currentColor" : "none"} />
                            </button>

                            {event.source_url && (
                              <a href={event.source_url} target="_blank" rel="noopener" className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Źródło">
                                <ExternalLink size={13} />
                              </a>
                            )}

                            {effectiveStatus === "outdated" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700">
                                Outdated
                              </span>
                            ) : (
                              <button onClick={() => toggleStatus(event)} className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors",
                                event.status === "published"
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : event.status === "cancelled"
                                    ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                    : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                              )}>
                                {event.status === "published" ? "Published" : event.status === "cancelled" ? "Cancelled" : "Draft"}
                              </button>
                            )}

                            <button onClick={() => handleDelete(event.id)} className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Usuń">
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {isEditing && (
                            <div className="px-3 pb-3 pt-2 border-t border-border/50">
                              <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Opis wydarzenia</p>
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                  <div className="md:col-span-2">
                                    <label className={labelClass}>Tytuł</label>
                                    <input className={inputClass} value={(editForm.title as string) || ""} onChange={(e) => updateField("title", e.target.value)} />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className={labelClass}>EVENT ID</label>
                                    <input
                                      className={`${inputClass} font-mono`}
                                      value={(editForm.event_id as string) || ""}
                                      onChange={(e) => updateField("event_id", e.target.value)}
                                      placeholder="EVENT-000001"
                                    />
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className={labelClass}>Organizator</label>
                                    <input
                                      className={inputClass}
                                      value={(editForm.organizer as string) || ""}
                                      onChange={(e) => updateField("organizer", e.target.value)}
                                      placeholder="np. Fundacja Performat"
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
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Szczegóły wydarzenia</p>
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
                                      <label className={labelClass}>Godzina od</label>
                                      <input type="time" step={60} className={inputClass} value={(editForm.time_start as string) || ""} onChange={(e) => updateField("time_start", e.target.value || null)} />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Godzina do</label>
                                      <input type="time" step={60} className={inputClass} value={(editForm.time_end as string) || ""} onChange={(e) => updateField("time_end", e.target.value || null)} />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div>
                                      <label className={labelClass}>Wiek od</label>
                                      <input type="number" min={0} max={18} className={inputClass} value={editForm.age_min === null ? "" : String(editForm.age_min ?? "")} onChange={(e) => updateField("age_min", e.target.value ? Number(e.target.value) : null)} />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Wiek do</label>
                                      <input type="number" min={0} max={18} className={inputClass} value={editForm.age_max === null ? "" : String(editForm.age_max ?? "")} onChange={(e) => updateField("age_max", e.target.value ? Number(e.target.value) : null)} />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Cena od</label>
                                      <input type="number" min={0} step="0.01" value={editForm.price_from === null ? "" : String(editForm.price_from ?? "")} onChange={(e) => {
                                        const value = e.target.value ? Number(e.target.value) : null;
                                        updateField("price_from", value);
                                      }} disabled={Boolean(editForm.is_free)} className={cn(inputClass, Boolean(editForm.is_free) && "bg-accent/40 text-muted cursor-not-allowed")} />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Cena do</label>
                                      <input type="number" min={0} step="0.01" value={editForm.price_to === null ? "" : String(editForm.price_to ?? "")} onChange={(e) => {
                                        const value = e.target.value ? Number(e.target.value) : null;
                                        updateField("price_to", value);
                                      }} disabled={Boolean(editForm.is_free)} className={cn(inputClass, Boolean(editForm.is_free) && "bg-accent/40 text-muted cursor-not-allowed")} />
                                    </div>
                                    <div className="md:col-span-4">
                                      <label className="flex items-center gap-2 text-[12px] cursor-pointer pt-2">
                                        <input type="checkbox" checked={Boolean(editForm.is_free)} onChange={(e) => {
                                          updateField("is_free", e.target.checked);
                                          if (e.target.checked) {
                                            updateField("price_from", null);
                                            updateField("price_to", null);
                                          }
                                        }} className="rounded border-border" />
                                        Bezpłatne wydarzenie
                                      </label>
                                    </div>
                                  </div>
                                  <div className="md:col-span-6">
                                    <label className={labelClass}>Notatka</label>
                                    <textarea rows={4} className={inputClass} value={(editForm.note as string) || ""} onChange={(e) => updateField("note", e.target.value)} placeholder="Dodatkowe informacje o wydarzeniu." />
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
                                          value={(editForm.street as string) || ""}
                                          placeholder="np. ul. Skarbowa 2"
                                          onChange={(e) => {
                                            updateField("street", e.target.value);
                                            updateField("lat", null);
                                            updateField("lng", null);
                                          }}
                                          onBlur={geocodeAddress}
                                        />
                                        {geocoding && (
                                          <Loader2 size={12} className="animate-spin text-muted absolute right-2 top-1/2 -translate-y-1/2" />
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <label className={labelClass}>Kod pocztowy</label>
                                      <input className={inputClass} value={(editForm.postcode as string) || ""} onChange={(e) => updateField("postcode", e.target.value)} placeholder="np. 30-001" />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Miasto</label>
                                      <input className={inputClass} value={(editForm.city as string) || "Kraków"} onChange={(e) => updateField("city", e.target.value)} placeholder="Kraków" />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Dzielnica</label>
                                      <select className={inputClass} value={(editForm.district as string) || "Inne"} onChange={(e) => updateField("district", e.target.value)}>
                                        {DISTRICT_LIST.map((district) => (
                                          <option key={district} value={district}>{district}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="col-span-2">
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
                                  imageUrl={event.image_url}
                                  imageCover={event.image_cover}
                                  imageThumb={event.image_thumb}
                                />
                              </div>

                              <div className="flex gap-2">
                                <button onClick={() => saveEdit(event.id)} disabled={uploadingImage === event.id} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors disabled:opacity-50">
                                  {uploadingImage === event.id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                                  {uploadingImage === event.id ? "Wgrywanie..." : "Zapisz"}
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
              <button onClick={() => { setBuildResult(null); setCopiedIdx(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
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
                    {buildResult.newEvents?.length
                      ? `Przetworzono ${buildResult.newEvents.length} wydarzeń.`
                      : "Brak nowych wydarzeń do przetworzenia."}
                  </p>
                    {buildResult.failed ? (
                      <p className="text-xs text-red-600">Błąd przy {buildResult.failed} wydarzeniu/ach (sprawdź logi serwera).</p>
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
              <button onClick={() => { setBuildResult(null); setCopiedIdx(null); }} className="ml-auto px-3 py-1.5 text-[12px] font-medium text-white bg-foreground rounded-lg hover:bg-stone-700 transition-colors">
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {promptPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold flex items-center gap-2 text-foreground">
                <Sparkles size={16} />
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
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-2 overflow-y-auto flex-1">
              <p className="text-[12px] text-muted-foreground">{promptPreview.eventId} — {promptPreview.title}</p>
              <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed bg-stone-50 rounded-lg p-3 border border-border">
                {promptPreview.prompt}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
