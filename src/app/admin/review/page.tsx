"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, ExternalLink, RefreshCw, ChevronDown, ChevronUp, Pencil, Save, RotateCcw } from "lucide-react";

interface ScrapedEvent {
  id: string;
  title: string;
  description_short: string | null;
  description_long: string | null;
  start_at: string | null;
  end_at: string | null;
  venue_name: string | null;
  venue_address: string | null;
  district: string | null;
  categories: string[];
  tags: string[];
  age_min: number | null;
  age_max: number | null;
  price_from: number | null;
  price_to: number | null;
  is_free: boolean | null;
  confidence_score: number;
  status: string;
  source_url: string;
  organizer_name: string | null;
  image_url: string | null;
  registration_url: string | null;
  created_at: string;
  scrape_sources: { name: string } | null;
}

type Tab = "review" | "published" | "rejected";

export default function ReviewPage() {
  const [events, setEvents] = useState<ScrapedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("review");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ScrapedEvent>>({});

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/review?status=${tab}`);
    const data = await res.json();
    setEvents(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function handleAction(id: string, action: "approve" | "reject" | "restore") {
    setActing(id);
    const res = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(`Błąd: ${data.error}`);
      setActing(null);
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setActing(null);
  }

  function startEditing(event: ScrapedEvent) {
    setEditing(event.id);
    setExpanded(event.id);
    setEditForm({
      title: event.title,
      description_short: event.description_short,
      description_long: event.description_long,
      start_at: event.start_at,
      end_at: event.end_at,
      venue_name: event.venue_name,
      venue_address: event.venue_address,
      district: event.district,
      organizer_name: event.organizer_name,
      age_min: event.age_min,
      age_max: event.age_max,
      price_from: event.price_from,
      price_to: event.price_to,
      is_free: event.is_free,
      categories: event.categories,
      image_url: event.image_url,
    });
  }

  async function saveEdit(id: string) {
    setActing(id);
    const res = await fetch("/api/admin/review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editForm }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(`Błąd: ${data.error}`);
      setActing(null);
      return;
    }
    // Update local state
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...editForm } as ScrapedEvent : e))
    );
    setEditing(null);
    setActing(null);
  }

  function cancelEdit() {
    setEditing(null);
    setEditForm({});
  }

  const updateField = (key: string, value: unknown) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "review", label: "Do przeglądu" },
    { key: "published", label: "Opublikowane" },
    { key: "rejected", label: "Odrzucone" },
  ];

  const inputClass = "w-full px-2.5 py-1.5 rounded-md border border-border text-[13px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20";
  const labelClass = "block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Review scraped events</h1>
        <button
          onClick={fetchEvents}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-muted hover:text-foreground border border-border rounded-md hover:border-[#CCC] transition-colors"
        >
          <RefreshCw size={13} /> Odśwież
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setEditing(null); }}
            className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              tab === t.key
                ? "bg-foreground text-white"
                : "text-muted hover:text-foreground bg-accent"
            }`}
          >
            {t.label}
            {tab === t.key && !loading && (
              <span className="ml-1.5 text-[11px] opacity-70">({events.length})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[13px] text-muted">Ładowanie...</p>
      ) : events.length === 0 ? (
        <p className="text-[13px] text-muted">Brak wydarzeń w tej kategorii.</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const isEditing = editing === event.id;
            const isExpanded = expanded === event.id;

            return (
              <div key={event.id} className="border border-border rounded-lg">
                {/* Row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Confidence badge */}
                  <span className={`shrink-0 w-10 text-center text-[12px] font-semibold rounded px-1.5 py-0.5 ${
                    event.confidence_score >= 0.85
                      ? "bg-green-50 text-green-700"
                      : event.confidence_score >= 0.5
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                  }`}>
                    {Math.round(event.confidence_score * 100)}
                  </span>

                  {/* Title + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-foreground truncate">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-2 text-[12px] text-muted mt-0.5">
                      {event.start_at && <span>{event.start_at.slice(0, 10)}</span>}
                      {event.venue_name && <><span className="opacity-40">·</span><span>{event.venue_name}</span></>}
                      {event.district && <><span className="opacity-40">·</span><span>{event.district}</span></>}
                      {event.scrape_sources && <><span className="opacity-40">·</span><span className="text-muted-foreground">{event.scrape_sources.name}</span></>}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="hidden sm:flex gap-1 shrink-0">
                    {(event.categories || []).slice(0, 2).map((cat) => (
                      <span key={cat} className="text-[11px] px-1.5 py-0.5 rounded bg-accent text-muted font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>

                  {/* Edit button */}
                  {tab === "review" && !isEditing && (
                    <button
                      onClick={() => startEditing(event)}
                      className="p-1 rounded hover:bg-accent transition-colors text-muted"
                      title="Edytuj przed publikacją"
                    >
                      <Pencil size={14} />
                    </button>
                  )}

                  {/* Expand */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : event.id)}
                    className="p-1 rounded hover:bg-accent transition-colors text-muted"
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {/* Source link */}
                  <a
                    href={event.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-accent transition-colors text-muted"
                  >
                    <ExternalLink size={14} />
                  </a>

                  {/* Actions */}
                  {tab === "review" && !isEditing && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleAction(event.id, "approve")}
                        disabled={acting === event.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium bg-foreground text-white rounded-md hover:bg-[#333] transition-colors disabled:opacity-50"
                      >
                        <Check size={12} /> Publikuj
                      </button>
                      <button
                        onClick={() => handleAction(event.id, "reject")}
                        disabled={acting === event.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-muted border border-border rounded-md hover:border-[#CCC] hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        <X size={12} /> Odrzuć
                      </button>
                    </div>
                  )}

                  {/* Restore from rejected */}
                  {tab === "rejected" && (
                    <button
                      onClick={() => handleAction(event.id, "restore")}
                      disabled={acting === event.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-muted border border-border rounded-md hover:border-[#CCC] hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={12} /> Przywróć
                    </button>
                  )}

                  {/* Edit mode actions */}
                  {isEditing && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => saveEdit(event.id)}
                        disabled={acting === event.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium bg-foreground text-white rounded-md hover:bg-[#333] transition-colors disabled:opacity-50"
                      >
                        <Save size={12} /> Zapisz
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-muted border border-border rounded-md hover:border-[#CCC] hover:text-foreground transition-colors"
                      >
                        <X size={12} /> Anuluj
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded: view or edit mode */}
                {isExpanded && !isEditing && (
                  <div className="px-4 pb-3 pt-1 border-t border-border text-[13px] text-muted space-y-1">
                    {event.description_short && <p><span className="font-medium text-foreground">Opis:</span> {event.description_short}</p>}
                    <p><span className="font-medium text-foreground">Organizator:</span> {event.organizer_name || "—"}</p>
                    <p><span className="font-medium text-foreground">Venue:</span> {event.venue_name || "—"}</p>
                    <p><span className="font-medium text-foreground">Adres:</span> {event.venue_address || "—"}</p>
                    <p><span className="font-medium text-foreground">Dzielnica:</span> {event.district || "—"}</p>
                    <p><span className="font-medium text-foreground">Wiek:</span> {event.age_min ?? "—"} – {event.age_max ?? "—"}</p>
                    <p><span className="font-medium text-foreground">Cena:</span> {event.is_free ? "Bezpłatne" : event.price_from != null ? `${event.price_from} zł` : "—"}</p>
                    <p><span className="font-medium text-foreground">Źródło:</span> {event.scrape_sources?.name || "—"}</p>
                    <p><span className="font-medium text-foreground">URL:</span> <a href={event.source_url} target="_blank" className="underline">{event.source_url}</a></p>
                  </div>
                )}

                {isExpanded && isEditing && (
                  <div className="px-4 pb-4 pt-3 border-t border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Tytuł</label>
                        <input className={inputClass} value={editForm.title || ""} onChange={(e) => updateField("title", e.target.value)} />
                      </div>

                      <div className="md:col-span-2">
                        <label className={labelClass}>Krótki opis</label>
                        <textarea className={inputClass} rows={2} value={editForm.description_short || ""} onChange={(e) => updateField("description_short", e.target.value)} />
                      </div>

                      <div className="md:col-span-2">
                        <label className={labelClass}>Pełny opis</label>
                        <textarea className={inputClass} rows={4} value={editForm.description_long || ""} onChange={(e) => updateField("description_long", e.target.value)} />
                      </div>

                      <div>
                        <label className={labelClass}>Data od</label>
                        <input type="datetime-local" className={inputClass} value={editForm.start_at?.slice(0, 16) || ""} onChange={(e) => updateField("start_at", e.target.value ? e.target.value + ":00+02:00" : null)} />
                      </div>

                      <div>
                        <label className={labelClass}>Data do</label>
                        <input type="datetime-local" className={inputClass} value={editForm.end_at?.slice(0, 16) || ""} onChange={(e) => updateField("end_at", e.target.value ? e.target.value + ":00+02:00" : null)} />
                      </div>

                      <div>
                        <label className={labelClass}>Venue</label>
                        <input className={inputClass} value={editForm.venue_name || ""} onChange={(e) => updateField("venue_name", e.target.value)} />
                      </div>

                      <div>
                        <label className={labelClass}>Adres</label>
                        <input className={inputClass} value={editForm.venue_address || ""} onChange={(e) => updateField("venue_address", e.target.value)} />
                      </div>

                      <div>
                        <label className={labelClass}>Dzielnica</label>
                        <input className={inputClass} value={editForm.district || ""} onChange={(e) => updateField("district", e.target.value)} />
                      </div>

                      <div>
                        <label className={labelClass}>Organizator</label>
                        <input className={inputClass} value={editForm.organizer_name || ""} onChange={(e) => updateField("organizer_name", e.target.value)} />
                      </div>

                      <div>
                        <label className={labelClass}>Wiek od</label>
                        <input type="number" className={inputClass} value={editForm.age_min ?? ""} onChange={(e) => updateField("age_min", e.target.value ? Number(e.target.value) : null)} />
                      </div>

                      <div>
                        <label className={labelClass}>Wiek do</label>
                        <input type="number" className={inputClass} value={editForm.age_max ?? ""} onChange={(e) => updateField("age_max", e.target.value ? Number(e.target.value) : null)} />
                      </div>

                      <div>
                        <label className={labelClass}>Cena od (zł)</label>
                        <input type="number" step="0.01" className={inputClass} value={editForm.price_from ?? ""} onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          updateField("price_from", val);
                          updateField("is_free", val === null || val === 0);
                        }} />
                      </div>

                      <div>
                        <label className={labelClass}>Cena do (zł)</label>
                        <input type="number" step="0.01" className={inputClass} value={editForm.price_to ?? ""} onChange={(e) => updateField("price_to", e.target.value ? Number(e.target.value) : null)} />
                      </div>

                      <div className="flex items-center gap-2">
                        <input type="checkbox" id={`free-${event.id}`} checked={editForm.is_free || false} onChange={(e) => updateField("is_free", e.target.checked)} className="rounded border-border" />
                        <label htmlFor={`free-${event.id}`} className="text-[13px] text-foreground">Bezpłatne</label>
                      </div>

                      <div>
                        <label className={labelClass}>Kategorie (po przecinku)</label>
                        <input className={inputClass} value={(editForm.categories || []).join(", ")} onChange={(e) => updateField("categories", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
                      </div>

                      <div>
                        <label className={labelClass}>URL zdjęcia</label>
                        <input className={inputClass} value={editForm.image_url || ""} onChange={(e) => updateField("image_url", e.target.value || null)} />
                      </div>
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
