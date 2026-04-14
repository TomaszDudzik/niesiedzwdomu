"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardPaste, ExternalLink, Loader2, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Organizer, OrganizerContentType } from "@/types/database";

const CONTENT_TYPE_OPTIONS: { value: OrganizerContentType; label: string }[] = [
  { value: "miejsca", label: "Miejsca" },
  { value: "wydarzenia", label: "Wydarzenia" },
  { value: "kolonie", label: "Kolonie" },
  { value: "zajecia", label: "Zajęcia" },
];

type StatusFilter = "all" | "published" | "draft";

export default function AdminOrganizatorsPage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [pasteModal, setPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePreview, setPastePreview] = useState<Record<string, string>[]>([]);
  const [pasteHeaders, setPasteHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });

  const FIELD_ALIASES: Record<string, string[]> = {
    name: ["name", "nazwa", "organizator", "organizer"],
    description_short: ["description_short", "krotki_opis", "krótki_opis", "krótki opis", "krotki opis", "opis"],
    description_long: ["description_long", "dlugi_opis", "długi_opis", "długi opis", "dlugi opis"],
    source_url: ["source_url", "url_strony", "url", "strona", "website", "link"],
    facebook_url: ["facebook_url", "facebook", "fb"],
  };

  const resolveField = (header: string): string | null => {
    const h = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(h)) return field;
    }
    return null;
  };

  const parsePastedData = (text: string) => {
    const trimmed = text.trim();
    const structMatch = trimmed.match(/[\[{][\s\S]*[\]}]/);
    if (structMatch) {
      const raw = structMatch[0].replace(/#[^\n]*/g, "").replace(/'\s*\n\s*'/g, "").replace(/"\s*\n\s*"/g, "");
      const attempts = [raw, raw.replace(/(?<=[{,[\s])'/g, '"').replace(/'(?=\s*[:,\]}])/g, '"')];
      for (const attempt of attempts) {
        try {
          const parsed = JSON.parse(attempt.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bNone\b/g, "null").replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"));
          if (Array.isArray(parsed) && parsed.length > 0) {
            const headers = Object.keys(parsed[0]);
            setPasteHeaders(headers);
            setPastePreview(parsed.map((r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "")]))));
            return;
          }
        } catch { /* try next */ }
      }
    }
    const lines = trimmed.split("\n").filter((l) => l.trim());
    if (lines.length < 2) { setPasteHeaders([]); setPastePreview([]); return; }
    const sep = lines[0].includes("\t") ? "\t" : ",";
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

  const runPasteImport = async () => {
    if (pastePreview.length === 0) return;
    setImporting(true);
    setImportProgress({ done: 0, total: pastePreview.length });
    const imported: Organizer[] = [];
    for (let i = 0; i < pastePreview.length; i++) {
      const row = pastePreview[i];
      const org: Record<string, unknown> = {};
      for (const header of pasteHeaders) {
        const field = resolveField(header);
        if (!field || !row[header]) continue;
        org[field] = row[header];
      }
      if (!org.name) continue;
      try {
        const res = await fetch("/api/admin/organizers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: org.name, description_short: org.description_short ?? "", description_long: org.description_long ?? "", source_url: org.source_url ?? null, facebook_url: org.facebook_url ?? null }),
        });
        const data = await res.json();
        if (data.id) imported.push(data as Organizer);
      } catch { /* skip */ }
      setImportProgress({ done: i + 1, total: pastePreview.length });
    }
    setOrganizers((prev) => [...imported, ...prev]);
    setImporting(false);
    setPasteModal(false);
    setPasteText("");
    setPastePreview([]);
    setPasteHeaders([]);
    alert(`Zaimportowano ${imported.length} z ${pastePreview.length} organizatorów`);
  };

  const fetchOrganizers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/organizers");
    const data = await res.json();
    if (Array.isArray(data)) setOrganizers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrganizers(); }, [fetchOrganizers]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (statusFilter === "all") return organizers;
    return organizers.filter((o) => o.status === statusFilter);
  }, [organizers, statusFilter]);

  const publishedCount = useMemo(() => organizers.filter((o) => o.status === "published").length, [organizers]);
  const draftCount = useMemo(() => organizers.filter((o) => o.status === "draft").length, [organizers]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const startEditing = (org: Organizer) => {
    setEditing(org.id);
    setEditForm({
      name: org.name,
      description_short: org.description_short ?? "",
      description_long: org.description_long ?? "",
      source_url: org.source_url ?? "",
      facebook_url: org.facebook_url ?? "",
      content_types: org.content_types ?? [],
    });
  };

  const saveEdit = async (id: string) => {
    const updates = {
      name: String(editForm.name || ""),
      description_short: String(editForm.description_short || ""),
      description_long: String(editForm.description_long || ""),
      source_url: editForm.source_url ? String(editForm.source_url) : null,
      facebook_url: editForm.facebook_url ? String(editForm.facebook_url) : null,
      content_types: (editForm.content_types as string[]) || [],
    };
    const res = await fetch("/api/admin/organizers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) { alert(`Błąd: ${data.error}`); return; }
    if (data.updated) {
      setOrganizers((prev) => prev.map((o) => (o.id === id ? data.updated : o)));
    }
    setEditing(null);
    setEditForm({});
  };

  const createOrganizer = async () => {
    const res = await fetch("/api/admin/organizers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nowy organizator", description_short: "", description_long: "", source_url: null, facebook_url: null, content_types: [] }),
    });
    const data = await res.json();
    if (data?.id) {
      setOrganizers((prev) => [data, ...prev]);
      startEditing(data);
    } else {
      alert(`Błąd: ${data.error || "Nie udało się"}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno usunąć organizatora?")) return;
    await fetch("/api/admin/organizers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setOrganizers((prev) => prev.filter((o) => o.id !== id));
  };

  const toggleStatus = async (org: Organizer) => {
    const newStatus = org.status === "published" ? "draft" : "published";
    const res = await fetch("/api/admin/organizers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: org.id, status: newStatus }),
    });
    if (res.ok) setOrganizers((prev) => prev.map((o) => (o.id === org.id ? { ...o, status: newStatus } : o)));
  };

  const toggleContentType = (ct: OrganizerContentType) => {
    const current = (editForm.content_types as string[]) || [];
    const next = current.includes(ct) ? current.filter((c) => c !== ct) : [...current, ct];
    setEditForm((prev) => ({ ...prev, content_types: next }));
  };

  const updateField = (key: string, value: unknown) => setEditForm((prev) => ({ ...prev, [key]: value }));

  const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
  const labelClass = "block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizatorzy</h1>
          <p className="text-[12px] text-muted mt-0.5">Zarządzanie organizatorami wydarzeń, kolonii, zajęć i miejsc</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPasteModal(true)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <ClipboardPaste size={14} /> Wklej dane
          </button>
          <button onClick={createOrganizer} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-foreground rounded-xl hover:bg-stone-700 transition-colors">
            <Plus size={14} /> Dodaj
          </button>
          <button onClick={fetchOrganizers} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Status counters */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setStatusFilter("all")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>
          {organizers.length} wszystkich
        </button>
        <button onClick={() => setStatusFilter("published")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>
          {publishedCount} published
        </button>
        <button onClick={() => setStatusFilter("draft")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", draftCount > 0 ? (statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200") : (statusFilter === "draft" ? "bg-stone-300 text-stone-700" : "bg-stone-200 text-stone-500 hover:bg-stone-300"))}>
          {draftCount} draft
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-white px-4 py-8 text-center text-[13px] text-muted">
          Brak organizatorów{statusFilter !== "all" ? ` ze statusem "${statusFilter}"` : ""}. Dodaj pierwszego.
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((org, index) => {
            const isEditing = editing === org.id;
            return (
              <div key={org.id} className="rounded-lg border border-border/70 bg-white">
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="shrink-0 w-6 text-center text-[11px] font-mono text-muted-foreground">{index + 1}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-foreground truncate">{org.name}</p>
                      {org.content_types?.length > 0 && (
                        <div className="flex gap-1">
                          {org.content_types.map((ct) => (
                            <span key={ct} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent text-muted-foreground">{ct}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {org.description_short && (
                      <p className="text-[11px] text-muted truncate mt-0.5">{org.description_short}</p>
                    )}
                  </div>

                  {(org.source_url || org.facebook_url) && (
                    <a href={(org.source_url || org.facebook_url)!} target="_blank" rel="noopener" className="p-1 rounded hover:bg-accent text-muted transition-colors">
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button onClick={() => toggleStatus(org)} className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors",
                    org.status === "published" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                  )}>
                    {org.status === "published" ? "Published" : "Draft"}
                  </button>
                  <button onClick={() => startEditing(org)} className={cn("p-1 rounded hover:bg-accent transition-colors", isEditing ? "text-primary" : "text-muted")} title="Edytuj">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(org.id)} className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Usuń">
                    <Trash2 size={13} />
                  </button>
                </div>

                {isEditing && (
                  <div className="px-3 pb-3 pt-2 border-t border-border/50">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
                      <div className="md:col-span-6">
                        <label className={labelClass}>Nazwa *</label>
                        <input className={inputClass} value={(editForm.name as string) || ""} onChange={(e) => updateField("name", e.target.value)} />
                      </div>
                      <div className="md:col-span-6">
                        <label className={labelClass}>Krótki opis</label>
                        <textarea rows={2} className={inputClass} value={(editForm.description_short as string) || ""} onChange={(e) => updateField("description_short", e.target.value)} />
                      </div>
                      <div className="md:col-span-6">
                        <label className={labelClass}>Długi opis</label>
                        <textarea rows={4} className={inputClass} value={(editForm.description_long as string) || ""} onChange={(e) => updateField("description_long", e.target.value)} />
                      </div>

                      <div className="md:col-span-3">
                        <label className={labelClass}>URL strony</label>
                        <input className={inputClass} value={(editForm.source_url as string) || ""} onChange={(e) => updateField("source_url", e.target.value)} placeholder="https://..." />
                      </div>
                      <div className="md:col-span-3">
                        <label className={labelClass}>Facebook</label>
                        <input className={inputClass} value={(editForm.facebook_url as string) || ""} onChange={(e) => updateField("facebook_url", e.target.value)} placeholder="https://facebook.com/..." />
                      </div>

                      <div className="md:col-span-6">
                        <label className={labelClass}>Typy treści</label>
                        <div className="flex flex-wrap gap-2">
                          {CONTENT_TYPE_OPTIONS.map((opt) => {
                            const selected = ((editForm.content_types as string[]) || []).includes(opt.value);
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => toggleContentType(opt.value)}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-[11px] font-semibold border-2 transition-all duration-200",
                                  selected
                                    ? "bg-primary/10 text-primary border-primary/40"
                                    : "bg-background text-muted-foreground border-border hover:border-primary/30"
                                )}
                              >
                                {selected ? "✓ " : ""}{opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(org.id)} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors">
                        <Save size={11} /> Zapisz
                      </button>
                      <button onClick={() => { setEditing(null); setEditForm({}); }} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground transition-colors">
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

      {pasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-[15px] font-bold text-foreground">Wklej dane</h2>
                <p className="text-[11px] text-muted mt-0.5">Wklej tabelę z Excela, Google Sheets lub DataFrame</p>
              </div>
              <button onClick={() => { setPasteModal(false); setPasteText(""); setPastePreview([]); setPasteHeaders([]); }} className="p-1.5 rounded hover:bg-accent text-muted transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
              <textarea
                className="w-full h-40 px-3 py-2 rounded-lg border border-border text-[12px] font-mono bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                placeholder={'nazwa\topis\turl\nFundacja ABC\tOpis 1\thttps://...'}
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); parsePastedData(e.target.value); }}
              />
              {pasteHeaders.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pasteHeaders.map((h) => {
                    const field = resolveField(h);
                    return (
                      <span key={h} className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", field ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                        {h} {field ? `→ ${field}` : "(pominięta)"}
                      </span>
                    );
                  })}
                </div>
              )}
              {pastePreview.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-accent/30">
                        {pasteHeaders.filter((h) => resolveField(h)).map((h) => (
                          <th key={h} className="px-2.5 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">{resolveField(h)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pastePreview.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-border/50">
                          {pasteHeaders.filter((h) => resolveField(h)).map((h) => (
                            <td key={h} className="px-2.5 py-1.5 text-foreground max-w-[200px] truncate">{row[h] || "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
              <p className="text-[11px] text-muted">{pastePreview.length} organizatorów do importu</p>
              <div className="flex items-center gap-2">
                {importing && <span className="text-[11px] text-muted">{importProgress.done}/{importProgress.total}</span>}
                <button onClick={() => { setPasteModal(false); setPasteText(""); setPastePreview([]); setPasteHeaders([]); }} className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:text-foreground transition-colors">
                  Anuluj
                </button>
                <button onClick={runPasteImport} disabled={pastePreview.length === 0 || importing} className="px-3 py-1.5 text-[12px] font-medium text-white bg-foreground rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50">
                  {importing ? `Importuję (${importProgress.done}/${importProgress.total})...` : `Importuj ${pastePreview.length}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
