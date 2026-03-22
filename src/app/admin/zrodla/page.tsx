"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Globe,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  X,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScrapeSource, FetchMethod, PaginationType, EventsMode } from "@/types/database";

// ─── Empty source template ───────────────────────────────────────
const EMPTY_SOURCE: Omit<ScrapeSource, "id" | "created_at" | "updated_at" | "last_scraped_at" | "total_events_pushed"> = {
  name: "",
  base_url: "",
  fetch_method: "requests",
  extractor_type: "llm",
  is_active: true,
  pre_filtered: false,
  listing_urls: [],
  pagination: "none",
  max_pages: 5,
  page_pattern: null,
  events_mode: "inline",
  link_selector: "a",
  default_venue_name: null,
  default_venue_address: null,
  default_district: null,
  default_organizer: null,
  default_is_free: null,
  scrape_interval_hours: 24,
  notes: null,
};

// ─── Main page ───────────────────────────────────────────────────
export default function AdminSourcesPage() {
  const [sources, setSources] = useState<ScrapeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<ScrapeSource | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/sources");
    const data = await res.json();
    setSources(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno chcesz usunąć to źródło? Powiązane dane scrapera zostaną usunięte.")) return;
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
        prev.map((s) =>
          s.id === source.id ? { ...s, is_active: !s.is_active } : s
        )
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
      if (!res.ok) {
        alert(`Błąd: ${data.error}`);
        return;
      }
      setSources((prev) =>
        prev.map((s) => (s.id === editingSource.id ? data : s))
      );
    } else {
      const res = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Błąd: ${data.error}`);
        return;
      }
      setSources((prev) => [...prev, data]);
    }
    setShowForm(false);
    setEditingSource(null);
  };

  const handleSeed = async () => {
    const res = await fetch("/api/admin/sources/seed", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      alert(`Błąd: ${data.error}`);
      return;
    }
    const msg = [
      data.created?.length ? `Zaimportowano: ${data.created.join(", ")}` : null,
      data.skipped?.length ? `Pominięto (już istnieją): ${data.skipped.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    alert(msg || "Brak źródeł do zaimportowania.");
    if (data.created?.length) fetchSources();
  };

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Źródła</h1>
          <p className="text-sm text-muted mt-1">
            {loading
              ? "Ładowanie..."
              : `${sources.length} źródeł · ${sources.filter((s) => s.is_active).length} aktywnych`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors"
          >
            <Download size={14} /> Importuj z YAML
          </button>
          <button
            onClick={fetchSources}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors"
          >
            <RefreshCw size={14} /> Odśwież
          </button>
          <button
            onClick={() => {
              setEditingSource(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-white rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            <Plus size={16} />
            Dodaj źródło
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-8">
          <SourceForm
            source={editingSource}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingSource(null);
            }}
          />
        </div>
      )}

      {/* Sources table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-stone-50/50">
                <th className="text-left px-5 py-3 font-medium text-muted">Źródło</th>
                <th className="text-left px-5 py-3 font-medium text-muted hidden md:table-cell">Metoda</th>
                <th className="text-left px-5 py-3 font-medium text-muted hidden lg:table-cell">Tryb</th>
                <th className="text-left px-5 py-3 font-medium text-muted hidden md:table-cell">Status</th>
                <th className="text-left px-5 py-3 font-medium text-muted hidden lg:table-cell">Ostatni scrape</th>
                <th className="text-right px-5 py-3 font-medium text-muted">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr
                  key={source.id}
                  className="border-b border-border/50 last:border-0 hover:bg-stone-50/50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                        <Globe size={18} className="text-stone-500" />
                      </span>
                      <div>
                        <p className="font-medium text-foreground line-clamp-1">{source.name}</p>
                        <p className="text-xs text-muted mt-0.5 line-clamp-1 max-w-[300px]">
                          {source.base_url}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-600">
                      {source.fetch_method}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-muted">
                    {source.events_mode === "inline" ? "Inline" : "Links"}
                    {source.pre_filtered && (
                      <span className="ml-1.5 text-xs text-emerald-600">· pre-filtered</span>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span
                      className={cn(
                        "inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium",
                        source.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-stone-100 text-stone-500"
                      )}
                    >
                      {source.is_active ? "Aktywne" : "Nieaktywne"}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-muted text-xs">
                    {source.last_scraped_at
                      ? new Date(source.last_scraped_at).toLocaleString("pl-PL")
                      : "—"}
                    <span className="block text-stone-400">
                      {source.total_events_pushed} opublikowanych
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleActive(source)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          source.is_active
                            ? "text-emerald-500 hover:bg-emerald-50"
                            : "text-stone-400 hover:bg-stone-100"
                        )}
                        title={source.is_active ? "Dezaktywuj" : "Aktywuj"}
                      >
                        {source.is_active ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingSource(source);
                          setShowForm(true);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-stone-100 transition-colors"
                        title="Edytuj"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(source.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Usuń"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && sources.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted">
                    Brak źródeł. Dodaj pierwsze źródło, aby rozpocząć scraping.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Source form ──────────────────────────────────────────────────
function SourceForm({
  source,
  onSave,
  onCancel,
}: {
  source: ScrapeSource | null;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const initial = source || EMPTY_SOURCE;
  const [name, setName] = useState(initial.name);
  const [baseUrl, setBaseUrl] = useState(initial.base_url);
  const [fetchMethod, setFetchMethod] = useState<FetchMethod>(initial.fetch_method);
  const [isActive, setIsActive] = useState(initial.is_active);
  const [preFiltered, setPreFiltered] = useState(initial.pre_filtered);
  const [listingUrls, setListingUrls] = useState(initial.listing_urls?.join("\n") || "");
  const [pagination, setPagination] = useState<PaginationType>(initial.pagination);
  const [maxPages, setMaxPages] = useState(initial.max_pages);
  const [pagePattern, setPagePattern] = useState(initial.page_pattern || "");
  const [eventsMode, setEventsMode] = useState<EventsMode>(initial.events_mode);
  const [linkSelector, setLinkSelector] = useState(initial.link_selector || "a");
  const [defaultVenueName, setDefaultVenueName] = useState(initial.default_venue_name || "");
  const [defaultVenueAddress, setDefaultVenueAddress] = useState(initial.default_venue_address || "");
  const [defaultDistrict, setDefaultDistrict] = useState(initial.default_district || "");
  const [defaultOrganizer, setDefaultOrganizer] = useState(initial.default_organizer || "");
  const [defaultIsFree, setDefaultIsFree] = useState(initial.default_is_free);
  const [scrapeInterval, setScrapeInterval] = useState(initial.scrape_interval_hours);
  const [notes, setNotes] = useState(initial.notes || "");

  const [showDefaults, setShowDefaults] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = listingUrls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    onSave({
      name,
      base_url: baseUrl,
      fetch_method: fetchMethod,
      is_active: isActive,
      pre_filtered: preFiltered,
      listing_urls: urls,
      pagination,
      max_pages: maxPages,
      page_pattern: pagePattern || null,
      events_mode: eventsMode,
      link_selector: eventsMode === "links" ? linkSelector : null,
      default_venue_name: defaultVenueName || null,
      default_venue_address: defaultVenueAddress || null,
      default_district: defaultDistrict || null,
      default_organizer: defaultOrganizer || null,
      default_is_free: defaultIsFree,
      scrape_interval_hours: scrapeInterval,
      notes: notes || null,
    });
  };

  const DISTRICTS = [
    "", "Stare Miasto", "Kazimierz", "Podgórze", "Nowa Huta",
    "Krowodrza", "Bronowice", "Zwierzyniec", "Dębniki",
    "Prądnik Czerwony", "Prądnik Biały", "Czyżyny", "Bieżanów", "Inne",
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          {source ? "Edytuj źródło" : "Nowe źródło"}
        </h2>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-stone-100 text-muted">
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-5">
        {/* Row: Name + Base URL */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nazwa" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="np. Nowohuckie Centrum Kultury"
              required
            />
          </Field>
          <Field label="Bazowy URL" required>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="https://example.com"
              type="url"
              required
            />
          </Field>
        </div>

        {/* Row: Fetch method + Active + Pre-filtered */}
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Metoda pobierania">
            <select
              value={fetchMethod}
              onChange={(e) => setFetchMethod(e.target.value as FetchMethod)}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="requests">requests (HTML)</option>
              <option value="playwright">playwright (JS)</option>
            </select>
          </Field>
          <Field label="Interwał (h)">
            <input
              type="number"
              value={scrapeInterval}
              onChange={(e) => setScrapeInterval(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              min={1}
            />
          </Field>
          <Field label="Status">
            <label className="flex items-center gap-2 h-[42px]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Aktywne</span>
            </label>
          </Field>
          <Field label="Filtrowanie">
            <label className="flex items-center gap-2 h-[42px]">
              <input
                type="checkbox"
                checked={preFiltered}
                onChange={(e) => setPreFiltered(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Tylko dla dzieci</span>
            </label>
          </Field>
        </div>

        {/* Listing URLs */}
        <Field label="Adresy listing (po jednym w linii)">
          <textarea
            value={listingUrls}
            onChange={(e) => setListingUrls(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[80px] font-mono text-xs"
            placeholder={"https://example.com/events\nhttps://example.com/events/page/2"}
          />
        </Field>

        {/* Pagination */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Paginacja">
            <select
              value={pagination}
              onChange={(e) => setPagination(e.target.value as PaginationType)}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="none">Brak</option>
              <option value="path">Path (/page/2/)</option>
              <option value="query">Query (?page=2)</option>
            </select>
          </Field>
          {pagination !== "none" && (
            <>
              <Field label="Max stron">
                <input
                  type="number"
                  value={maxPages}
                  onChange={(e) => setMaxPages(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  min={1}
                  max={50}
                />
              </Field>
              <Field label="Wzorzec URL ({page})">
                <input
                  value={pagePattern}
                  onChange={(e) => setPagePattern(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-xs"
                  placeholder="https://example.com/events/page/{page}/"
                />
              </Field>
            </>
          )}
        </div>

        {/* Events mode */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tryb wyodrębniania">
            <select
              value={eventsMode}
              onChange={(e) => setEventsMode(e.target.value as EventsMode)}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="inline">Inline (dane na stronie listingu)</option>
              <option value="links">Links (linki do podstron wydarzeń)</option>
            </select>
          </Field>
          {eventsMode === "links" && (
            <Field label="Selektor CSS linków">
              <input
                value={linkSelector}
                onChange={(e) => setLinkSelector(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-xs"
                placeholder="a.event-card"
              />
            </Field>
          )}
        </div>

        {/* Defaults — collapsible */}
        <div>
          <button
            type="button"
            onClick={() => setShowDefaults(!showDefaults)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            {showDefaults ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Wartości domyślne
          </button>
          {showDefaults && (
            <div className="grid sm:grid-cols-2 gap-4 mt-4 pl-4 border-l-2 border-stone-200">
              <Field label="Nazwa miejsca">
                <input
                  value={defaultVenueName}
                  onChange={(e) => setDefaultVenueName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </Field>
              <Field label="Adres miejsca">
                <input
                  value={defaultVenueAddress}
                  onChange={(e) => setDefaultVenueAddress(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </Field>
              <Field label="Dzielnica">
                <select
                  value={defaultDistrict}
                  onChange={(e) => setDefaultDistrict(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d || "— nie wybrano —"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Organizator">
                <input
                  value={defaultOrganizer}
                  onChange={(e) => setDefaultOrganizer(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </Field>
              <Field label="Darmowe domyślnie">
                <select
                  value={defaultIsFree === null ? "" : defaultIsFree ? "true" : "false"}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDefaultIsFree(v === "" ? null : v === "true");
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">— nie ustawiono —</option>
                  <option value="true">Tak</option>
                  <option value="false">Nie</option>
                </select>
              </Field>
            </div>
          )}
        </div>

        {/* Notes */}
        <Field label="Notatki">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[60px]"
            placeholder="Dodatkowe uwagi o źródle..."
          />
        </Field>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors"
        >
          Anuluj
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 bg-foreground text-white rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          {source ? "Zapisz zmiany" : "Utwórz źródło"}
        </button>
      </div>
    </form>
  );
}

// ─── Field wrapper ───────────────────────────────────────────────
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
