"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trash2, Pencil, Eye, EyeOff, Loader2, RefreshCw,
  ChevronDown, ChevronUp, ExternalLink, ImagePlus, Save, X,
} from "lucide-react";
import { PLACE_TYPE_LABELS, PLACE_TYPE_ICONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Place, PlaceType } from "@/types/database";

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);

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
    setEditForm({
      title: place.title,
      description_short: place.description_short,
      description_long: place.description_long,
      place_type: place.place_type,
      address: place.address,
      source_url: place.source_url,
      is_indoor: place.is_indoor,
      is_free: place.is_free,
    });
  };

  const saveEdit = async (id: string) => {
    await fetch("/api/admin/places", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editForm }),
    });
    setPlaces((prev) => prev.map((p) => p.id === id ? { ...p, ...editForm } as Place : p));
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

  const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
  const labelClass = "block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Miejsca</h1>
        <button onClick={fetchPlaces} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>
      <p className="text-sm text-muted mb-6">{places.length} miejsc</p>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : (
        <div className="space-y-1.5">
          {places.map((place, index) => {
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
                      {place.address && place.address !== "Kraków" && (
                        <><span className="opacity-40">·</span><span className="truncate max-w-[150px]">{place.address}</span></>
                      )}
                      {place.lat && <><span className="opacity-40">·</span><span>📍</span></>}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <>
                      <button onClick={() => generateImage(place)} disabled={generatingImage === place.id}
                        className={cn("p-1 rounded transition-colors", place.image_url ? "text-muted-foreground hover:bg-stone-100" : "text-blue-500 hover:bg-blue-50")}
                        title={place.image_url ? "Wygeneruj nowy obrazek" : "Wygeneruj obrazek"}>
                        {generatingImage === place.id ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                      </button>
                      <button onClick={() => startEditing(place)} className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Edytuj">
                        <Pencil size={13} />
                      </button>
                    </>
                  )}

                  <button onClick={() => setExpanded(isExpanded ? null : place.id)}
                    className="p-1 rounded hover:bg-accent text-muted transition-colors">
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {place.source_url && (
                    <a href={place.source_url} target="_blank" rel="noopener"
                      className="p-1 rounded hover:bg-accent text-muted transition-colors">
                      <ExternalLink size={13} />
                    </a>
                  )}

                  <button onClick={() => toggleStatus(place)}
                    className="p-1 rounded text-muted-foreground hover:bg-stone-100 transition-colors"
                    title={place.status === "published" ? "Ukryj" : "Publikuj"}>
                    {place.status === "published" ? <EyeOff size={13} /> : <Eye size={13} />}
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
                    {place.address && (
                      <p><span className="font-medium text-foreground">Adres:</span> {place.address}</p>
                    )}
                    {place.lat && place.lng && (
                      <p><span className="font-medium text-foreground">Współrzędne:</span> {place.lat.toFixed(4)}, {place.lng.toFixed(4)}</p>
                    )}
                  </div>
                )}

                {/* Edit form */}
                {isEditing && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Tytuł</label>
                        <input className={inputClass} value={(editForm.title as string) || ""} onChange={(e) => updateField("title", e.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Krótki opis</label>
                        <textarea className={inputClass} rows={2} value={(editForm.description_short as string) || ""} onChange={(e) => updateField("description_short", e.target.value)} />
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
                        <label className={labelClass}>Adres</label>
                        <input className={inputClass} value={(editForm.address as string) || ""} onChange={(e) => updateField("address", e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>URL źródła</label>
                        <input className={inputClass} value={(editForm.source_url as string) || ""} onChange={(e) => updateField("source_url", e.target.value)} />
                      </div>
                      <div className="flex gap-4 items-end">
                        <label className="flex items-center gap-2 text-[12px]">
                          <input type="checkbox" checked={(editForm.is_indoor as boolean) || false} onChange={(e) => updateField("is_indoor", e.target.checked)} />
                          Wewnątrz
                        </label>
                        <label className="flex items-center gap-2 text-[12px]">
                          <input type="checkbox" checked={(editForm.is_free as boolean) || false} onChange={(e) => updateField("is_free", e.target.checked)} />
                          Bezpłatne
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(place.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors">
                        <Save size={11} /> Zapisz
                      </button>
                      <button onClick={() => setEditing(null)}
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
    </div>
  );
}
