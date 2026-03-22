"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, RefreshCw, Globe,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, X,
  Play, Loader2, Check, RotateCcw, Save, ExternalLink,
  ImagePlus, Star, Eye, EyeOff, LayoutList, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScrapeSource, FetchMethod, PaginationType, EventsMode } from "@/types/database";

type ContentTypeTab = "wydarzenia" | "kolonie" | "miejsca";
type SourceWithCounts = ScrapeSource & { _counts?: { review: number; published_active: number; published_past: number; rejected: number } };
type EventTab = "review" | "published_active" | "published_past" | "rejected";

const CONTENT_TYPE_LABELS: Record<ContentTypeTab, string> = {
  wydarzenia: "Wydarzenia",
  kolonie: "Kolonie",
  miejsca: "Miejsca",
};

const EVENT_TAB_LABELS: Record<EventTab, string> = {
  review: "Do przeglądu",
  published_active: "Aktywne",
  published_past: "Nieaktywne",
  rejected: "Odrzucone",
};

interface ScrapedEvent {
  id: string;
  canonical_event_id: string | null;
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
  source_id: string;
  organizer_name: string | null;
  image_url: string | null;
  registration_url: string | null;
  is_new: boolean;
  source_first_seen: string;
  source_last_seen: string;
  last_change_at: string | null;
  created_at: string;
  scrape_sources: { name: string } | null;
}

