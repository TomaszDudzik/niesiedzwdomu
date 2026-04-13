"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Pencil, Plus, RefreshCw, Save, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Organizer } from "@/types/database";

export default function AdminOrganizatorsPage() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  const fetchOrganizers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/organizers");
    const data = await res.json();
    if (Array.isArray(data)) setOrganizers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrganizers(); }, [fetchOrganizers]);

  const startEditing = (org: Organizer) => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setEditing(org.id);
    setEditForm({
      name: org.name,
      description_short: org.description_short ?? "",
      description_long: org.description_long ?? "",
      image_url: org.image_url ?? "",
      source_url: org.source_url ?? "",
      facebook_url: org.facebook_url ?? "",
    });
  };

  const clearPendingFile = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  };

  const saveEdit = async (id: string) => {
    let newImageUrl: string | null = null;

    if (pendingFile) {
      setUploadingImage(id);
      try {
        const formData = new FormData();
        formData.append("file", pendingFile);
        formData.append("id", id);
        formData.append("target", "organizers");
        const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
        const data = await res.json();
        if (data.image_url) {
          newImageUrl = `${String(data.image_url).split("?")[0]}?t=${Date.now()}`;
        } else {
          alert(`Błąd obrazka: ${data.error || "Nie udało się"}`);
        }
      } catch {
        alert("Błąd połączenia przy wgrywaniu obrazka");
      }
      setUploadingImage(null);
    }

    const updates: Record<string, unknown> = {
      name: String(editForm.name || ""),
      description_short: String(editForm.description_short || ""),
      description_long: String(editForm.description_long || ""),
      image_url: newImageUrl || (editForm.image_url ? String(editForm.image_url) : null),
      source_url: editForm.source_url ? String(editForm.source_url) : null,
      facebook_url: editForm.facebook_url ? String(editForm.facebook_url) : null,
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
    clearPendingFile();
    setEditing(null);
    setEditForm({});
  };

  const createOrganizer = async () => {
    const res = await fetch("/api/admin/organizers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nowy organizator", description_short: "", description_long: "", image_url: null, source_url: null, facebook_url: null }),
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
    await fetch("/api/admin/organizers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setOrganizers((prev) => prev.filter((o) => o.id !== id));
  };

  const updateField = (key: string, value: unknown) => setEditForm((prev) => ({ ...prev, [key]: value }));

  const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
  const labelClass = "block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizatorzy</h1>
          <p className="text-[12px] text-muted mt-0.5">Nazwa, opis i zdjęcie pobierane przez kafelki kolonii</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={createOrganizer} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-foreground rounded-xl hover:bg-stone-700 transition-colors">
            <Plus size={14} /> Dodaj
          </button>
          <button onClick={fetchOrganizers} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : organizers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-white px-4 py-8 text-center text-[13px] text-muted">
          Brak organizatorów. Dodaj pierwszego.
        </div>
      ) : (
        <div className="space-y-1.5">
          {organizers.map((org, index) => {
            const isEditing = editing === org.id;
            return (
              <div key={org.id} className="rounded-lg border border-border/70 bg-white">
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="shrink-0 w-6 text-center text-[11px] font-mono text-muted-foreground">{index + 1}</span>

                  {org.image_url ? (
                    <img src={org.image_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border" />
                  ) : (
                    <span className="w-10 h-10 rounded-lg bg-stone-100 shrink-0 flex items-center justify-center text-[10px] text-stone-400">brak</span>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{org.name}</p>
                    {org.description_short && (
                      <p className="text-[11px] text-muted truncate mt-0.5">{org.description_short}</p>
                    )}
                  </div>

                  {(org.source_url || org.facebook_url) && (
                    <a href={(org.source_url || org.facebook_url)!} target="_blank" rel="noopener" className="p-1 rounded hover:bg-accent text-muted transition-colors">
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button onClick={() => startEditing(org)} className={cn("p-1 rounded hover:bg-accent transition-colors", isEditing ? "text-primary" : "text-muted")} title="Edytuj">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(org.id)} className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Usuń">
                    <Trash2 size={13} />
                  </button>
                </div>

                {isEditing && (
                  <div className="px-3 pb-3 pt-2 border-t border-border/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div className="space-y-3">
                        <div>
                          <label className={labelClass}>Nazwa *</label>
                          <input className={inputClass} value={(editForm.name as string) || ""} onChange={(e) => updateField("name", e.target.value)} />
                        </div>
                        <div>
                          <label className={labelClass}>Krótki opis</label>
                          <textarea rows={2} className={inputClass} value={(editForm.description_short as string) || ""} onChange={(e) => updateField("description_short", e.target.value)} />
                        </div>
                        <div>
                          <label className={labelClass}>Długi opis</label>
                          <textarea rows={4} className={inputClass} value={(editForm.description_long as string) || ""} onChange={(e) => updateField("description_long", e.target.value)} />
                        </div>
                        <div>
                          <label className={labelClass}>URL strony</label>
                          <input className={inputClass} value={(editForm.source_url as string) || ""} onChange={(e) => updateField("source_url", e.target.value)} placeholder="https://..." />
                        </div>
                        <div>
                          <label className={labelClass}>Facebook</label>
                          <input className={inputClass} value={(editForm.facebook_url as string) || ""} onChange={(e) => updateField("facebook_url", e.target.value)} placeholder="https://facebook.com/..." />
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/50 p-3 space-y-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Zdjęcie główne</p>
                        {!!(pendingPreview || editForm.image_url) && (
                          <div className="relative">
                            <img
                              src={pendingPreview || (editForm.image_url as string) || ""}
                              alt=""
                              className={cn("w-full aspect-[3/2] rounded-lg object-cover border border-border", pendingPreview && "ring-2 ring-primary/40")}
                            />
                            {pendingPreview && (
                              <button onClick={clearPendingFile} className="absolute top-1.5 right-1.5 bg-white rounded-full shadow-sm border border-border p-0.5 hover:bg-red-50 transition-colors">
                                <X size={14} className="text-red-500" />
                              </button>
                            )}
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer w-fit">
                            <Upload size={11} />
                            {pendingPreview ? "Zmień plik" : "Wgraj plik"}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (pendingPreview) URL.revokeObjectURL(pendingPreview);
                              setPendingFile(file);
                              setPendingPreview(URL.createObjectURL(file));
                              e.target.value = "";
                            }} />
                          </label>
                          <div>
                            <label className={labelClass}>lub wklej URL</label>
                            <input className={inputClass} value={(editForm.image_url as string) || ""} onChange={(e) => updateField("image_url", e.target.value)} placeholder="https://..." />
                          </div>
                        </div>
                        {pendingPreview && <span className="text-[10px] text-primary font-medium">Nowy plik — zapisz aby wgrać</span>}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(org.id)} disabled={uploadingImage === org.id} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors disabled:opacity-50">
                        {uploadingImage === org.id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                        {uploadingImage === org.id ? "Wgrywanie..." : "Zapisz"}
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
      )}
    </div>
  );
}
