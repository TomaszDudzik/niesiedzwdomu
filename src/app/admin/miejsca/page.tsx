"use client";

import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  Trash2, Pencil, Loader2, RefreshCw,
  ExternalLink, ImagePlus, Save, X, Upload, XCircle, MapPin, Plus, ClipboardPaste,
} from "lucide-react";
import { PLACE_TYPE_LABELS, PLACE_TYPE_ICONS, DISTRICT_LIST } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Place } from "@/types/database";

const MiniMapLazy = lazy(() => import("./mini-map").then((m) => ({ default: m.MiniMap })));

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
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

  const parsePastedData = (text: string) => {
    const trimmed = text.trim();

    // Try Python dict format: { "key": [...], ... } or data = { ... }
    const dictMatch = trimmed.match(/\{[\s\S]*\}/);
    if (dictMatch) {
      // Strip Python comments, join implicit string concatenation
      const raw = dictMatch[0]
        .replace(/#[^\n]*/g, "")
        .replace(/'\s*\n\s*'/g, "")
        .replace(/"\s*\n\s*"/g, "");
      // Try parsing: first as-is (double quotes), then with single→double quote conversion
      const attempts = [
        raw, // already double-quoted JSON
        raw.replace(/(?<=[{,[\s])'/g, '"').replace(/'(?=\s*[:,\]}])/g, '"'), // only convert delimiter quotes
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

          // Dict of lists format: { "col": [val1, val2], "col2": [val1, val2] }
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
    description_short: ["description_short", "krótki opis", "krotki opis", "opis krótki", "short description", "opis"],
    description_long: ["description_long", "długi opis", "dlugi opis", "opis długi", "long description"],
    place_type: ["place_type", "typ", "type", "kategoria", "category"],
    street: ["street", "ulica", "adres", "address"],
    city: ["city", "miasto"],
    district: ["district", "dzielnica"],
    lat: ["lat", "latitude"],
    lng: ["lng", "lon", "longitude"],
    age_min: ["age_min", "wiek od", "wiek_min"],
    age_max: ["age_max", "wiek do", "wiek_max"],
    source_url: ["source_url", "url", "strona", "website", "link"],
    facebook_url: ["facebook_url", "facebook", "fb", "facebook page"],
    is_indoor: ["is_indoor", "wewnątrz", "indoor"],
    is_free: ["is_free", "darmowe", "free"],
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
      const place: Record<string, unknown> = { city: "Kraków", district: "Inne", place_type: "inne" };
      for (const header of pasteHeaders) {
        const field = resolveField(header);
        if (!field || !row[header]) continue;
        const val = row[header];
        if (["lat", "lng", "age_min", "age_max"].includes(field)) {
          place[field] = Number(val) || null;
        } else if (["is_indoor", "is_free"].includes(field)) {
          place[field] = val.toLowerCase() === "true" || val === "1" || val.toLowerCase() === "tak";
        } else {
          place[field] = val;
        }
      }
      if (!place.title) continue;

      try {
        const res = await fetch("/api/admin/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(place),
        });
        const data = await res.json();
        if (data.id) imported.push({ ...data, content_type: "place" } as Place);
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
      place_type: place.place_type,
      street: place.street,
      city: place.city,
      district: place.district,
      lat: place.lat,
      lng: place.lng,
      age_min: place.age_min,
      age_max: place.age_max,
      source_url: place.source_url,
      facebook_url: place.facebook_url ?? "",
      is_indoor: place.is_indoor,
      is_free: place.is_free,
      likes: place.likes,
      dislikes: place.dislikes,
    });
  };

  const saveEdit = async (id: string) => {
    let newImageUrl: string | null = null;

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
        if (data.image_url) {
          newImageUrl = `${data.image_url.split("?")[0]}?t=${Date.now()}`;
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
      place_type: editForm.place_type,
      is_indoor: editForm.is_indoor,
      street: editForm.street || "",
      city: editForm.city || "Kraków",
      district: editForm.district,
      lat: editForm.lat ?? null,
      lng: editForm.lng ?? null,
      age_min: editForm.age_min ?? null,
      age_max: editForm.age_max ?? null,
      source_url: editForm.source_url || null,
      likes: Number(editForm.likes) || 0,
      dislikes: Number(editForm.dislikes) || 0,
    };

    // Include new image_url in DB payload if image was uploaded
    if (newImageUrl) {
      dbPayload.image_url = newImageUrl;
    }

    // Try saving with facebook_url, retry without if column doesn't exist
    const payloadWithFb = editForm.facebook_url
      ? { id, ...dbPayload, facebook_url: String(editForm.facebook_url) }
      : { id, ...dbPayload };

    let saveRes = await fetch("/api/admin/places", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadWithFb),
    });
    let saveData = await saveRes.json();

    // Retry without facebook_url if column doesn't exist
    if (!saveRes.ok && saveData.error?.includes("facebook_url")) {
      saveRes = await fetch("/api/admin/places", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...dbPayload }),
      });
      saveData = await saveRes.json();
    }

    if (!saveRes.ok) {
      alert(`Błąd zapisu: ${saveData.error || "Nieznany błąd"}`);
      return;
    }

    setPlaces((prev) => prev.map((p) => p.id === id ? {
      ...p,
      ...dbPayload,
      ...(newImageUrl ? { image_url: newImageUrl } : {}),
    } as Place : p));
    setPendingFile(null);
    setPendingPreview(null);
    setEditing(null);
  };

  const updateField = (key: string, value: unknown) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const generateImage = async (place: Place) => {
    setGeneratingImage(place.id);
    try {
      const res = await fetch("/api/admin/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: place.id,
          title: place.title,
          description_short: place.description_short,
          description_long: place.description_long,
          target: "places",
        }),
      });
      const data = await res.json();
      if (data.image_url) {
        const bustUrl = `${data.image_url.split("?")[0]}?t=${Date.now()}`;
        setPlaces((prev) => prev.map((p) => p.id === place.id ? { ...p, image_url: bustUrl } : p));
      } else {
        alert(`Błąd: ${data.error || "Nie udało się"}`);
      }
    } catch { alert("Błąd połączenia"); }
    setGeneratingImage(null);
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
    const street = editForm.street as string;
    const city = editForm.city as string;
    if (!street) { alert("Wpisz ulicę"); return; }
    setGeocoding(true);
    try {
      const res = await fetch("/api/admin/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: street, city: city || "Kraków" }),
      });
      const data = await res.json();
      if (data.lat && data.lng) {
        setEditForm((prev) => ({
          ...prev,
          lat: data.lat,
          lng: data.lng,
          ...(data.district ? { district: data.district } : {}),
          ...(data.city ? { city: data.city } : {}),
        }));
      } else {
        alert(data.error || "Nie znaleziono lokalizacji");
      }
    } catch { alert("Błąd połączenia"); }
    setGeocoding(false);
  };

  const createPlace = async () => {
    const res = await fetch("/api/admin/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nowe miejsce", place_type: "inne", street: "", city: "Kraków", district: "Inne" }),
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
          <button onClick={createPlace} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors">
            <Plus size={14} />
            Dodaj miejsce
          </button>
          <button onClick={fetchPlaces} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      <p className="text-sm text-muted mb-6">{places.length} miejsc</p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : (
        <div className="space-y-1.5">
          {[...places].sort((a, b) => a.title.localeCompare(b.title, "pl")).map((place, index) => {
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
                  <span className="shrink-0 text-lg">{PLACE_TYPE_ICONS[place.place_type] || "📍"}</span>

                  {/* Image thumbnail */}
                  {place.image_url ? (
                    <img src={place.image_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                  ) : (
                    <span className="w-8 h-8 rounded bg-stone-100 shrink-0 flex items-center justify-center text-[10px] text-stone-400">—</span>
                  )}

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{place.title}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5">
                      <span>{PLACE_TYPE_LABELS[place.place_type] || place.place_type}</span>
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
                        : "bg-stone-200 text-stone-500 hover:bg-stone-300"
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
                    {/* Top fields */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Tytuł</label>
                        <input className={inputClass} value={(editForm.title as string) || ""} onChange={(e) => updateField("title", e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Wiek od</label>
                        <input type="number" min={0} max={18} className={inputClass} value={(editForm.age_min as number) ?? ""} onChange={(e) => updateField("age_min", e.target.value ? Number(e.target.value) : null)} />
                      </div>
                      <div>
                        <label className={labelClass}>Wiek do</label>
                        <input type="number" min={0} max={18} className={inputClass} value={(editForm.age_max as number) ?? ""} onChange={(e) => updateField("age_max", e.target.value ? Number(e.target.value) : null)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>URL źródła</label>
                        <input className={inputClass} value={(editForm.source_url as string) || ""} onChange={(e) => updateField("source_url", e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Facebook</label>
                        <input className={inputClass} value={(editForm.facebook_url as string) || ""} onChange={(e) => updateField("facebook_url", e.target.value)} placeholder="https://facebook.com/..." />
                      </div>
                      <div>
                        <label className={labelClass}>Typ</label>
                        <select className={inputClass} value={(editForm.place_type as string) || "inne"} onChange={(e) => updateField("place_type", e.target.value)}>
                          {Object.entries(PLACE_TYPE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>👍 Likes</label>
                        <input type="number" min={0} className={inputClass} value={(editForm.likes as number) ?? 0} onChange={(e) => updateField("likes", Number(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label className={labelClass}>👎 Dislikes</label>
                        <input type="number" min={0} className={inputClass} value={(editForm.dislikes as number) ?? 0} onChange={(e) => updateField("dislikes", Number(e.target.value) || 0)} />
                      </div>
                      <div className="flex gap-1.5 items-end">
                        <button type="button" onClick={() => updateField("is_indoor", true)}
                          className={cn(inputClass, "!w-auto px-3 py-1.5 text-center cursor-pointer", (editForm.is_indoor as boolean) ? "!bg-primary !text-white !border-primary" : "")}>
                          Wewnątrz
                        </button>
                        <button type="button" onClick={() => updateField("is_indoor", false)}
                          className={cn(inputClass, "!w-auto px-3 py-1.5 text-center cursor-pointer", !(editForm.is_indoor as boolean) ? "!bg-primary !text-white !border-primary" : "")}>
                          Na zewnątrz
                        </button>
                      </div>
                      <div className="md:col-span-4">
                        <label className={labelClass}>Krótki opis</label>
                        <textarea className={inputClass} rows={2} value={(editForm.description_short as string) || ""} onChange={(e) => updateField("description_short", e.target.value)} />
                      </div>
                      <div className="md:col-span-4">
                        <label className={labelClass}>Długi opis</label>
                        <textarea className={inputClass} rows={6} value={(editForm.description_long as string) || ""} onChange={(e) => updateField("description_long", e.target.value)} />
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
                            <input className={inputClass} value={(editForm.street as string) || ""} onChange={(e) => updateField("street", e.target.value)} placeholder="np. ul. Floriańska 15" />
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
                      <div className="rounded-lg border border-border/50 p-3 space-y-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Obrazek</p>
                        {(pendingPreview || place.image_url) && (
                          <div className="relative">
                            <img
                              src={pendingPreview || place.image_url!}
                              alt=""
                              className={cn("w-full aspect-[3/2] rounded-lg object-cover border border-border", pendingPreview && "ring-2 ring-primary/40")}
                            />
                            {pendingPreview && (
                              <button onClick={clearPendingFile}
                                className="absolute top-1.5 right-1.5 bg-white rounded-full shadow-sm border border-border p-0.5 hover:bg-red-50 transition-colors"
                                title="Usuń">
                                <XCircle size={14} className="text-red-500" />
                              </button>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer">
                            <Upload size={11} />
                            {pendingPreview ? "Zmień plik" : "Wgraj plik"}
                            <input type="file" accept="image/*" className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }} />
                          </label>
                          <button onClick={() => generateImage(place)} disabled={generatingImage === place.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-50">
                            {generatingImage === place.id ? <Loader2 size={11} className="animate-spin" /> : <ImagePlus size={11} />}
                            {generatingImage === place.id ? "Generowanie..." : "Generuj AI"}
                          </button>
                        </div>
                        {pendingPreview && (
                          <span className="text-[10px] text-primary font-medium">Nowy plik — zapisz aby wgrać</span>
                        )}
                      </div>
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