// ═══════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<ScrapeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<ScrapeSource | null>(null);
  const [activeTab, setActiveTab] = useState<ContentTypeTab>("wydarzenia");
  const [scraping, setScraping] = useState<string | null>(null);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"sources" | "events">("sources");

  const filteredSources = sources.filter(
    (s) => (s.content_type || "wydarzenia") === activeTab
  );

  const fetchSources = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/sources");
    const data = await res.json();
    setSources(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno chcesz usunąć to źródło?")) return;
    await fetch("/api/admin/sources", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleActive = async (source: ScrapeSource) => {
    const res = await fetch("/api/admin/sources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: source.id, is_active: !source.is_active }),
    });
    if (res.ok) {
      setSources((prev) =>
        prev.map((s) => s.id === source.id ? { ...s, is_active: !s.is_active } : s)
      );
    }
  };

  const handleSave = async (formData: Record<string, unknown>) => {
    if (editingSource) {
      const res = await fetch("/api/admin/sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingSource.id, ...formData }),
      });
      const data = await res.json();
      if (!res.ok) { alert(`Błąd: ${data.error}`); return; }
      setSources((prev) => prev.map((s) => (s.id === editingSource.id ? data : s)));
    } else {
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) { alert(`Błąd: ${data.error}`); return; }
      setSources((prev) => [...prev, data]);
    }
    setShowForm(false);
    setEditingSource(null);
  };


  const triggerScrape = async (source: ScrapeSource) => {
    setScraping(source.id);
    const res = await fetch("/api/admin/sources/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: source.id, name: source.name }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(`${data.message}\n\n${data.output || ""}`);
      fetchSources(); // refresh counts
    } else {
      alert(`Błąd: ${data.error}\n\n${data.output || ""}`);
    }
    setScraping(null);
  };

  return (
    <div className="container-page py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Źródła danych</h1>
        <div className="flex gap-2">
<button onClick={fetchSources} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={() => { setEditingSource(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-white rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors">
            <Plus size={16} /> Dodaj źródło
          </button>
        </div>
      </div>
      <p className="text-sm text-muted mb-6">
        Zarządzaj źródłami i przeglądaj zebrane dane.
      </p>

      {/* View toggle + Content type tabs */}
      <div className="flex items-center gap-4 mb-6">
        {/* View toggle */}
        <div className="flex bg-accent rounded-lg p-0.5">
          <button onClick={() => setViewMode("sources")}
            className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors",
              viewMode === "sources" ? "bg-white text-foreground shadow-sm" : "text-muted hover:text-foreground")}>
            <Layers size={13} /> Źródła
          </button>
          <button onClick={() => setViewMode("events")}
            className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors",
              viewMode === "events" ? "bg-white text-foreground shadow-sm" : "text-muted hover:text-foreground")}>
            <LayoutList size={13} /> Wydarzenia
          </button>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Content type tabs */}
        <div className="flex gap-1">
        {(Object.keys(CONTENT_TYPE_LABELS) as ContentTypeTab[]).map((tab) => {
          const count = sources.filter((s) => (s.content_type || "wydarzenia") === tab).length;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn("px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                activeTab === tab ? "bg-foreground text-white" : "text-muted hover:text-foreground bg-accent")}>
              {CONTENT_TYPE_LABELS[tab]}
              {!loading && <span className="ml-1.5 text-[11px] opacity-70">({count})</span>}
            </button>
          );
        })}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-8">
          <SourceForm source={editingSource} defaultContentType={activeTab} onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingSource(null); }} />
        </div>
      )}

      {/* Events view — flat list of all events */}
      {viewMode === "events" && (
        <AllEventsPanel onCountsChange={fetchSources} />
      )}

      {/* Sources view */}
      {viewMode === "sources" && (
      <div className="space-y-3">
        {filteredSources.map((source) => {
          const isExpanded = expandedSource === source.id;
          return (
            <div key={source.id} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Source header */}
              <div className="p-4 flex items-center gap-4">
                <div className="relative shrink-0">
                  <span className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                    <Globe size={18} className="text-stone-500" />
                  </span>
                  <span className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                    source.is_active ? "bg-emerald-500" : "bg-stone-300")} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-[14px] truncate">{source.name}</p>
                    <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0",
                      source.is_active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500")}>
                      {source.is_active ? "Aktywne" : "Nieaktywne"}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted mt-0.5 truncate">{source.base_url}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1.5 flex-wrap">
                    <span>co {source.scrape_interval_hours}h</span>
                    <span className="opacity-40">·</span>
                    {source.last_scraped_at ? (
                      <span>ostatnio: {new Date(source.last_scraped_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    ) : (
                      <span>jeszcze nie scrapowane</span>
                    )}
                    <span className="opacity-40">·</span>
                    <span className="text-amber-600">{(source as SourceWithCounts)._counts?.review || 0} do przeglądu</span>
                    <span className="opacity-40">·</span>
                    <span className="text-emerald-600">{(source as SourceWithCounts)._counts?.published_active || 0} aktywnych</span>
                    <span className="opacity-40">·</span>
                    <span className="text-stone-400">{(source as SourceWithCounts)._counts?.published_past || 0} nieaktywnych</span>
                    <span className="opacity-40">·</span>
                    <span className="text-red-400">{(source as SourceWithCounts)._counts?.rejected || 0} odrzuconych</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandedSource(isExpanded ? null : source.id)}
                    className={cn("p-1.5 rounded-lg transition-colors", isExpanded ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-stone-100")}
                    title="Pokaż zebrane wydarzenia">
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <button onClick={() => triggerScrape(source)} disabled={scraping === source.id}
                    className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50" title="Scrapuj teraz">
                    {scraping === source.id ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                  </button>
                  <button onClick={() => toggleActive(source)}
                    className={cn("p-1.5 rounded-lg transition-colors", source.is_active ? "text-emerald-500 hover:bg-emerald-50" : "text-stone-400 hover:bg-stone-100")}
                    title={source.is_active ? "Dezaktywuj" : "Aktywuj"}>
                    {source.is_active ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  </button>
                  <button onClick={() => { setEditingSource(source); setShowForm(true); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-stone-100 transition-colors" title="Edytuj">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(source.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Usuń">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Expanded: scraped events */}
              {isExpanded && (
                <SourceEventsPanel sourceId={source.id} sourceName={source.name} onCountsChange={fetchSources} />
              )}
            </div>
          );
        })}

        {!loading && filteredSources.length === 0 && (
          <div className="text-center py-16 text-muted">
            <Globe size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-[14px]">Brak źródeł dla kategorii {CONTENT_TYPE_LABELS[activeTab]}</p>
            <p className="text-[13px] text-muted-foreground mt-1">Dodaj pierwsze źródło, aby rozpocząć scraping.</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// All events panel — flat list across all sources
// ═══════════════════════════════════════════════════════════════════

function AllEventsPanel({ onCountsChange }: { onCountsChange: () => void }) {
  // Reuses SourceEventsPanel with no sourceId filter
  return <SourceEventsPanel sourceId="" sourceName="Wszystkie źródła" onCountsChange={onCountsChange} />;
}

// ═══════════════════════════════════════════════════════════════════
// Source events panel (review functionality per source)
// ═══════════════════════════════════════════════════════════════════

function SourceEventsPanel({ sourceId, sourceName, onCountsChange }: { sourceId: string; sourceName: string; onCountsChange: () => void }) {
  const [events, setEvents] = useState<ScrapedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<EventTab>("review");
  const [acting, setActing] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ScrapedEvent>>({});
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // Track featured state per canonical event (fetched from events table)
  const [featuredMap, setFeaturedMap] = useState<Record<string, boolean>>({});

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const srcParam = sourceId ? `&source_id=${sourceId}` : "";

    if (tab === "published_active" || tab === "published_past") {
      const showPast = tab === "published_past" ? "&show_past=true" : "";
      const res = await fetch(`/api/admin/review?status=published${srcParam}${showPast}`);
      let data = await res.json();
      if (!Array.isArray(data)) data = [];

      // Fetch canonical events for status + image
      const canonRes = await fetch("/api/admin/events");
      const canonEvents: { id: string; status: string; image_url: string | null }[] = await canonRes.json();
      const canonMap = new Map(canonEvents.map((e) => [e.id, e]));

      // Merge canonical image_url into scraped events
      data = data.map((e: ScrapedEvent) => {
        const canon = e.canonical_event_id ? canonMap.get(e.canonical_event_id) : null;
        return {
          ...e,
          image_url: e.image_url || canon?.image_url || null,
        };
      });

      if (tab === "published_active") {
        // Exclude manually hidden (canonical = draft)
        data = data.filter((e: ScrapedEvent) => {
          const canon = e.canonical_event_id ? canonMap.get(e.canonical_event_id) : null;
          return !canon || canon.status === "published";
        });
      } else {
        // Inactive = past date OR manually hidden
        data = data.filter((e: ScrapedEvent) => {
          const d = (e.end_at || e.start_at || "").slice(0, 10);
          const isPast = d && d < today;
          const canon = e.canonical_event_id ? canonMap.get(e.canonical_event_id) : null;
          const isManuallyHidden = canon && canon.status !== "published";
          return isPast || isManuallyHidden;
        });
      }

      setEvents(data);
    } else {
      const res = await fetch(`/api/admin/review?status=${tab}${srcParam}`);
      let data = await res.json();
      if (!Array.isArray(data)) data = [];
      setEvents(data);
    }
    setLoading(false);
  }, [tab, sourceId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  async function handleAction(id: string, action: "approve" | "reject" | "restore" | "delete") {
    setActing(id);
    const res = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(`Błąd: ${data.error}`);
      setActing(null);
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setActing(null);
    onCountsChange();
  }

  // --- Published tab actions (operate on canonical events table) ---

  async function generateImage(event: ScrapedEvent) {
    const canonId = event.canonical_event_id;
    if (!canonId) return;
    setGeneratingImage(event.id);
    try {
      const res = await fetch("/api/admin/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: canonId,
          title: event.title,
          description: event.description_short,
          category: (event.categories || [])[0] || "inne",
        }),
      });
      const data = await res.json();
      if (data.image_url) {
        setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, image_url: data.image_url } : e));
      } else {
        alert(`Błąd: ${data.error || "Nie udało się"}`);
      }
    } catch { alert("Błąd połączenia"); }
    setGeneratingImage(null);
  }

  async function generateReviewImage(event: ScrapedEvent) {
    setGeneratingImage(event.id);
    try {
      // Generate image using scraped event id as temp storage key
      const res = await fetch("/api/admin/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event.id,
          title: event.title,
          description: event.description_short,
          category: (event.categories || [])[0] || "inne",
          target: "scraped",
        }),
      });
      const data = await res.json();
      if (data.image_url) {
        // Save image_url to scraped_events
        await fetch("/api/admin/review", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: event.id, image_url: data.image_url }),
        });
        setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, image_url: data.image_url } : e));
      } else {
        alert(`Błąd: ${data.error || "Nie udało się"}`);
      }
    } catch { alert("Błąd połączenia"); }
    setGeneratingImage(null);
  }

  async function toggleFeatured(event: ScrapedEvent) {
    const canonId = event.canonical_event_id;
    if (!canonId) return;
    const current = featuredMap[canonId] ?? false;
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: canonId, is_featured: !current }),
    });
    if (res.ok) {
      setFeaturedMap((prev) => ({ ...prev, [canonId]: !current }));
    }
  }

  async function deactivateEvent(event: ScrapedEvent) {
    const canonId = event.canonical_event_id;
    if (!canonId) return;
    // Set canonical event to draft (hidden from frontend)
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: canonId, status: "draft" }),
    });
    if (res.ok) {
      // Remove from active list
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      onCountsChange();
    }
  }

  async function reactivateEvent(event: ScrapedEvent) {
    const canonId = event.canonical_event_id;
    if (!canonId) return;
    // Set canonical event back to published (visible on frontend)
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: canonId, status: "published" }),
    });
    if (res.ok) {
      // Remove from inactive list
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      onCountsChange();
    }
  }

  // Fetch featured status for active published events
  useEffect(() => {
    if (tab !== "published_active" || events.length === 0) return;
    const canonIds = events.map((e) => e.canonical_event_id).filter(Boolean) as string[];
    if (canonIds.length === 0) return;
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((allEvents: { id: string; is_featured: boolean }[]) => {
        const feat: Record<string, boolean> = {};
        for (const ev of allEvents) {
          if (canonIds.includes(ev.id)) feat[ev.id] = ev.is_featured;
        }
        setFeaturedMap(feat);
      });
  }, [tab, events]);

  function startEditing(event: ScrapedEvent) {
    setEditing(event.id);
    setExpandedEvent(event.id);
    setEditForm({
      title: event.title, description_short: event.description_short,
      description_long: event.description_long, start_at: event.start_at,
      end_at: event.end_at, venue_name: event.venue_name,
      venue_address: event.venue_address, district: event.district,
      organizer_name: event.organizer_name, age_min: event.age_min,
      age_max: event.age_max, price_from: event.price_from,
      price_to: event.price_to, is_free: event.is_free,
      categories: event.categories, image_url: event.image_url,
    });
  }

  async function saveEdit(id: string) {
    setActing(id);
    const res = await fetch("/api/admin/review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editForm }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(`Błąd: ${data.error}`);
      setActing(null);
      return;
    }
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...editForm } as ScrapedEvent : e)));
    setEditing(null);
    setActing(null);
    onCountsChange();
  }

  const updateField = (key: string, value: unknown) => setEditForm((prev) => ({ ...prev, [key]: value }));

  const inputClass = "w-full px-2.5 py-1.5 rounded-md border border-border text-[13px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20";
  const labelClass = "block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="border-t border-border bg-stone-50/30">
      {/* Event status tabs */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <div className="flex gap-1">
          {(Object.keys(EVENT_TAB_LABELS) as EventTab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setEditing(null); }}
              className={cn("px-2.5 py-1 rounded text-[12px] font-medium transition-colors",
                tab === t ? "bg-foreground text-white" : "text-muted hover:text-foreground bg-white border border-border")}>
              {EVENT_TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <button onClick={fetchEvents} className="ml-auto p-1 rounded hover:bg-accent text-muted transition-colors">
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Events list */}
      <div className="px-4 pb-4">
        {loading ? (
          <p className="text-[12px] text-muted py-4">Ładowanie...</p>
        ) : events.length === 0 ? (
          <p className="text-[12px] text-muted py-4">Brak wydarzeń w tej kategorii.</p>
        ) : (
          <div className="space-y-1.5">
            {events.map((event, index) => {
              const isEditing = editing === event.id;
              const isExpanded = expandedEvent === event.id;
              const isInactive = tab === "published_past";
              const isKids = _isKidsEvent(event);

              return (
                <div key={event.id} className={cn("rounded-lg border border-border/70", isInactive ? "bg-stone-300 opacity-60 grayscale" : "bg-white")}>
                  {/* Event row */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    {/* Number */}
                    <span className="shrink-0 w-6 text-center text-[11px] font-mono text-muted-foreground">
                      {index + 1}
                    </span>

                    {/* Kids badge */}
                    <span className={cn("shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                      isKids ? "bg-violet-50 text-violet-600 border border-violet-100" : "bg-stone-50 text-stone-400 border border-stone-100")}>
                      {isKids ? "Dzieci" : "Ogólne"}
                    </span>

                    {/* Image thumbnail — click to preview */}
                    {event.image_url ? (
                      <img
                        src={event.image_url}
                        alt=""
                        className="w-8 h-8 rounded object-cover shrink-0 cursor-pointer hover:ring-2 hover:ring-foreground/20 transition-shadow"
                        onClick={(e) => { e.stopPropagation(); setPreviewImage(event.image_url); }}
                      />
                    ) : (
                      <span className="w-8 h-8 rounded bg-stone-100 shrink-0 flex items-center justify-center text-[10px] text-stone-400">—</span>
                    )}

                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-medium text-foreground truncate">{event.title}</p>
                        {event.is_new && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                            NOWE
                          </span>
                        )}
                        {!event.is_new && event.last_change_at && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100">
                            Zmienione
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5">
                        {event.start_at && <span>{event.start_at.slice(0, 10)}</span>}
                        {event.venue_name && <><span className="opacity-40">·</span><span className="truncate max-w-[150px]">{event.venue_name}</span></>}
                        {(event.age_min != null || event.age_max != null) && (
                          <><span className="opacity-40">·</span><span>{event.age_min ?? "?"}-{event.age_max ?? "?"} lat</span></>
                        )}
                        {!sourceId && event.scrape_sources?.name && (
                          <><span className="opacity-40">·</span><span className="text-muted-foreground font-medium">{event.scrape_sources.name}</span></>
                        )}
                        <span className="opacity-40">·</span>
                        <span className="text-muted-foreground">{_timeAgo(event.source_first_seen)}</span>
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="hidden sm:flex gap-1 shrink-0">
                      {(event.categories || []).slice(0, 2).map((cat) => (
                        <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-muted font-medium">{cat}</span>
                      ))}
                    </div>

                    {/* Edit toggle */}
                    {tab === "review" && !isEditing && (
                      <>
                        <button onClick={() => generateReviewImage(event)} disabled={generatingImage === event.id}
                          className={cn("p-1 rounded transition-colors", event.image_url ? "text-muted-foreground hover:bg-stone-100" : "text-blue-500 hover:bg-blue-50")}
                          title={event.image_url ? "Wygeneruj nowy obrazek" : "Wygeneruj obrazek"}>
                          {generatingImage === event.id ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                        </button>
                        <button onClick={() => startEditing(event)} className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Edytuj">
                          <Pencil size={13} />
                        </button>
                      </>
                    )}

                    {/* Expand */}
                    <button onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                      className="p-1 rounded hover:bg-accent text-muted transition-colors">
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {/* Source link */}
                    <a href={event.source_url} target="_blank" rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-accent text-muted transition-colors">
                      <ExternalLink size={13} />
                    </a>

                    {/* Review actions */}
                    {tab === "review" && !isEditing && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleAction(event.id, "approve")} disabled={acting === event.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors disabled:opacity-50">
                          <Check size={11} /> Publikuj
                        </button>
                        <button onClick={() => handleAction(event.id, "reject")} disabled={acting === event.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground transition-colors disabled:opacity-50">
                          <X size={11} /> Odrzuć
                        </button>
                      </div>
                    )}

                    {/* Restore from rejected */}
                    {tab === "rejected" && (
                      <>
                        <button onClick={() => handleAction(event.id, "restore")} disabled={acting === event.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground transition-colors disabled:opacity-50">
                          <RotateCcw size={11} /> Przywróć
                        </button>
                        <button onClick={() => handleAction(event.id, "delete")} disabled={acting === event.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-400 border border-red-200 rounded hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                          <Trash2 size={11} /> Usuń
                        </button>
                      </>
                    )}

                    {/* Active published actions */}
                    {tab === "published_active" && !isEditing && (() => {
                      const canonId = event.canonical_event_id;
                      const isFeatured = canonId ? (featuredMap[canonId] ?? false) : false;
                      return (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => generateImage(event)} disabled={generatingImage === event.id}
                            className={cn("p-1 rounded transition-colors", event.image_url ? "text-muted-foreground hover:bg-stone-100" : "text-blue-500 hover:bg-blue-50")}
                            title={event.image_url ? "Wygeneruj nowy obrazek" : "Wygeneruj obrazek"}>
                            {generatingImage === event.id ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
                          </button>
                          <button onClick={() => toggleFeatured(event)}
                            className={cn("p-1 rounded transition-colors", isFeatured ? "text-amber-500 hover:bg-amber-50" : "text-muted-foreground hover:bg-stone-100")}
                            title="Wyróżnij">
                            <Star size={13} fill={isFeatured ? "currentColor" : "none"} />
                          </button>
                          <button onClick={() => startEditing(event)} className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Edytuj">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deactivateEvent(event)}
                            className="p-1 rounded text-muted-foreground hover:bg-stone-100 transition-colors"
                            title="Dezaktywuj — ukryj ze strony">
                            <EyeOff size={13} />
                          </button>
                        </div>
                      );
                    })()}

                    {/* Inactive published actions */}
                    {tab === "published_past" && !isEditing && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => reactivateEvent(event)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-emerald-600 border border-emerald-200 rounded hover:bg-emerald-50 transition-colors"
                          title="Aktywuj ponownie — pokaż na stronie">
                          <Eye size={11} /> Aktywuj
                        </button>
                      </div>
                    )}

                    {/* Edit mode actions */}
                    {isEditing && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => saveEdit(event.id)} disabled={acting === event.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors disabled:opacity-50">
                          <Save size={11} /> Zapisz
                        </button>
                        <button onClick={() => setEditing(null)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground transition-colors">
                          <X size={11} /> Anuluj
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded: view */}
                  {isExpanded && !isEditing && (
                    <div className="px-3 pb-3 pt-1 border-t border-border/50 text-[12px] text-muted space-y-1.5">
                      {event.description_short && (
                        <p><span className="font-medium text-foreground">Krótki opis:</span> {event.description_short}</p>
                      )}
                      {event.description_long && (
                        <div>
                          <span className="font-medium text-foreground">Pełny opis:</span>
                          <p className="mt-0.5 text-muted whitespace-pre-line leading-relaxed">{event.description_long.slice(0, 500)}{event.description_long.length > 500 ? "..." : ""}</p>
                        </div>
                      )}
                      <p><span className="font-medium text-foreground">Organizator:</span> {event.organizer_name || "—"}</p>
                      <p><span className="font-medium text-foreground">Adres:</span> {event.venue_address || "—"} {event.district && `(${event.district})`}</p>
                      <p><span className="font-medium text-foreground">Wiek:</span> {event.age_min ?? "—"} – {event.age_max ?? "—"}</p>
                      <p><span className="font-medium text-foreground">Cena:</span> {event.is_free ? "Bezpłatne" : event.price_from != null ? `${event.price_from} zł` : "—"}</p>
                    </div>
                  )}

                  {/* Expanded: edit form */}
                  {isExpanded && isEditing && (
                    <div className="px-3 pb-3 pt-2 border-t border-border/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className={labelClass}>Tytuł</label>
                          <input className={inputClass} value={editForm.title || ""} onChange={(e) => updateField("title", e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className={labelClass + " mb-0"}>Krótki opis</label>
                            {editForm.description_long && (
                              <button type="button" onClick={() => {
                                const long = editForm.description_long || "";
                                // Take first sentence or first 200 chars
                                const firstSentence = long.split(/[.!?]\s/)[0];
                                const short = firstSentence.length > 200 ? firstSentence.slice(0, 197) + "..." : firstSentence + (firstSentence.endsWith(".") ? "" : ".");
                                updateField("description_short", short);
                              }} className="text-[10px] font-medium text-blue-500 hover:text-blue-700 transition-colors">
                                Generuj z opisu ↓
                              </button>
                            )}
                          </div>
                          <textarea className={inputClass} rows={2} value={editForm.description_short || ""} onChange={(e) => updateField("description_short", e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelClass}>Pełny opis</label>
                          <textarea className={inputClass} rows={5} value={editForm.description_long || ""} onChange={(e) => updateField("description_long", e.target.value)} />
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
                        <div className="flex items-center gap-2 pt-5">
                          <input type="checkbox" id={`free-${event.id}`} checked={editForm.is_free || false} onChange={(e) => updateField("is_free", e.target.checked)} className="rounded border-border" />
                          <label htmlFor={`free-${event.id}`} className="text-[12px] text-foreground">Bezpłatne</label>
                        </div>
                        <div>
                          <label className={labelClass}>Kategorie</label>
                          <input className={inputClass} value={(editForm.categories || []).join(", ")} onChange={(e) => updateField("categories", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
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

      {/* Image preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-2xl max-h-[80vh] p-2 bg-white rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="" className="w-full h-auto rounded-xl" />
            <button onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-7 h-7 bg-white rounded-full shadow-lg border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Source form
// ═══════════════════════════════════════════════════════════════════

function SourceForm({
  source, defaultContentType = "wydarzenia", onSave, onCancel,
}: {
  source: ScrapeSource | null; defaultContentType?: ContentTypeTab;
  onSave: (data: Record<string, unknown>) => void; onCancel: () => void;
}) {
  const initial = source || {
    name: "", base_url: "", fetch_method: "requests" as FetchMethod,
    is_active: true, pre_filtered: true, content_type: defaultContentType,
    listing_urls: [] as string[], pagination: "none" as PaginationType,
    max_pages: 5, page_pattern: null as string | null,
    events_mode: "inline" as EventsMode, link_selector: "a",
    default_venue_name: null as string | null, default_venue_address: null as string | null,
    default_district: null as string | null, default_organizer: null as string | null,
    default_is_free: null as boolean | null, scrape_interval_hours: 24,
    extraction_instructions: null as string | null, notes: null as string | null,
  };

  const [contentType, setContentType] = useState<ContentTypeTab>((source?.content_type as ContentTypeTab) || defaultContentType);
  const [name, setName] = useState(initial.name);
  const [baseUrl, setBaseUrl] = useState(initial.base_url);
  const [fetchMethod, setFetchMethod] = useState<FetchMethod>(initial.fetch_method);
  const [isActive, setIsActive] = useState(initial.is_active);
  const [listingUrls, setListingUrls] = useState(initial.listing_urls?.join("\n") || "");
  const [pagination, setPagination] = useState<PaginationType>(initial.pagination);
  const [maxPages, setMaxPages] = useState(initial.max_pages);
  const [pagePattern, setPagePattern] = useState(initial.page_pattern || "");
  const [eventsMode, setEventsMode] = useState<EventsMode>(initial.events_mode);
  const [linkSelector, setLinkSelector] = useState(initial.link_selector || "a");
  const [scrapeInterval, setScrapeInterval] = useState(initial.scrape_interval_hours);
  const [notes, setNotes] = useState(initial.notes || "");
  const [extractionInstructions, setExtractionInstructions] = useState(initial.extraction_instructions || "");
  const [showDefaults, setShowDefaults] = useState(false);
  const [defaultVenueName, setDefaultVenueName] = useState(initial.default_venue_name || "");
  const [defaultVenueAddress, setDefaultVenueAddress] = useState(initial.default_venue_address || "");
  const [defaultDistrict, setDefaultDistrict] = useState(initial.default_district || "");
  const [defaultOrganizer, setDefaultOrganizer] = useState(initial.default_organizer || "");
  const [defaultIsFree, setDefaultIsFree] = useState(initial.default_is_free);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const DISTRICTS = ["", "Stare Miasto", "Kazimierz", "Podgórze", "Nowa Huta", "Krowodrza", "Bronowice", "Zwierzyniec", "Dębniki", "Prądnik Czerwony", "Prądnik Biały", "Czyżyny", "Bieżanów", "Inne"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = listingUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    onSave({
      name, base_url: baseUrl, content_type: contentType,
      fetch_method: fetchMethod, is_active: isActive, pre_filtered: true,
      listing_urls: urls, pagination, max_pages: maxPages,
      page_pattern: pagePattern || null, events_mode: eventsMode,
      link_selector: eventsMode === "links" ? linkSelector : null,
      default_venue_name: defaultVenueName || null, default_venue_address: defaultVenueAddress || null,
      default_district: defaultDistrict || null, default_organizer: defaultOrganizer || null,
      default_is_free: defaultIsFree, scrape_interval_hours: scrapeInterval,
      extraction_instructions: extractionInstructions || null, notes: notes || null,
    });
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-stone-50/50">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">{source ? "Edytuj źródło" : "Nowe źródło"}</h2>
          <p className="text-[12px] text-muted mt-0.5">{source ? "Zmień konfigurację źródła" : "Dodaj nową stronę do scrapowania"}</p>
        </div>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-stone-100 text-muted"><X size={18} /></button>
      </div>

      <div className="p-6 space-y-8">
        <FormSection title="Podstawowe informacje" subtitle="Nazwa, adres strony i typ treści">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nazwa źródła" required hint="Przyjazna nazwa do wyświetlania w panelu">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="np. Nowohuckie Centrum Kultury" required />
            </Field>
            <Field label="Strona główna" required hint="Adres główny strony źródłowej">
              <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={inputClass} placeholder="https://nck.krakow.pl" type="url" required />
            </Field>
            <Field label="Typ treści">
              <select value={contentType} onChange={(e) => setContentType(e.target.value as ContentTypeTab)} className={inputClass}>
                <option value="wydarzenia">Wydarzenia</option>
                <option value="kolonie">Kolonie</option>
                <option value="miejsca">Miejsca</option>
              </select>
            </Field>
            <Field label="Status">
              <label className="flex items-center gap-2 h-[42px]">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
                <span className="text-sm">Aktywne — scraper będzie pobierał dane</span>
              </label>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Strony do scrapowania" subtitle="Adresy URL z listami wydarzeń">
          <Field label="Adresy URL" required hint="Jedna linia = jeden adres. Scraper odwiedzi każdy po kolei.">
            <textarea value={listingUrls} onChange={(e) => setListingUrls(e.target.value)} className={cn(inputClass, "min-h-[80px] font-mono text-xs")}
              placeholder={"https://nck.krakow.pl/wydarzenia/\nhttps://nck.krakow.pl/wydarzenia/page/2/"} />
          </Field>
          <div className="grid sm:grid-cols-3 gap-4 mt-4">
            <Field label="Automatyczna paginacja" hint="Scraper sam doda kolejne strony">
              <select value={pagination} onChange={(e) => setPagination(e.target.value as PaginationType)} className={inputClass}>
                <option value="none">Wyłączona</option>
                <option value="path">Włączona — /page/2/...</option>
                <option value="query">Włączona — ?page=2...</option>
              </select>
            </Field>
            {pagination !== "none" && (
              <>
                <Field label="Ile stron?" hint="Np. 5 = strona 1 do 5">
                  <input type="number" value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value))} className={inputClass} min={1} max={50} />
                </Field>
                <Field label="Wzorzec URL" hint="{page} = numer strony">
                  <input value={pagePattern} onChange={(e) => setPagePattern(e.target.value)} className={cn(inputClass, "font-mono text-xs")} placeholder=".../page/{page}/" />
                </Field>
              </>
            )}
          </div>
        </FormSection>

        <FormSection title="Instrukcje ekstrakcji" subtitle="Dodatkowe wskazówki dla AI — jak rozpoznawać i interpretować dane na tej stronie">
          <Field label="Instrukcje (opcjonalne)" hint="Napisz po polsku lub angielsku. Opisz strukturę strony, co jest ważne, czego unikać. Te instrukcje są dołączane do prompta LLM przy każdym scrapowaniu tego źródła.">
            <textarea
              value={extractionInstructions}
              onChange={(e) => setExtractionInstructions(e.target.value)}
              className={cn(inputClass, "min-h-[120px] text-xs")}
              placeholder={`Przykłady:\n\n• Na tej stronie każdy event jest w osobnym bloku z datą i linkiem\n• Ignoruj eventy z etykietą "wyprzedane"\n• Ceny są w formacie "od XX zł" w prawym rogu\n• Venue jest wspólne dla wszystkich — Centrum Kultury Podgórza\n• Data jest w formacie DD.MM.YYYY\n• Niektóre eventy mają godzinę w opisie, np. "godz. 17:00"`}
            />
          </Field>
        </FormSection>

        <FormSection title="Harmonogram" subtitle="Jak często scrapować">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Interwał (godziny)" hint="Co ile godzin sprawdzać źródło">
              <input type="number" value={scrapeInterval} onChange={(e) => setScrapeInterval(Number(e.target.value))} className={inputClass} min={1} />
            </Field>
            <Field label="Notatki" hint="Wewnętrzne uwagi">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Opcjonalne..." />
            </Field>
          </div>
        </FormSection>

        <div>
          <button type="button" onClick={() => setShowDefaults(!showDefaults)}
            className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors">
            {showDefaults ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Wartości domyślne
          </button>
          <p className="text-[12px] text-muted-foreground mt-0.5 ml-5">Dane wstawiane gdy scraper ich nie znajdzie</p>
          {showDefaults && (
            <div className="grid sm:grid-cols-2 gap-4 mt-4 pl-5 border-l-2 border-stone-200">
              <Field label="Nazwa miejsca"><input value={defaultVenueName} onChange={(e) => setDefaultVenueName(e.target.value)} className={inputClass} /></Field>
              <Field label="Adres"><input value={defaultVenueAddress} onChange={(e) => setDefaultVenueAddress(e.target.value)} className={inputClass} /></Field>
              <Field label="Dzielnica"><select value={defaultDistrict} onChange={(e) => setDefaultDistrict(e.target.value)} className={inputClass}>{DISTRICTS.map((d) => (<option key={d} value={d}>{d || "— brak —"}</option>))}</select></Field>
              <Field label="Organizator"><input value={defaultOrganizer} onChange={(e) => setDefaultOrganizer(e.target.value)} className={inputClass} /></Field>
              <Field label="Domyślnie bezpłatne"><select value={defaultIsFree === null ? "" : defaultIsFree ? "true" : "false"} onChange={(e) => { const v = e.target.value; setDefaultIsFree(v === "" ? null : v === "true"); }} className={inputClass}><option value="">— brak —</option><option value="true">Tak</option><option value="false">Nie</option></select></Field>
            </div>
          )}
        </div>

        <div>
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors">
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Zaawansowane
          </button>
          <p className="text-[12px] text-muted-foreground mt-0.5 ml-5">Metoda pobierania i tryb ekstrakcji</p>
          {showAdvanced && (
            <div className="grid sm:grid-cols-3 gap-4 mt-4 pl-5 border-l-2 border-stone-200">
              <Field label="Metoda" hint="requests = szybki, playwright = z JS"><select value={fetchMethod} onChange={(e) => setFetchMethod(e.target.value as FetchMethod)} className={inputClass}><option value="requests">requests</option><option value="playwright">playwright</option></select></Field>
              <Field label="Tryb" hint="Inline = dane na listingu, Links = wchodzi w linki"><select value={eventsMode} onChange={(e) => setEventsMode(e.target.value as EventsMode)} className={inputClass}><option value="inline">Inline</option><option value="links">Links</option></select></Field>
              {eventsMode === "links" && <Field label="Selektor CSS"><input value={linkSelector} onChange={(e) => setLinkSelector(e.target.value)} className={cn(inputClass, "font-mono text-xs")} placeholder="a.event-card" /></Field>}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-stone-50/50">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">Anuluj</button>
        <button type="submit" className="px-5 py-2.5 bg-foreground text-white rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors">{source ? "Zapisz zmiany" : "Utwórz źródło"}</button>
      </div>
    </form>
  );
}

function FormSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div><h3 className="text-[14px] font-semibold text-foreground">{title}</h3><p className="text-[12px] text-muted-foreground mt-0.5 mb-4">{subtitle}</p>{children}</div>;
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-muted mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>{hint && <p className="text-[11px] text-muted-foreground mb-1.5">{hint}</p>}{children}</div>;
}

function _isKidsEvent(event: ScrapedEvent): boolean {
  // Check age range — if max age is set and <= 18, it's a kids event
  if (event.age_max != null && event.age_max <= 18) return true;
  if (event.age_min != null && event.age_min <= 12) return true;
  // Check title/description for kids keywords
  const text = `${event.title} ${event.description_short || ""}`.toLowerCase();
  const kidsKeywords = [
    "dzieci", "dziecko", "rodzin", "familij", "maluch", "niemowl",
    "przedszkolak", "szkolny", "junior", "kids", "bajk", "contakids",
    "warsztaty plastyczne", "warsztaty dla", "zabaw",
  ];
  return kidsKeywords.some((kw) => text.includes(kw));
}

function _timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "przed chwilą";
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h temu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d temu`;
  return new Date(dateStr).toLocaleDateString("pl-PL");
}
