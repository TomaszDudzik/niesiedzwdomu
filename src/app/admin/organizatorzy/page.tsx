"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardPaste, ExternalLink, Loader2, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Organizer } from "@/types/database";

type StatusFilter = "all" | "published" | "draft" | "archived";

type OrganizerFormState = {
  organizer_name: string;
  company_name: string;
  street: string;
  postcode: string;
  city: string;
  email: string;
  phone: string;
  note: string;
};

type FormErrors = Partial<Record<keyof OrganizerFormState, string>>;

const EMPTY_FORM: OrganizerFormState = {
  organizer_name: "",
  company_name: "",
  street: "",
  postcode: "",
  city: "Kraków",
  email: "",
  phone: "",
  note: "",
};

// Validation functions
function validateEmail(email: string): boolean {
  if (!email) return true;
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string): boolean {
  if (!phone) return true;
  const phoneRegex = /^\+48[0-9]{9}$/;
  return phoneRegex.test(phone);
}

function normalizePhone(phone: string): string {
  if (!phone) return phone;
  let cleaned = phone.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "+48" + cleaned.substring(1);
  }
  if (!cleaned.startsWith("+48")) {
    cleaned = "+48" + cleaned;
  }
  return cleaned;
}

function validateForm(form: OrganizerFormState): FormErrors {
  const errors: FormErrors = {};
  
  if (!form.organizer_name.trim()) {
    errors.organizer_name = "Nazwa organizatora jest wymagana";
  }
  
  if (form.email && !validateEmail(form.email)) {
    errors.email = "Niepoprawny format email";
  }
  
  if (form.phone && !validatePhone(form.phone)) {
    errors.phone = "Format: +48XXXXXXXXX (10 cyfr)";
  }
  
  return errors;
}

const FIELD_ALIASES: Record<keyof OrganizerFormState, string[]> = {
  organizer_name: ["organizer_name", "organizer", "name", "nazwa", "organizator"],
  company_name: ["company_name", "company", "firma", "nazwa_firmy"],
  street: ["street", "ulica", "adres", "address"],
  postcode: ["postcode", "zip", "kod", "kod_pocztowy", "kod pocztowy"],
  city: ["city", "miasto"],
  email: ["email", "e-mail", "mail"],
  phone: ["phone", "telefon", "tel"],
  note: ["note", "notes", "uwagi", "opis", "notatka"],
};

function toFormState(organizer: Organizer): OrganizerFormState {
  return {
    organizer_name: organizer.organizer_name,
    company_name: organizer.company_name ?? "",
    street: organizer.street,
    postcode: organizer.postcode,
    city: organizer.city,
    email: organizer.email ?? "",
    phone: organizer.phone ?? "",
    note: organizer.note ?? "",
  };
}

function toPayload(form: OrganizerFormState) {
  return {
    organizer_name: form.organizer_name.trim(),
    company_name: form.company_name.trim() || null,
    street: form.street.trim(),
    postcode: form.postcode.trim(),
    city: form.city.trim() || "Kraków",
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    note: form.note.trim() || null,
  };
}

