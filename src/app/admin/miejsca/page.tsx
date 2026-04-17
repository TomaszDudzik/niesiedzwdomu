"use client";

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import {
  Trash2, Pencil, Loader2, RefreshCw,
  ExternalLink, Save, X, Upload, XCircle, MapPin, Plus, ClipboardPaste, ChevronDown, ChevronRight, Star,
} from "lucide-react";
import { PLACE_TYPE_LABELS, PLACE_TYPE_ICONS, DISTRICT_LIST } from "@/lib/mock-data";
import { cn, thumbUrl, withCacheBust } from "@/lib/utils";
import type { Organizer, Place } from "@/types/database";
import { ImageSection } from "@/components/admin/image-section";
import { OrganizerCombobox } from "@/components/admin/organizer-combobox";
import { TaxonomyFields } from "@/components/admin/taxonomy-fields";
import { useAdminTaxonomy } from "@/lib/use-admin-taxonomy";

const MiniMapLazy = lazy(() => import("./mini-map").then((m) => ({ default: m.MiniMap })));
type PlaceListFilter = "all" | "published" | "draft";
const UNCATEGORIZED_KEY = "__uncategorized__";

function getPlaceMainCategory(place: Partial<Place> | Record<string, unknown>) {
  return typeof place.category_lvl_1 === "string"
    ? place.category_lvl_1
    : typeof place.main_category === "string"
      ? place.main_category
      : typeof place.place_type === "string"
        ? place.place_type
        : null;
}

function getPlaceCategoryLabel(category: string | null) {
  if (!category || category === UNCATEGORIZED_KEY) return "Bez kategorii";
  return PLACE_TYPE_LABELS[category as keyof typeof PLACE_TYPE_LABELS] ?? category;
}

function getPlaceCategoryIcon(category: string | null) {
  if (!category || category === UNCATEGORIZED_KEY) return "📍";
  return PLACE_TYPE_ICONS[category as keyof typeof PLACE_TYPE_ICONS] ?? "📍";
}

function getPlaceGroupKey(place: Partial<Place> | Record<string, unknown>) {
  return getPlaceMainCategory(place) ?? UNCATEGORIZED_KEY;
}

