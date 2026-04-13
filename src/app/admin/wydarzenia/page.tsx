"use client";

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import {
  Plus, Pencil, Trash2, RefreshCw,
  ChevronDown, ChevronUp, X,
  Loader2, Save, ExternalLink,
  Star, ClipboardPaste, Upload, MapPin,
} from "lucide-react";
import { CATEGORY_ICONS, CATEGORY_LABELS, DISTRICT_LIST } from "@/lib/mock-data";
import { cn, formatDateShort, formatPrice, slugify } from "@/lib/utils";
import type { Event } from "@/types/database";

type DerivedEventStatus = Event["status"] | "outdated";
type EventListFilter = "all" | "published" | "draft" | "outdated";

const MiniMapLazy = lazy(() => import("../miejsca/mini-map").then((module) => ({ default: module.MiniMap })));

// ═══════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════

export default function AdminSourcesPage() {
  return <AdminCanonicalEventsPanel />;
}

function AdminCanonicalEventsPanel() {
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
  const [pasteModal, setPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteHeaders, setPasteHeaders] = useState<string[]>([]);
  const [pastePreview, setPastePreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });

  const FIELD_ALIASES: Record<string, string[]> = {
    title: ["title", "tytul", "tytuł", "nazwa", "name"],
    description_short: ["description_short", "krotki opis", "krótki opis", "opis", "short description"],
    description_long: ["description_long", "dlugi opis", "długi opis", "pelny opis", "pełny opis", "long description"],
    category: ["category", "kategoria", "typ", "rodzaj", "activity_type", "activity type"],
    date_start: ["date_start", "data", "data od", "start date", "date"],
    date_end: ["date_end", "data do", "end date"],
    time_start: ["time_start", "godzina od", "godzina", "start time", "czas od"],
    time_end: ["time_end", "godzina do", "end time", "czas do"],
    age_min: ["age_min", "wiek od", "minimalny wiek"],
    age_max: ["age_max", "wiek do", "maksymalny wiek"],
    price: ["price", "cena", "koszt", "price_from", "price_to", "price from", "price to"],
    is_free: ["is_free", "free", "darmowe", "bezplatne", "bezpłatne"],
    district: ["district", "dzielnica"],
    venue_name: ["venue_name", "miejsce", "lokalizacja", "venue"],
    venue_address: ["venue_address", "adres", "address"],
    organizer: ["organizer", "organizator"],
    source_url: ["source_url", "url", "link", "zrodlo", "źródło"],
    facebook_url: ["facebook_url", "facebook", "fb", "facebook page"],
    is_featured: ["is_featured", "featured", "wyroznione", "wyróżnione"],
    status: ["status", "stan"],
  };

  const resolveField = (header: string): string | null => {
    const normalized = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some((alias) => alias.toLowerCase() === normalized)) return field;
    }
    return null;
  };

  const parsePastedData = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setPasteHeaders([]);
      setPastePreview([]);
      return;
    }

    const structMatch = trimmed.match(/[\[{][\s\S]*[\]}]/);
    if (structMatch) {
      const raw = structMatch[0]
        .replace(/#[^\n]*/g, "")
        .replace(/<NA>/g, "null")
        .replace(/\bNaN\b/g, "null")
        .replace(/,\s*([}\]])/g, "$1");

      const attempts = [
        raw,
        raw.replace(/(?<=[{,[\s])'/g, '"').replace(/'(?=\s*[:,\]}])/g, '"'),
      ];

      for (const attempt of attempts) {
        try {
          const obj = JSON.parse(
            attempt.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bNone\b/g, "null")
          );

          if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
            const headers = [...new Set(obj.flatMap((row: Record<string, unknown>) => Object.keys(row)))];
            const rows = obj.map((row: Record<string, unknown>) => {
              const mapped: Record<string, string> = {};
              headers.forEach((header) => {
                mapped[header] = row[header] != null ? String(row[header]) : "";
              });
              return mapped;
            });
            setPasteHeaders(headers);
            setPastePreview(rows);
            return;
          }

          if (typeof obj === "object" && !Array.isArray(obj)) {
            const keys = Object.keys(obj);
            if (keys.length > 0 && Array.isArray(obj[keys[0]])) {
              const rowCount = obj[keys[0]].length;
              const rows: Record<string, string>[] = [];
              for (let index = 0; index < rowCount; index++) {
                const row: Record<string, string> = {};
                keys.forEach((key) => {
                  row[key] = String(obj[key]?.[index] ?? "");
                });
                rows.push(row);
              }
              setPasteHeaders(keys);
              setPastePreview(rows);
              return;
            }
          }
        } catch {
          // try next parser
        }
      }
    }

    const lines = trimmed.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      setPasteHeaders([]);
      setPastePreview([]);
      return;
    }
    const separator = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(separator).map((header) => header.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => {
      const values = line.split(separator).map((value) => value.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      return row;
    }).filter((row) => Object.values(row).some(Boolean));

    setPasteHeaders(headers);
    setPastePreview(rows);
  };

  const asNumber = (value?: string): number | null => {
    if (!value) return null;
    const parsed = Number(String(value).replace(/,/g, ".").replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const asBoolean = (value?: string): boolean => {
    if (!value) return false;
    return ["1", "true", "tak", "yes", "y"].includes(value.trim().toLowerCase());
  };

  const normalizeCategory = (value?: string): Event["category"] => {
    const normalized = (value || "").trim().toLowerCase();
    const aliases: Record<string, Event["category"]> = {
      warsztaty: "warsztaty",
      spektakl: "spektakl",
      spektakle: "spektakl",
      kino: "kino",
      koncert: "muzyka",
      koncerty: "muzyka",
      muzyka: "muzyka",
      muzyczne: "muzyka",
      edukacja: "edukacja",
      edukacyjne: "edukacja",
      sport: "sport",
      sportowe: "sport",
      natura: "natura",
      przyroda: "natura",
      festyn: "festyn",
      festiwal: "festyn",
      wystawa: "wystawa",
      wystawy: "wystawa",
      inne: "inne",
    };

    if (normalized in aliases) return aliases[normalized];

    const match = Object.entries(CATEGORY_LABELS).find(([key, label]) => {
      const keyMatch = key.toLowerCase() === normalized;
      const labelMatch = label.toLowerCase() === normalized;
      return keyMatch || labelMatch;
    });
    return (match?.[0] || "inne") as Event["category"];
  };

  const normalizeDistrict = (value?: string): Event["district"] => {
    const normalized = (value || "").trim().toLowerCase();
    const match = DISTRICT_LIST.find((district) => district.toLowerCase() === normalized);
    return (match || "Inne") as Event["district"];
  };

  const normalizeStatus = (value?: string): Event["status"] => {
    const normalized = (value || "").trim().toLowerCase();
    if (normalized === "published" || normalized === "opublikowany") return "published";
    if (normalized === "cancelled" || normalized === "anulowany") return "cancelled";
    return "draft";
  };

  const closePasteModal = () => {
    setPasteModal(false);
    setPasteText("");
    setPasteHeaders([]);
    setPastePreview([]);
    setImporting(false);
    setImportProgress({ done: 0, total: 0 });
  };

  const runPasteImport = async () => {
    if (pastePreview.length === 0) return;
    setImporting(true);
    setImportProgress({ done: 0, total: pastePreview.length });

    const imported: Event[] = [];

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

      const price = asNumber(mapped.price) ?? asNumber(row.price_from) ?? asNumber(row.price_to);
      const isFree = mapped.is_free ? asBoolean(mapped.is_free) : price === null || price === 0;
      const payload = {
        content_type: "event",
        title: mapped.title.trim(),
        slug: slugify(mapped.title.trim()),
        description_short: mapped.description_short || mapped.description_long || "Opis wydarzenia",
        description_long: mapped.description_long || mapped.description_short || "",
        image_url: null,
        date_start: mapped.date_start || new Date().toISOString().slice(0, 10),
        date_end: mapped.date_end || null,
        time_start: mapped.time_start || null,
        time_end: mapped.time_end || null,
        age_min: asNumber(mapped.age_min),
        age_max: asNumber(mapped.age_max),
        price,
        is_free: isFree,
        category: normalizeCategory(mapped.category),
        district: normalizeDistrict(mapped.district),
        venue_name: mapped.venue_name || "Miejsce wydarzenia",
        venue_address: mapped.venue_address || "Kraków",
        lat: null,
        lng: null,
        organizer: mapped.organizer || null,
        source_url: mapped.source_url || null,
        facebook_url: mapped.facebook_url || null,
        is_featured: asBoolean(mapped.is_featured),
        status: normalizeStatus(mapped.status),
      };

      try {
        const res = await fetch("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data?.id) imported.push({ ...data, content_type: "event" } as Event);
      } catch {
        // skip broken row
      }

      setImportProgress({ done: index + 1, total: pastePreview.length });
    }

    setEvents((prev) => [...imported, ...prev]);
    closePasteModal();
    alert(`Zaimportowano ${imported.length} z ${pastePreview.length} wydarzeń`);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/events");
    const data = await res.json();
    if (Array.isArray(data)) {
      setEvents(data.map((event) => ({ ...event, content_type: "event" })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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

  const filteredEvents = useMemo(() => {
    const scopedEvents = categoryFilter ? visibleEvents.filter((event) => event.category === categoryFilter) : visibleEvents;
    if (statusFilter === "all") return scopedEvents;
    if (statusFilter === "draft") {
      return scopedEvents.filter((event) => {
        const effectiveStatus = getEffectiveStatus(event);
        return effectiveStatus === "draft" || effectiveStatus === "cancelled";
      });
    }
    return scopedEvents.filter((event) => getEffectiveStatus(event) === statusFilter);
  }, [visibleEvents, categoryFilter, statusFilter, getEffectiveStatus]);

  const groupedEvents = useMemo(() => (
    Object.entries(CATEGORY_LABELS).map(([category, label]) => ({
      category,
      label,
      items: filteredEvents
        .filter((event) => event.category === category)
        .sort((a, b) => {
          const statusDiff = statusOrder[getEffectiveStatus(a)] - statusOrder[getEffectiveStatus(b)];
          if (statusDiff !== 0) return statusDiff;
          const dateA = (a.date_start || "").slice(0, 10);
          const dateB = (b.date_start || "").slice(0, 10);
          const dateDiff = dateA.localeCompare(dateB);
          if (dateDiff !== 0) return dateDiff;
          return a.title.localeCompare(b.title, "pl");
        }),
    }))
  ), [filteredEvents, getEffectiveStatus]);
  const displayedGroups = useMemo(
    () => groupedEvents.filter(({ category }) => !categoryFilter || category === categoryFilter),
    [groupedEvents, categoryFilter]
  );

  const publishedCount = useMemo(() => visibleEvents.filter((event) => getEffectiveStatus(event) === "published").length, [visibleEvents, getEffectiveStatus]);
  const draftCount = useMemo(() => visibleEvents.filter((event) => getEffectiveStatus(event) === "draft" || getEffectiveStatus(event) === "cancelled").length, [visibleEvents, getEffectiveStatus]);
  const outdatedCount = useMemo(() => visibleEvents.filter((event) => getEffectiveStatus(event) === "outdated").length, [visibleEvents, getEffectiveStatus]);
  const categoryStats = useMemo(() => Object.fromEntries(
    Object.keys(CATEGORY_LABELS).map((category) => {
      const categoryEvents = visibleEvents.filter((event) => event.category === category);
      const published = categoryEvents.filter((event) => getEffectiveStatus(event) === "published").length;
      const draft = categoryEvents.filter((event) => {
        const effectiveStatus = getEffectiveStatus(event);
        return effectiveStatus === "draft" || effectiveStatus === "cancelled";
      }).length;
      const outdated = categoryEvents.filter((event) => getEffectiveStatus(event) === "outdated").length;
      return [category, { all: categoryEvents.length, published, draft, outdated }];
    })
  ), [visibleEvents, getEffectiveStatus]);
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
      Object.keys(CATEGORY_LABELS).map((category) => {
        const matchingItems = visibleEvents.filter((event) => {
          if (event.category !== category) return false;
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

  const parseVenueAddress = (venueAddress: string | null) => {
    const raw = (venueAddress || "").trim();
    if (!raw) return { street: "", city: "Kraków" };
    if (raw.toLowerCase() === "kraków") return { street: "", city: "Kraków" };

    const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        street: parts.slice(0, -1).join(", "),
        city: parts[parts.length - 1] || "Kraków",
      };
    }

    return { street: raw, city: "Kraków" };
  };

  const startEditing = (event: Event) => {
    const { street, city } = parseVenueAddress(event.venue_address);
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setEditing(event.id);
    setEditForm({
      title: event.title,
      description_short: event.description_short,
      description_long: event.description_long,
      category: event.category,
      date_start: event.date_start,
      date_end: event.date_end,
      time_start: event.time_start,
      time_end: event.time_end,
      age_min: event.age_min,
      age_max: event.age_max,
      price: event.price,
      is_free: event.is_free,
      district: event.district,
      venue_name: event.venue_name,
      street,
      city,
      lat: event.lat,
      lng: event.lng,
      organizer: event.organizer,
      source_url: event.source_url,
      facebook_url: event.facebook_url ?? "",
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
      price: null,
      is_free: true,
      category: "inne",
      district: "Inne",
      venue_name: "Miejsce wydarzenia",
      venue_address: "Kraków",
      lat: null,
      lng: null,
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
          ...(data.district ? { district: data.district } : {}),
        }));
      }
    } catch { /* silent */ }
    setGeocoding(false);
  };

  const saveEdit = async (id: string) => {
    let newImageUrl: string | null = null;

    if (pendingFile) {
      setUploadingImage(id);
      try {
        const formData = new FormData();
        formData.append("file", pendingFile);
        formData.append("id", id);
        formData.append("target", "events");
        const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
        const data = await res.json();
        if (data.image_url) {
          newImageUrl = `${data.image_url.split("?")[0]}?t=${Date.now()}`;
        } else {
          alert(`Błąd obrazka: ${data.error || "Nie udało się"}`);
        }
      } catch {
        alert("Błąd połączenia przy wgrywaniu obrazka");
      }
      setUploadingImage(null);
    }

    const priceValue = editForm.price === "" || editForm.price === null ? null : Number(editForm.price);
    const combinedAddress = [String(editForm.street || "").trim(), String(editForm.city || "").trim()].filter(Boolean).join(", ");
    const updates: Record<string, unknown> = {
      title: String(editForm.title || ""),
      slug: slugify(String(editForm.title || "")),
      description_short: String(editForm.description_short || ""),
      description_long: String(editForm.description_long || ""),
      category: editForm.category,
      date_start: editForm.date_start,
      date_end: editForm.date_end || null,
      time_start: editForm.time_start || null,
      time_end: editForm.time_end || null,
      age_min: editForm.age_min === "" || editForm.age_min === null ? null : Number(editForm.age_min),
      age_max: editForm.age_max === "" || editForm.age_max === null ? null : Number(editForm.age_max),
      price: Number.isFinite(priceValue) ? priceValue : null,
      is_free: Boolean(editForm.is_free),
      district: editForm.district,
      venue_name: String(editForm.venue_name || ""),
      venue_address: combinedAddress,
      lat: editForm.lat === "" || editForm.lat === null ? null : Number(editForm.lat),
      lng: editForm.lng === "" || editForm.lng === null ? null : Number(editForm.lng),
      organizer: editForm.organizer ? String(editForm.organizer) : null,
      source_url: editForm.source_url ? String(editForm.source_url) : null,
      facebook_url: editForm.facebook_url ? String(editForm.facebook_url) : null,
      is_featured: Boolean(editForm.is_featured),
      status: editForm.status,
      likes: Number(editForm.likes) || 0,
      dislikes: Number(editForm.dislikes) || 0,
    };

    if (newImageUrl) updates.image_url = newImageUrl;

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

    setEvents((prev) => prev.map((event) => (
      event.id === id
        ? { ...event, ...updates, ...(newImageUrl ? { image_url: newImageUrl } : {}) } as Event
        : event
    )));
    clearPendingFile();
    setEditing(null);
    setEditForm({});
  };

  const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
  const labelClass = "block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Wydarzenia</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setPasteModal(true)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <ClipboardPaste size={14} />
            Wklej dane
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
        <button onClick={() => toggleStatusFilter("all")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>{visibleEvents.length} wydarzeń</button>
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
          {displayedGroups.map(({ category, label, items }) => {
            const expanded = !collapsedCategories[category];
            const stats = categoryStats[category] ?? { all: 0, published: 0, draft: 0, outdated: 0 };
            return (
              <div key={category}>
                <div className="w-full flex items-center gap-2 mb-2 rounded-md px-1.5 py-1 hover:bg-accent/50 transition-colors">
                  <button type="button" onClick={() => toggleCategory(category)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground rotate-180" />}
                    <span className="text-lg">{CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}</span>
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
                            <span className="shrink-0 text-lg">{CATEGORY_ICONS[event.category]}</span>

                            {event.image_url ? (
                              <img src={event.image_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                            ) : (
                              <span className="w-8 h-8 rounded bg-stone-100 shrink-0 flex items-center justify-center text-[10px] text-stone-400">—</span>
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-foreground truncate">{event.title}</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5 flex-wrap">
                                <span>{CATEGORY_LABELS[event.category]}</span>
                                <span className="opacity-40">·</span>
                                <span>{formatDateShort(event.date_start)}{event.date_end ? ` - ${formatDateShort(event.date_end)}` : ""}</span>
                                {(event.time_start || event.time_end) && (
                                  <>
                                    <span className="opacity-40">·</span>
                                    <span>{[event.time_start, event.time_end].filter(Boolean).join("-")}</span>
                                  </>
                                )}
                                <span className="opacity-40">·</span>
                                <span>{event.is_free ? "Bezpłatnie" : formatPrice(event.price)}</span>
                                <span className="opacity-40">·</span>
                                <span className="truncate max-w-[180px]">{event.venue_name}</span>
                              </div>
                            </div>

                            <button onClick={() => startEditing(event)} className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Edytuj">
                              <Pencil size={13} />
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
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                                <div className="md:col-span-3">
                                  <label className={labelClass}>Tytuł</label>
                                  <input className={inputClass} value={(editForm.title as string) || ""} onChange={(e) => updateField("title", e.target.value)} />
                                </div>
                                <div>
                                  <label className={labelClass}>Kategoria</label>
                                  <select className={inputClass} value={(editForm.category as string) || "inne"} onChange={(e) => updateField("category", e.target.value)}>
                                    {Object.entries(CATEGORY_LABELS).map(([key, labelValue]) => (
                                      <option key={key} value={key}>{labelValue}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="hidden md:block" />

                                <div className="md:col-span-4">
                                  <label className={labelClass}>Krótki opis</label>
                                  <textarea rows={2} className={inputClass} value={(editForm.description_short as string) || ""} onChange={(e) => updateField("description_short", e.target.value)} />
                                </div>
                                <div className="md:col-span-4">
                                  <label className={labelClass}>Długi opis</label>
                                  <textarea rows={6} className={inputClass} value={(editForm.description_long as string) || ""} onChange={(e) => updateField("description_long", e.target.value)} />
                                </div>

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
                                  <input type="time" className={inputClass} value={(editForm.time_start as string) || ""} onChange={(e) => updateField("time_start", e.target.value || null)} />
                                </div>
                                <div>
                                  <label className={labelClass}>Godzina do</label>
                                  <input type="time" className={inputClass} value={(editForm.time_end as string) || ""} onChange={(e) => updateField("time_end", e.target.value || null)} />
                                </div>

                                <div>
                                  <label className={labelClass}>Wiek od</label>
                                  <input type="number" min={0} max={18} className={inputClass} value={editForm.age_min === null ? "" : String(editForm.age_min ?? "")} onChange={(e) => updateField("age_min", e.target.value ? Number(e.target.value) : null)} />
                                </div>
                                <div>
                                  <label className={labelClass}>Wiek do</label>
                                  <input type="number" min={0} max={18} className={inputClass} value={editForm.age_max === null ? "" : String(editForm.age_max ?? "")} onChange={(e) => updateField("age_max", e.target.value ? Number(e.target.value) : null)} />
                                </div>
                                <div>
                                  <label className={labelClass}>Cena</label>
                                  <input type="number" min={0} className={inputClass} value={editForm.price === null ? "" : String(editForm.price ?? "")} onChange={(e) => {
                                    const value = e.target.value ? Number(e.target.value) : null;
                                    updateField("price", value);
                                    updateField("is_free", value === null || value === 0);
                                  }} />
                                </div>
                                <div className="flex items-center gap-2 pt-5">
                                  <input type="checkbox" id={`free-${event.id}`} checked={Boolean(editForm.is_free)} onChange={(e) => updateField("is_free", e.target.checked)} className="rounded border-border" />
                                  <label htmlFor={`free-${event.id}`} className="text-[12px] text-foreground">Bezpłatne</label>
                                </div>

                                <div className="md:col-span-2">
                                  <label className={labelClass}>URL</label>
                                  <input className={inputClass} value={(editForm.source_url as string) || ""} onChange={(e) => updateField("source_url", e.target.value)} />
                                </div>
                                <div className="md:col-span-2">
                                  <label className={labelClass}>Facebook</label>
                                  <input className={inputClass} value={(editForm.facebook_url as string) || ""} onChange={(e) => updateField("facebook_url", e.target.value)} placeholder="https://facebook.com/..." />
                                </div>
                                <div className="md:col-span-2">
                                  <label className={labelClass}>Organizator</label>
                                  <input className={inputClass} value={(editForm.organizer as string) || ""} onChange={(e) => updateField("organizer", e.target.value)} />
                                </div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-3">
                                  <div>
                                    <label className={labelClass}>👍 Likes</label>
                                    <input type="number" min={0} className={inputClass} value={(editForm.likes as number) ?? 0} onChange={(e) => updateField("likes", Number(e.target.value) || 0)} />
                                  </div>
                                  <div>
                                    <label className={labelClass}>👎 Dislikes</label>
                                    <input type="number" min={0} className={inputClass} value={(editForm.dislikes as number) ?? 0} onChange={(e) => updateField("dislikes", Number(e.target.value) || 0)} />
                                  </div>
                                </div>
                                <div className="hidden md:block" />
                                <div className="hidden md:block" />
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
                                      <label className={labelClass}>Miasto</label>
                                      <input className={inputClass} value={(editForm.city as string) || "Kraków"} onChange={(e) => updateField("city", e.target.value)} placeholder="Kraków" />
                                    </div>
                                    <div>
                                      <label className={labelClass}>Dzielnica</label>
                                      <select className={inputClass} value={(editForm.district as string) || "Inne"} onChange={(e) => updateField("district", e.target.value)}>
                                        {DISTRICT_LIST.slice(1).map((district) => (
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

                                <div className="rounded-lg border border-border/50 p-3 space-y-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Obrazek</p>
                                  {(pendingPreview || event.image_url) && (
                                    <div className="relative">
                                      <img src={pendingPreview || event.image_url || ""} alt="" className={cn("w-full aspect-[3/2] rounded-lg object-cover border border-border", pendingPreview && "ring-2 ring-primary/40")} />
                                      {pendingPreview && (
                                        <button onClick={clearPendingFile} className="absolute top-1.5 right-1.5 bg-white rounded-full shadow-sm border border-border p-0.5 hover:bg-red-50 transition-colors" title="Usuń">
                                          <X size={14} className="text-red-500" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer">
                                      <Plus size={11} />
                                      {pendingPreview ? "Zmień plik" : "Wgraj plik"}
                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); e.target.value = ""; }} />
                                    </label>
                                  </div>
                                  {pendingPreview && <span className="text-[10px] text-primary font-medium">Nowy plik — zapisz aby wgrać</span>}
                                </div>
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

      {pasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-[15px] font-bold text-foreground">Wklej dane</h2>
                <p className="text-[11px] text-muted mt-0.5">Wklej tabelę z Excela, Google Sheets lub dane JSON/DataFrame</p>
              </div>
              <button onClick={closePasteModal} className="p-1.5 rounded hover:bg-accent text-muted transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Pierwszy wiersz = nagłówki, np. title, data, godzina, miejsce, cena
                </p>
                <textarea
                  className="w-full h-40 px-3 py-2 rounded-lg border border-border text-[12px] font-mono bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                  value={pasteText}
                  onChange={(e) => {
                    setPasteText(e.target.value);
                    parsePastedData(e.target.value);
                  }}
                />
              </div>

              {pasteHeaders.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rozpoznane kolumny</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pasteHeaders.map((header) => {
                      const field = resolveField(header);
                      return (
                        <span key={header} className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium",
                          field ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {header} {field ? `-> ${field}` : "(pominięta)"}
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
                          {pasteHeaders.filter((header) => resolveField(header)).map((header) => (
                            <th key={header} className="px-2.5 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                              {resolveField(header)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pastePreview.slice(0, 5).map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-t border-border/50">
                            {pasteHeaders.filter((header) => resolveField(header)).map((header) => (
                              <td key={header} className="px-2.5 py-1.5 text-foreground max-w-[220px] truncate">
                                {row[header] || <span className="text-muted/40">—</span>}
                              </td>
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
              <p className="text-[11px] text-muted">Wydarzenia zostaną dodane do listy. Bez podanego statusu trafią jako Draft.</p>
              <div className="flex items-center gap-2">
                {importing && <span className="text-[11px] text-muted">{importProgress.done}/{importProgress.total}</span>}
                <button onClick={closePasteModal} className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:text-foreground transition-colors">
                  Anuluj
                </button>
                <button
                  onClick={runPasteImport}
                  disabled={importing || pastePreview.length === 0 || !pasteHeaders.some((header) => resolveField(header) === "title")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {importing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {importing ? "Importowanie..." : `Importuj ${pastePreview.length} wydarzeń`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