export default function AdminOrganizatorsPage() {
  const [companies, setCompanies] = useState<Organizer[]>([])
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<OrganizerFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [pasteModal, setPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePreview, setPastePreview] = useState<Record<string, string>[]>([]);
  const [pasteHeaders, setPasteHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });

  const resolveField = (header: string): keyof OrganizerFormState | null => {
    const normalizedHeader = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<[keyof OrganizerFormState, string[]]>) {
      if (aliases.includes(normalizedHeader)) return field;
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
            setPastePreview(parsed.map((row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? "")]))));
            return;
          }
        } catch {
          // Try the next parser candidate.
        }
      }
    }

    const lines = trimmed.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      setPasteHeaders([]);
      setPastePreview([]);
      return;
    }

    const separator = lines[0].includes("\t") ? "\t" : ",";
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

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/organizers");
    const data = await response.json();
    if (Array.isArray(data)) setCompanies(data as Organizer[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const filteredCompanies = useMemo(() => {
    if (statusFilter === "all") return companies;
    return companies.filter((company) => company.status === statusFilter);
  }, [companies, statusFilter]);

  const publishedCount = useMemo(() => companies.filter((company) => company.status === "published").length, [companies]);
  const draftCount = useMemo(() => companies.filter((company) => company.status === "draft").length, [companies]);

  const startEditing = (organizer: Organizer) => {
    setEditing(organizer.id);
    setEditForm(toFormState(organizer));
    setFormErrors({});
  };

  const stopEditing = () => {
    setEditing(null);
    setEditForm(EMPTY_FORM);
    setFormErrors({});
  };

  const updateField = <K extends keyof OrganizerFormState>(field: K, value: OrganizerFormState[K]) => {
    setEditForm((current) => ({ ...current, [field]: value }));
    // Normalize phone on change
    if (field === "phone" && value) {
      const normalized = normalizePhone(value as string);
      setEditForm((current) => ({ ...current, phone: normalized }));
    }
    // Validate field as user types
    const updated = { ...editForm, [field]: value };
    const errors = validateForm(updated);
    setFormErrors(errors);
  };

  const saveEdit = async (id: string) => {
    // Validate before saving
    const errors = validateForm(editForm);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Check if organizer_name is new (not in current list)
    const organizerExists = companies.some(
      (org) => org.organizer_name.toLowerCase() === editForm.organizer_name.toLowerCase()
    );

    // If new organizer name and we're editing, we might need to create a new organizer entry
    // But in edit mode, we're just updating the existing one, so we skip this check
    // The new organizer creation happens in createOrganizer function

    const response = await fetch("/api/admin/organizers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...toPayload(editForm) }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(`Błąd: ${data.error}`);
      return;
    }
    if (data.updated) {
      setCompanies((current) => current.map((company) => (company.id === id ? data.updated : company)));
    }
    stopEditing();
  };

  const createOrganizer = async () => {
    // Validate the form first
    const errors = validateForm(editForm);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Check if organizer with this name already exists
    const organizerExists = companies.some(
      (org) => org.organizer_name.toLowerCase() === editForm.organizer_name.toLowerCase()
    );

    if (organizerExists) {
      alert("Organizator z taką nazwą już istnieje");
      return;
    }

    const response = await fetch("/api/admin/organizers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizer_name: "Nowy organizator",
        company_name: null,
        street: "",
        postcode: "",
        city: "Kraków",
        email: null,
        phone: null,
        note: null,
        status: "draft",
      }),
    });
    const data = await response.json();
    if (!data?.id) {
      alert(`Błąd: ${data.error || "Nie udało się utworzyć organizatora"}`);
      return;
    }
    setCompanies((current) => [data as Organizer, ...current]);
    startEditing(data as Organizer);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno usunąć organizatora?")) return;
    await fetch("/api/admin/organizers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCompanies((current) => current.filter((company) => company.id !== id));
  };

  const toggleStatus = async (organizer: Organizer) => {
    const nextStatus = organizer.status === "published" ? "draft" : "published";
    const response = await fetch("/api/admin/organizers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: organizer.id, status: nextStatus }),
    });
    if (!response.ok) return;
    setCompanies((current) => current.map((item) => (item.id === organizer.id ? { ...item, status: nextStatus } : item)));
  };

  const runPasteImport = async () => {
    if (pastePreview.length === 0) return;
    setImporting(true);
    setImportProgress({ done: 0, total: pastePreview.length });
    const imported: Organizer[] = [];

    for (let index = 0; index < pastePreview.length; index += 1) {
      const row = pastePreview[index];
      const nextForm = { ...EMPTY_FORM };
      for (const header of pasteHeaders) {
        const field = resolveField(header);
        if (!field || !row[header]) continue;
        nextForm[field] = row[header];
      }
      if (!nextForm.organizer_name.trim()) {
        setImportProgress({ done: index + 1, total: pastePreview.length });
        continue;
      }

      try {
        const response = await fetch("/api/admin/organizers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(nextForm)),
        });
        const data = await response.json();
        if (data.id) imported.push(data as Organizer);
      } catch {
        // Skip invalid rows and continue the import.
      }

      setImportProgress({ done: index + 1, total: pastePreview.length });
    }

    setCompanies((current) => [...imported, ...current]);
    setImporting(false);
    setPasteModal(false);
    setPasteText("");
    setPastePreview([]);
    setPasteHeaders([]);
    alert(`Zaimportowano ${imported.length} z ${pastePreview.length} organizatorów`);
  };

  const inputClass = "w-full rounded-md border border-border bg-white px-2 py-1.5 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
  const labelClass = "mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground";

  return (
    <div className="container-page py-8">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizatorzy</h1>
          <p className="mt-0.5 text-[12px] text-muted">Prosty katalog organizatorów dla koloni i powiązań z eventami.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPasteModal(true)} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:border-[#CCC]">
            <ClipboardPaste size={14} /> Wklej dane
          </button>
          <button onClick={createOrganizer} className="flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700">
            <Plus size={14} /> Dodaj
          </button>
          <button onClick={fetchCompanies} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:border-[#CCC]">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setStatusFilter("all")} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors", statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>
          {companies.length} wszystkich
        </button>
        <button onClick={() => setStatusFilter("published")} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors", statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>
          {publishedCount} published
        </button>
        <button onClick={() => setStatusFilter("draft")} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors", statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200")}>
          {draftCount} draft
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-white px-4 py-8 text-center text-[13px] text-muted">
          Brak organizatora{statusFilter !== "all" ? ` ze statusem \"${statusFilter}\"` : ""}. Dodaj pierwszą pozycję.
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredCompanies.map((company, index) => {
            const isEditing = editing === company.id;
            const subtitle = [company.company_name, company.city, company.email].filter(Boolean).join(" · ");

            return (
              <div key={company.id} className="rounded-lg border border-border/70 bg-white">
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="w-6 shrink-0 text-center font-mono text-[11px] text-muted-foreground">{index + 1}</span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">{company.organizer_name}</p>
                    {subtitle && <p className="mt-0.5 truncate text-[11px] text-muted">{subtitle}</p>}
                  </div>

                  <button onClick={() => toggleStatus(company)} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors", company.status === "published" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-stone-100 text-stone-500 hover:bg-stone-200")}>
                    {company.status === "published" ? "Published" : "Draft"}
                  </button>
                  <button onClick={() => startEditing(company)} className={cn("rounded p-1 transition-colors hover:bg-accent", isEditing ? "text-primary" : "text-muted")} title="Edytuj">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(company.id)} className="rounded p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600" title="Usuń">
                    <Trash2 size={13} />
                  </button>
                </div>

                {isEditing && (
                  <div className="border-t border-border/50 px-3 pb-3 pt-2">
                    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-6">
                      <div className="md:col-span-3">
                        <label className={labelClass}>Organizator *</label>
                        <input className={inputClass} value={editForm.organizer_name} onChange={(event) => updateField("organizer_name", event.target.value)} list="organizers-list" />
                        <datalist id="organizers-list">
                          {companies.map((org) => (
                            <option key={org.id} value={org.organizer_name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="md:col-span-3">
                        <label className={labelClass}>Nazwa firmy</label>
                        <input className={inputClass} value={editForm.company_name} onChange={(event) => updateField("company_name", event.target.value)} />
                      </div>
                      <div className="md:col-span-3">
                        <label className={labelClass}>Ulica</label>
                        <input className={inputClass} value={editForm.street} onChange={(event) => updateField("street", event.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Kod pocztowy</label>
                        <input className={inputClass} value={editForm.postcode} onChange={(event) => updateField("postcode", event.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Miasto</label>
                        <input className={inputClass} value={editForm.city} onChange={(event) => updateField("city", event.target.value)} />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Email</label>
                        <input 
                          className={cn(inputClass, formErrors.email && "border-red-500 bg-red-50")} 
                          value={editForm.email} 
                          onChange={(event) => updateField("email", event.target.value)} 
                        />
                        {formErrors.email && <p className="mt-1 text-[10px] text-red-600">{formErrors.email}</p>}
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Telefon</label>
                        <input 
                          className={cn(inputClass, formErrors.phone && "border-red-500 bg-red-50")} 
                          value={editForm.phone} 
                          onChange={(event) => updateField("phone", event.target.value)} 
                          placeholder="+48..."
                        />
                        {formErrors.phone && <p className="mt-1 text-[10px] text-red-600">{formErrors.phone}</p>}
                      </div>
                      <div className="md:col-span-2">
                      </div>
                      <div className="md:col-span-6">
                        <label className={labelClass}>Notatka</label>
                        <textarea rows={4} className={inputClass} value={editForm.note} onChange={(event) => updateField("note", event.target.value)} />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(company.id)} className="inline-flex items-center gap-1 rounded bg-foreground px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-[#333]">
                        <Save size={11} /> Zapisz
                      </button>
                      <button onClick={stopEditing} className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-foreground">
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
          <div className="mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-[15px] font-bold text-foreground">Wklej dane</h2>
                <p className="mt-0.5 text-[11px] text-muted">Obsługiwane pola: name, business name, street, postcode, city, email, phone, website, note.</p>
              </div>
              <button onClick={() => { setPasteModal(false); setPasteText(""); setPastePreview([]); setPasteHeaders([]); }} className="rounded p-1.5 text-muted transition-colors hover:bg-accent">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <textarea
                className="h-40 w-full resize-none rounded-lg border border-border bg-white px-3 py-2 font-mono text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                placeholder={"name\tbusiness name\tstreet\tpostcode\tcity\temail\nSummer Camp Studio\tStudio Lato sp. z o.o.\tul. Kwiatowa 1\t30-001\tKraków\tbiuro@studio.pl"}
                value={pasteText}
                onChange={(event) => {
                  setPasteText(event.target.value);
                  parsePastedData(event.target.value);
                }}
              />

              {pasteHeaders.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pasteHeaders.map((header) => {
                    const field = resolveField(header);
                    return (
                      <span key={header} className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", field ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                        {header} {field ? `→ ${field}` : "(pominięta)"}
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
                        {pasteHeaders.filter((header) => resolveField(header)).map((header) => (
                          <th key={header} className="whitespace-nowrap px-2.5 py-1.5 text-left font-medium text-muted-foreground">
                            {resolveField(header)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pastePreview.slice(0, 5).map((row, index) => (
                        <tr key={index} className="border-t border-border/50">
                          {pasteHeaders.filter((header) => resolveField(header)).map((header) => (
                            <td key={header} className="max-w-[200px] truncate px-2.5 py-1.5 text-foreground">
                              {row[header] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border px-5 py-4">
              <p className="text-[11px] text-muted">{pastePreview.length} firm do importu</p>
              <div className="flex items-center gap-2">
                {importing && <span className="text-[11px] text-muted">{importProgress.done}/{importProgress.total}</span>}
                <button onClick={() => { setPasteModal(false); setPasteText(""); setPastePreview([]); setPasteHeaders([]); }} className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:text-foreground">
                  Anuluj
                </button>
                <button onClick={runPasteImport} disabled={pastePreview.length === 0 || importing} className="rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50">
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