function sortPlaceGroupKeys(keys: string[]) {
  return [...keys].sort((left, right) => {
    if (left === UNCATEGORIZED_KEY) return 1;
    if (right === UNCATEGORIZED_KEY) return -1;
    return getPlaceCategoryLabel(left).localeCompare(getPlaceCategoryLabel(right), "pl");
  });
}

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export default function AdminPlacesPage() {
  const { typeLevel1Options, typeLevel2Options, categoryLevel1Options, categoryLevel2Options, categoryLevel3Options, loading: taxonomyLoading } = useAdminTaxonomy();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [pasteModal, setPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePreview, setPastePreview] = useState<Record<string, string>[]>([]);
  const [pasteHeaders, setPasteHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<PlaceListFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);

  const isCategoryExpanded = (type: string) => !collapsedCategories[type];
  const toggleCategory = (type: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const parsePastedData = (text: string) => {
    const trimmed = text.trim();

    // Try JSON/Python structured data
    const structMatch = trimmed.match(/[\[{][\s\S]*[\]}]/);
    if (structMatch) {
      // Strip Python comments, join implicit string concatenation
      const raw = structMatch[0]
        .replace(/#[^\n]*/g, "")
        .replace(/'\s*\n\s*'/g, "")
        .replace(/"\s*\n\s*"/g, "");
      // Try parsing: first as-is (double quotes), then with single→double quote conversion
      const attempts = [
        raw,
        raw.replace(/(?<=[{,[\s])'/g, '"').replace(/'(?=\s*[:,\]}])/g, '"'),
      ];
      for (const attempt of attempts) {
        try {
          const jsonStr = attempt
            .replace(/\bTrue\b/g, "true")
            .replace(/\bFalse\b/g, "false")
            .replace(/\bNone\b/g, "null")
            .replace(/,\s*}/g, "}")
            .replace(/,\s*]/g, "]");
          const obj = JSON.parse(jsonStr);

          // Array of objects: [{...}, {...}]
          if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
            const headers = [...new Set(obj.flatMap((o: Record<string, unknown>) => Object.keys(o)))];
            const rows = obj.map((o: Record<string, unknown>) => {
              const row: Record<string, string> = {};
              headers.forEach((h) => { row[h] = o[h] != null ? String(o[h]) : ""; });
              return row;
            });
            setPasteHeaders(headers);
            setPastePreview(rows);
            return;
          }

          // Dict of lists format: { "col": [val1, val2], "col2": [val1, val2] }
          if (typeof obj === "object" && !Array.isArray(obj)) {
            const keys = Object.keys(obj);
            if (keys.length > 0 && Array.isArray(obj[keys[0]])) {
              const rowCount = obj[keys[0]].length;
              const headers = keys;
              const rows: Record<string, string>[] = [];
              for (let i = 0; i < rowCount; i++) {
                const row: Record<string, string> = {};
                headers.forEach((h) => { row[h] = String(obj[h]?.[i] ?? ""); });
                rows.push(row);
              }
              setPasteHeaders(headers);
              setPastePreview(rows);
              return;
            }
          }
        } catch { /* try next attempt */ }
      }
    }

    // Fallback: tab/comma/semicolon separated table
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) { setPastePreview([]); setPasteHeaders([]); return; }
    const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => {
      const vals = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ""; });
      return row;
    }).filter((r) => Object.values(r).some((v) => v));
    setPasteHeaders(headers);
    setPastePreview(rows);
  };

  const FIELD_ALIASES: Record<string, string[]> = {
    title: ["title", "tytuł", "tytul", "nazwa", "name"],
    organizer: ["organizer", "organizator"],
    description_short: ["description_short", "krótki opis", "krotki opis", "opis krótki", "short description", "opis"],
    description_long: ["description_long", "długi opis", "dlugi opis", "opis długi", "long description"],
    category_lvl_1: ["category_lvl_1", "main_category", "place_type", "typ", "type", "kategoria glowna", "kategoria", "category"],
    street: ["street", "ulica", "adres", "address"],
    postcode: ["postcode", "zip", "kod", "kod_pocztowy", "kod pocztowy"],
    city: ["city", "miasto"],
    district: ["district", "dzielnica"],
    lat: ["lat", "latitude"],
    lng: ["lng", "lon", "longitude"],
    age_min: ["age_min", "wiek od", "wiek_min"],
    age_max: ["age_max", "wiek do", "wiek_max"],
    note: ["note", "notatka", "uwagi", "dodatkowe informacje"],
    source_url: ["source_url", "url", "strona", "website", "link"],
    facebook_url: ["facebook_url", "facebook", "fb", "facebook page"],
    is_indoor: ["is_indoor", "wewnątrz", "indoor"],
  };

  const resolveField = (header: string): string | null => {
    const h = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(h)) return field;
    }
    return null;
  };

  const runPasteImport = async () => {
    if (pastePreview.length === 0) return;
    setImporting(true);
    setImportProgress({ done: 0, total: pastePreview.length });
    const imported: Place[] = [];

    for (let i = 0; i < pastePreview.length; i++) {
      const row = pastePreview[i];
      const place: Record<string, unknown> = { city: "Kraków", district: "Inne", category_lvl_1: null };
      for (const header of pasteHeaders) {
        const field = resolveField(header);
        if (!field || !row[header]) continue;
        const val = row[header];
        if (["lat", "lng", "age_min", "age_max"].includes(field)) {
          place[field] = Number(val) || null;
        } else if (["is_indoor"].includes(field)) {
          place[field] = val.toLowerCase() === "true" || val === "1" || val.toLowerCase() === "tak";
        } else {
          place[field] = val;
        }
      }
      const organizerName = typeof place.organizer === "string" ? place.organizer.trim() : "";
      const matchedOrganizer = organizerName
        ? organizers.find((organizer) => organizer.organizer_name.toLowerCase() === organizerName.toLowerCase())
        : null;
      if (matchedOrganizer) {
        place.organizer_id = matchedOrganizer.id;
      }
      delete place.organizer;
      if (!place.title) continue;

      try {
        const res = await fetch("/api/admin/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(place),
        });
        const data = await res.json();
        if (data.id) {
          imported.push({ ...data, content_type: "place" } as Place);

          // Geocode street to fill lat/lng/district
          const street = String(place.street || "").trim();
          const city = String(place.city || "Kraków").trim();
          if (street && !place.lat) {
            try {
              if (i > 0) await new Promise((r) => setTimeout(r, 1100));
              const geoRes = await fetch("/api/admin/geocode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: street, city }),
              });
              const geo = await geoRes.json();
              if (geo.lat && geo.lng) {
                const patch: Record<string, unknown> = { id: data.id, lat: geo.lat, lng: geo.lng };
                if (geo.district) patch.district = geo.district;
                if (geo.postcode) patch.postcode = geo.postcode;
                await fetch("/api/admin/places", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(patch),
                });
                const idx = imported.findIndex((p) => p.id === data.id);
                if (idx !== -1) {
                  imported[idx] = {
                    ...imported[idx],
                    lat: geo.lat,
                    lng: geo.lng,
                    ...(geo.district ? { district: geo.district } : {}),
                    ...(geo.postcode ? { postcode: geo.postcode } : {}),
                  } as Place;
                }
              }
            } catch { /* geocoding is best-effort */ }
          }
        }
      } catch { /* skip */ }
      setImportProgress({ done: i + 1, total: pastePreview.length });
    }

    setPlaces((prev) => [...imported, ...prev]);
    setImporting(false);
    setPasteModal(false);
    setPasteText("");
    setPastePreview([]);
    setPasteHeaders([]);
    alert(`Zaimportowano ${imported.length} z ${pastePreview.length} miejsc`);
  };

  const fetchPlaces = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/places");
    const data = await res.json();
    if (Array.isArray(data)) {
      setPlaces(data.map((p: Record<string, unknown>) => ({ ...p, content_type: "place" }) as Place));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlaces(); }, [fetchPlaces]);

  useEffect(() => {
    fetch("/api/admin/organizers?status=published")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) setOrganizers(data);
      });
  }, []);

  const filteredPlaces = useMemo(() => {
    const scopedPlaces = typeFilter ? places.filter((place) => getPlaceGroupKey(place) === typeFilter) : places;
    if (statusFilter === "all") return scopedPlaces;
    if (statusFilter === "published") return scopedPlaces.filter((place) => place.status === "published");
    return scopedPlaces.filter((place) => place.status !== "published");
  }, [places, typeFilter, statusFilter]);
  const allTypeKeys = useMemo(() => {
    const categories = new Set<string>();
    places.forEach((place) => categories.add(getPlaceGroupKey(place)));
    return sortPlaceGroupKeys(Array.from(categories));
  }, [places]);
  const displayedTypeKeys = useMemo(() => {
    const categories = new Set<string>();
    filteredPlaces.forEach((place) => categories.add(getPlaceGroupKey(place)));
    return sortPlaceGroupKeys(Array.from(categories));
  }, [filteredPlaces]);

  const publishedCount = useMemo(() => places.filter((place) => place.status === "published").length, [places]);
  const draftCount = useMemo(() => places.filter((place) => place.status !== "published").length, [places]);
  const sectionStats = useMemo(() => Object.fromEntries(
    allTypeKeys.map((type) => {
      const typePlaces = places.filter((place) => getPlaceGroupKey(place) === type);
      const published = typePlaces.filter((place) => place.status === "published").length;
      return [type, { all: typePlaces.length, published, draft: typePlaces.length - published }];
    })
  ), [allTypeKeys, places]);
  const visibleTypeKeys = useMemo(() => displayedTypeKeys, [displayedTypeKeys]);
  const hasExpandedCategories = useMemo(() => visibleTypeKeys.some((type) => !collapsedCategories[type]), [visibleTypeKeys, collapsedCategories]);

  const statusOrder: Record<Place["status"], number> = {
    draft: 0,
    published: 1,
    cancelled: 2,
    deleted: 3,
  };

  const toggleStatusFilter = (filter: PlaceListFilter) => {
    const nextFilter = statusFilter === filter ? "all" : filter;
    setTypeFilter(null);
    setStatusFilter(nextFilter);
    const nextCollapsed = Object.fromEntries(
      allTypeKeys.map((type) => {
        const matchingItems = places.filter((place) => {
          if (getPlaceGroupKey(place) !== type) return false;
          if (nextFilter === "all") return true;
          if (nextFilter === "published") return place.status === "published";
          return place.status !== "published";
        });
        return [type, matchingItems.length === 0];
      })
    );
    setCollapsedCategories(nextCollapsed);
  };

  const toggleTypeStatusFilter = (type: string, filter: PlaceListFilter) => {
    if (typeFilter === type && statusFilter === filter) {
      setTypeFilter(null);
      setStatusFilter("all");
      return;
    }
    setTypeFilter(type);
    setStatusFilter(filter);
    setCollapsedCategories((prev) => ({ ...prev, [type]: false }));
  };

  const toggleAllCategories = () => {
    if (visibleTypeKeys.length === 0) return;
    setCollapsedCategories(
      Object.fromEntries(visibleTypeKeys.map((type) => [type, hasExpandedCategories]))
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno chcesz usunąć?")) return;
    await fetch("/api/admin/places", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleStatus = async (place: Place) => {
    const newStatus = place.status === "published" ? "draft" : "published";
    await fetch("/api/admin/places", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: place.id, status: newStatus }),
    });
    setPlaces((prev) => prev.map((p) => p.id === place.id ? { ...p, status: newStatus } : p));
  };

  const startEditing = (place: Place) => {
    setEditing(place.id);
    setPendingFile(null);
    setPendingPreview(null);
    // Split address into street and city (format: "street, city" or just "street")
    setEditForm({
      title: place.title,
      description_short: place.description_short,
      description_long: place.description_long,
      type_lvl_1_id: place.type_lvl_1_id ?? place.type_id ?? null,
      type_lvl_2_id: place.type_lvl_2_id ?? place.subtype_id ?? null,
      category_lvl_1: place.category_lvl_1 ?? place.main_category ?? null,
      category_lvl_2: place.category_lvl_2 ?? place.category ?? null,
      category_lvl_3: place.category_lvl_3 ?? place.subcategory ?? null,
      street: place.street,
      postcode: place.postcode,
      city: place.city,
      district: place.district,
      lat: place.lat,
      lng: place.lng,
      age_min: place.age_min,
      age_max: place.age_max,
      note: place.note ?? "",
      source_url: place.source_url,
      facebook_url: place.facebook_url ?? "",
      organizer_id: place.organizer_id ?? null,
      is_indoor: place.is_indoor,
      is_featured: place.is_featured,
      likes: place.likes,
      dislikes: place.dislikes,
    });
  };

  const saveEdit = async (id: string) => {
    let newImageCover: string | null = null;

    // Upload pending image first
    if (pendingFile) {
      setUploadingImage(id);
      try {
        const formData = new FormData();
        formData.append("file", pendingFile);
        formData.append("id", id);
        formData.append("target", "places");
        const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
        const data = await res.json();
        if (data.image_cover) {
          newImageCover = `${data.image_cover.split("?")[0]}?t=${Date.now()}`;
        } else {
          alert(`Błąd obrazka: ${data.error || "Nie udało się"}`);
        }
      } catch { alert("Błąd połączenia przy wgrywaniu obrazka"); }
      setUploadingImage(null);
    }

    const dbPayload: Record<string, unknown> = {
      title: editForm.title,
      description_short: editForm.description_short,
      description_long: editForm.description_long,
      type_lvl_1_id: editForm.type_lvl_1_id ? String(editForm.type_lvl_1_id) : null,
      type_lvl_2_id: editForm.type_lvl_2_id ? String(editForm.type_lvl_2_id) : null,
      category_lvl_1: editForm.category_lvl_1 ? String(editForm.category_lvl_1) : null,
      category_lvl_2: editForm.category_lvl_2 ? String(editForm.category_lvl_2) : null,
      category_lvl_3: editForm.category_lvl_3 ? String(editForm.category_lvl_3) : null,
      is_indoor: editForm.is_indoor,
      street: editForm.street || "",
      postcode: editForm.postcode || "",
      city: editForm.city || "Kraków",
      district: editForm.district,
      lat: editForm.lat ?? null,
      lng: editForm.lng ?? null,
      age_min: editForm.age_min ?? null,
      age_max: editForm.age_max ?? null,
      note: editForm.note ? String(editForm.note) : null,
      source_url: editForm.source_url || null,
      facebook_url: editForm.facebook_url ? String(editForm.facebook_url) : null,
      organizer_id: editForm.organizer_id && isUUID(String(editForm.organizer_id)) ? editForm.organizer_id : null,
      organizer: editForm.organizer_id && !isUUID(String(editForm.organizer_id)) ? String(editForm.organizer_id) : (editForm.organizer || null),
      is_featured: Boolean(editForm.is_featured),
      likes: Number(editForm.likes) || 0,
      dislikes: Number(editForm.dislikes) || 0,
    };

    // Include new image_url in DB payload if image was uploaded
    if (newImageCover) {
      dbPayload.image_cover = newImageCover;
      dbPayload.image_set = null;
    }

    let saveRes = await fetch("/api/admin/places", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...dbPayload }),
    });
    let saveData = await saveRes.json();

    // Retry without facebook_url if column doesn't exist
    if (!saveRes.ok && saveData.error?.includes("facebook_url")) {
      const { facebook_url: _facebookUrl, ...dbPayloadWithoutFacebook } = dbPayload;
      saveRes = await fetch("/api/admin/places", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...dbPayloadWithoutFacebook }),
      });
      saveData = await saveRes.json();
    }

    if (!saveRes.ok) {
      alert(`Błąd zapisu: ${saveData.error || "Nieznany błąd"}`);
      return;
    }

    const updatedPlace = saveData.updated as Record<string, unknown> | undefined;
    setPlaces((prev) => prev.map((p) => p.id === id ? (
      updatedPlace
        ? ({
            ...updatedPlace,
            image_cover: typeof updatedPlace.image_cover === "string" ? withCacheBust(updatedPlace.image_cover) : updatedPlace.image_cover,
            image_thumb: typeof updatedPlace.image_thumb === "string" ? withCacheBust(updatedPlace.image_thumb) : updatedPlace.image_thumb,
            content_type: "place",
          } as Place)
        : {
            ...p,
            ...dbPayload,
            ...(newImageCover ? { image_cover: newImageCover } : {}),
          } as Place
    ) : p));
    setPendingFile(null);
    setPendingPreview(null);
    setEditing(null);
  };

  const updateField = (key: string, value: unknown) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileSelect = (file: File) => {
    setPendingFile(file);
    const url = URL.createObjectURL(file);
    setPendingPreview(url);
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
          ...(data.district ? { district: data.district } : {}),
          ...(data.city ? { city: data.city } : {}),
          ...(data.postcode ? { postcode: data.postcode } : {}),
        }));
      }
    } catch { /* silent */ }
    setGeocoding(false);
  };

  const createPlace = async () => {
    const res = await fetch("/api/admin/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nowe miejsce", category_lvl_1: null, street: "", city: "Kraków", district: "Inne" }),
    });
    const data = await res.json();
    if (data.id) {
      const newPlace = { ...data, content_type: "place" } as Place;
      setPlaces((prev) => [newPlace, ...prev]);
      startEditing(newPlace);
    } else {
      alert(`Błąd: ${data.error || "Nie udało się"}`);
    }
  };

  const toggleFeatured = async (place: Place) => {
    const nextFeatured = !place.is_featured;
    const res = await fetch("/api/admin/places", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: place.id, is_featured: nextFeatured }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(`Błąd: ${data.error || "Nie udało się zapisać wyróżnienia"}`);
      return;
    }
    setPlaces((prev) => prev.map((p) => p.id === place.id ? { ...p, is_featured: nextFeatured } : p));
  };

  const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
  const labelClass = "block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Miejsca</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setPasteModal(true)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <ClipboardPaste size={14} />
            Wklej dane
          </button>
          <button onClick={createPlace} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-foreground rounded-xl hover:bg-stone-700 transition-colors">
            <Plus size={14} />
            Dodaj
          </button>
          <button onClick={fetchPlaces} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      {/* Stats */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => toggleStatusFilter("all")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>
          {places.length} miejsc
        </button>
        <button onClick={() => toggleStatusFilter("published")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>
          {publishedCount} published
        </button>
        <button onClick={() => toggleStatusFilter("draft")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", draftCount > 0 ? (statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200") : (statusFilter === "draft" ? "bg-stone-300 text-stone-700" : "bg-stone-200 text-stone-500 hover:bg-stone-300"))}>
          {draftCount} draft
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
          {displayedTypeKeys.map((type) => {
            const typePlaces = [...filteredPlaces]
              .filter((p) => getPlaceGroupKey(p) === type)
              .sort((a, b) => {
                const statusDiff = statusOrder[a.status] - statusOrder[b.status];
                if (statusDiff !== 0) return statusDiff;
                return a.title.localeCompare(b.title, "pl");
              });
            const stats = sectionStats[type] ?? { all: 0, published: 0, draft: 0 };
            const expandedCategory = isCategoryExpanded(type);
            return (
              <div key={type}>
                <div className="w-full flex items-center gap-2 mb-2 rounded-md px-1.5 py-1 hover:bg-accent/50 transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleCategory(type)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {expandedCategory ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                    <span className="text-lg">{getPlaceCategoryIcon(type)}</span>
                    <h2 className="text-[13px] font-semibold text-foreground">{getPlaceCategoryLabel(type)}</h2>
                  </button>
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "all")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>{stats.all} all</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "published")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>{stats.published} published</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "draft")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", stats.draft > 0 ? (typeFilter === type && statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200") : (typeFilter === type && statusFilter === "draft" ? "bg-stone-300 text-stone-700" : "bg-stone-200 text-stone-500 hover:bg-stone-300"))}>{stats.draft} draft</button>
                  </div>
                </div>
                {expandedCategory && (
                typePlaces.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-white px-3 py-4 text-[12px] text-muted">
                  Brak rekordów dla tego filtra.
                </div>
                ) : (
                <div className="space-y-1.5">
          {typePlaces.map((place, index) => {
            const isExpanded = expanded === place.id;
            const isEditing = editing === place.id;
            const isDraft = place.status !== "published";

            return (
              <div key={place.id} className={cn("rounded-lg border border-border/70", isDraft ? "bg-stone-100 opacity-60" : "bg-white")}>
                {/* Row */}
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  {/* Number */}
                  <span className="shrink-0 w-6 text-center text-[11px] font-mono text-muted-foreground">
                    {index + 1}
                  </span>

                  {/* Type icon */}
                  <span className="shrink-0 text-lg">{getPlaceCategoryIcon(getPlaceMainCategory(place))}</span>

                  {/* Image thumbnail */}
                  {thumbUrl(place.image_thumb, place.image_url) ? (
                    <img src={thumbUrl(place.image_thumb, place.image_url) || ""} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                  ) : (
                    <span className="w-8 h-8 rounded bg-stone-100 shrink-0 flex items-center justify-center text-[10px] text-stone-400">—</span>
                  )}

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{place.title}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5">
                      <span>{getPlaceCategoryLabel(getPlaceMainCategory(place))}</span>
                      <span className="opacity-40">·</span>
                      <span>{place.is_indoor ? "Wewnątrz" : "Na zewnątrz"}</span>
                      {place.street && (
                        <><span className="opacity-40">·</span><span className="truncate max-w-[150px]">{place.street}</span></>
                      )}
                      {place.lat && <><span className="opacity-40">·</span><span>📍</span></>}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <button onClick={() => startEditing(place)} className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Edytuj">
                      <Pencil size={13} />
                    </button>
                  )}

                  {!isEditing && (
                    <button onClick={() => toggleFeatured(place)} className={cn("p-1 rounded transition-colors", place.is_featured ? "text-amber-500 hover:bg-amber-50" : "text-muted-foreground hover:bg-stone-100")} title="Wyróżnij">
                      <Star size={13} fill={place.is_featured ? "currentColor" : "none"} />
                    </button>
                  )}

                  {place.source_url && (
                    <a href={place.source_url} target="_blank" rel="noopener"
                      className="p-1 rounded hover:bg-accent text-muted transition-colors">
                      <ExternalLink size={13} />
                    </a>
                  )}

                  <button onClick={() => toggleStatus(place)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors",
                      place.status === "published"
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                    )}
                    title={place.status === "published" ? "Kliknij aby ukryć" : "Kliknij aby opublikować"}>
                    {place.status === "published" ? "Published" : "Draft"}
                  </button>

                  <button onClick={() => handleDelete(place.id)}
                    className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Usuń">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && !isEditing && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/50 text-[12px] text-muted space-y-1.5">
                    {place.description_short && (
                      <p><span className="font-medium text-foreground">Opis:</span> {place.description_short}</p>
                    )}
                    {place.note && (
                      <p><span className="font-medium text-foreground">Notatka:</span> {place.note}</p>
                    )}
                    {(place.street || place.city) && (
                      <p><span className="font-medium text-foreground">Adres:</span> {[place.street, place.city].filter(Boolean).join(", ")}</p>
                    )}
                    {place.lat && place.lng && (
                      <p><span className="font-medium text-foreground">Współrzędne:</span> {place.lat.toFixed(4)}, {place.lng.toFixed(4)}</p>
                    )}
                  </div>
                )}

                {/* Edit form */}
                {isEditing && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/50">
                    <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Opis miejsca</p>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-3">
                          <label className={labelClass}>Nazwa miejsca</label>
                          <input className={inputClass} value={(editForm.title as string) || ""} onChange={(e) => updateField("title", e.target.value)} />
                        </div>
                        <div className="md:col-span-3">
                          <label className={labelClass}>Organizator</label>
                          <OrganizerCombobox
                            organizers={organizers}
                            value={(editForm.organizer_id as string) || null}
                            onChange={(organizerId) => updateField("organizer_id", organizerId)}
                            inputClassName={inputClass}
                          />
                        </div>
                        <div className="md:col-span-6">
                          <label className={labelClass}>Krótki opis</label>
                          <textarea className={inputClass} rows={2} value={(editForm.description_short as string) || ""} onChange={(e) => updateField("description_short", e.target.value)} />
                        </div>
                        <div className="md:col-span-6">
                          <label className={labelClass}>Pełny opis</label>
                          <textarea className={inputClass} rows={5} value={(editForm.description_long as string) || ""} onChange={(e) => updateField("description_long", e.target.value)} />
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
                          typeLevel1Label="Grupa"
                          typeLevel2Label="Podgrupa"
                          categoryLevel1Label="Typ"
                          categoryLevel2Label="Kategoria"
                          categoryLevel3Label="Tematyka"
                          selectedTypeLevel1Id={typeof editForm.type_lvl_1_id === "string" ? editForm.type_lvl_1_id : null}
                          selectedTypeLevel2Id={typeof editForm.type_lvl_2_id === "string" ? editForm.type_lvl_2_id : null}
                          selectedCategoryLevel1={typeof editForm.category_lvl_1 === "string" ? editForm.category_lvl_1 : null}
                          selectedCategoryLevel2={typeof editForm.category_lvl_2 === "string" ? editForm.category_lvl_2 : null}
                          selectedCategoryLevel3={typeof editForm.category_lvl_3 === "string" ? editForm.category_lvl_3 : null}
                          loading={taxonomyLoading}
                          inputClass={inputClass}
                          labelClass={labelClass}
                          onTypeLevel1Change={(value) => {
                            updateField("type_lvl_1_id", value);
                            updateField("type_lvl_2_id", null);
                          }}
                          onTypeLevel2Change={(value) => updateField("type_lvl_2_id", value)}
                          onCategoryLevel1Change={(value) => {
                            updateField("category_lvl_1", value);
                            updateField("category_lvl_2", null);
                            updateField("category_lvl_3", null);
                          }}
                          onCategoryLevel2Change={(value) => {
                            updateField("category_lvl_2", value);
                            updateField("category_lvl_3", null);
                          }}
                          onCategoryLevel3Change={(value) => updateField("category_lvl_3", value)}
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Linki</p>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-3">
                          <label className={labelClass}>URL źródła</label>
                          <input
                            className={inputClass}
                            value={(editForm.source_url as string) || ""}
                            onChange={(e) => updateField("source_url", e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className={labelClass}>Facebook</label>
                          <input
                            className={inputClass}
                            value={(editForm.facebook_url as string) || ""}
                            onChange={(e) => updateField("facebook_url", e.target.value)}
                            placeholder="https://facebook.com/..."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Szczegóły</p>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div>
                          <label className={labelClass}>Wiek od</label>
                          <input type="number" min={0} max={18} className={inputClass} value={(editForm.age_min as number) ?? ""} onChange={(e) => updateField("age_min", e.target.value ? Number(e.target.value) : null)} />
                        </div>
                        <div>
                          <label className={labelClass}>Wiek do</label>
                          <input type="number" min={0} max={18} className={inputClass} value={(editForm.age_max as number) ?? ""} onChange={(e) => updateField("age_max", e.target.value ? Number(e.target.value) : null)} />
                        </div>
                        <div className="md:col-span-4 flex items-center gap-4 pt-5">
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => updateField("is_indoor", true)}
                              className={cn("px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer", (editForm.is_indoor as boolean) ? "bg-primary text-white border-primary" : "border-border text-muted hover:border-primary/30")}>
                              Wewnątrz
                            </button>
                            <button type="button" onClick={() => updateField("is_indoor", false)}
                              className={cn("px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer", !(editForm.is_indoor as boolean) ? "bg-primary text-white border-primary" : "border-border text-muted hover:border-primary/30")}>
                              Na zewnątrz
                            </button>
                          </div>
                        </div>
                        <div className="md:col-span-6">
                          <label className={labelClass}>Notatka</label>
                          <textarea
                            className={inputClass}
                            rows={4}
                            value={(editForm.note as string) || ""}
                            onChange={(e) => updateField("note", e.target.value)}
                            placeholder="Dodatkowe informacje o miejscu, które warto pokazać na stronie."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/50 p-3 mb-4 space-y-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Feedback</p>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                        <div className="md:col-span-3">
                          <label className={labelClass}>Likes</label>
                          <input
                            type="number"
                            min={0}
                            className={inputClass}
                            value={(editForm.likes as number) ?? 0}
                            onChange={(e) => updateField("likes", Number(e.target.value) || 0)}
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className={labelClass}>Dislikes</label>
                          <input
                            type="number"
                            min={0}
                            className={inputClass}
                            value={(editForm.dislikes as number) ?? 0}
                            onChange={(e) => updateField("dislikes", Number(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Two-column: Address+Map (left) | Image (right) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      {/* Left: Address & Map */}
                      <div className="rounded-lg border border-border/50 p-3 space-y-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lokalizacja</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className={labelClass}>Ulica</label>
                            <div className="relative">
                              <input
                                className={inputClass}
                                value={(editForm.street as string) || ""}
                                placeholder="np. ul. Floriańska 15"
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
                            <input className={inputClass} value={(editForm.city as string) || ""} onChange={(e) => updateField("city", e.target.value)} placeholder="Kraków" />
                          </div>
                          <div>
                            <label className={labelClass}>Dzielnica</label>
                            <select className={inputClass} value={(editForm.district as string) || "Inne"} onChange={(e) => updateField("district", e.target.value)}>
                              {DISTRICT_LIST.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className={labelClass}>Współrzędne</label>
                            <div className="flex items-center gap-2">
                              <input type="number" step="any" className={inputClass} value={(editForm.lat as number) ?? ""} onChange={(e) => updateField("lat", e.target.value ? Number(e.target.value) : null)} placeholder="Lat" />
                              <input type="number" step="any" className={inputClass} value={(editForm.lng as number) ?? ""} onChange={(e) => updateField("lng", e.target.value ? Number(e.target.value) : null)} placeholder="Lng" />
                              <button onClick={geocodeAddress} disabled={geocoding}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground hover:border-primary/30 transition-colors shrink-0 disabled:opacity-50">
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

                      {/* Right: Image */}
                      <ImageSection
                        imageUrl={place.image_url}
                        imageCover={place.image_cover}
                        imageThumb={place.image_thumb}
                        pendingPreview={pendingPreview}
                        onFileSelect={handleFileSelect}
                        onClearPending={clearPendingFile}
                        table="places"
                        itemId={place.id}
                        typeLvl1Id={String(editForm.type_lvl_1_id || place.type_lvl_1_id || place.type_id || "") || null}
                        typeLvl2Id={String(editForm.type_lvl_2_id || place.type_lvl_2_id || place.subtype_id || "") || null}
                        categoryLvl1={String(editForm.category_lvl_1 || place.category_lvl_1 || place.main_category || "")}
                        categoryLvl2={String(editForm.category_lvl_2 || place.category_lvl_2 || place.category || "")}
                        categoryLvl3={String(editForm.category_lvl_3 || place.category_lvl_3 || place.subcategory || "")}
                        onRandomPhoto={(cover, thumb, setId) => setPlaces((prev) => prev.map((p) => p.id === place.id ? { ...p, image_cover: cover, image_thumb: thumb, image_set: setId ?? p.image_set } : p))}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(place.id)} disabled={uploadingImage === place.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors disabled:opacity-50">
                        {uploadingImage === place.id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                        {uploadingImage === place.id ? "Wgrywanie..." : "Zapisz"}
                      </button>
                      <button onClick={() => { clearPendingFile(); setEditing(null); }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground transition-colors">
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

      {/* Paste Import Modal */}
      {pasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-[15px] font-bold text-foreground">Wklej dane</h2>
                <p className="text-[11px] text-muted mt-0.5">Wklej tabelę z Excela, Google Sheets lub DataFrame</p>
              </div>
              <button onClick={() => { setPasteModal(false); setPasteText(""); setPastePreview([]); setPasteHeaders([]); }}
                className="p-1.5 rounded hover:bg-accent text-muted transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Pierwszy wiersz = nagłówki (title, ulica, miasto, typ, opis...)
                </p>
                <textarea
                  className="w-full h-40 px-3 py-2 rounded-lg border border-border text-[12px] font-mono bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                  placeholder={'{\n  "tytul": ["Kraków Zoo"],\n  "ulica": ["ul. Kasy Oszczędności 14"],\n  "miasto": ["Kraków"],\n  "typ": ["Relaks i natura"]\n}'}
                  value={pasteText}
                  onChange={(e) => { setPasteText(e.target.value); parsePastedData(e.target.value); }}
                />
              </div>

              {/* Detected columns */}
              {pasteHeaders.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Rozpoznane kolumny
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {pasteHeaders.map((h) => {
                      const field = resolveField(h);
                      return (
                        <span key={h} className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium",
                          field ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {h} {field ? `→ ${field}` : "(pominięta)"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preview */}
              {pastePreview.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Podgląd ({pastePreview.length} wierszy)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-accent/30">
                          {pasteHeaders.filter((h) => resolveField(h)).map((h) => (
                            <th key={h} className="px-2.5 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                              {resolveField(h)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pastePreview.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-border/50">
                            {pasteHeaders.filter((h) => resolveField(h)).map((h) => (
                              <td key={h} className="px-2.5 py-1.5 text-foreground max-w-[200px] truncate">
                                {row[h] || <span className="text-muted/40">—</span>}
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
              <p className="text-[11px] text-muted">Miejsca zostaną dodane jako Draft</p>
              <div className="flex items-center gap-2">
                {importing && (
                  <span className="text-[11px] text-muted">{importProgress.done}/{importProgress.total}</span>
                )}
                <button onClick={() => { setPasteModal(false); setPasteText(""); setPastePreview([]); setPasteHeaders([]); }}
                  className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:text-foreground transition-colors">
                  Anuluj
                </button>
                <button onClick={runPasteImport} disabled={importing || pastePreview.length === 0 || !pasteHeaders.some((h) => resolveField(h) === "title")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {importing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {importing ? "Importowanie..." : `Importuj ${pastePreview.length} miejsc`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
