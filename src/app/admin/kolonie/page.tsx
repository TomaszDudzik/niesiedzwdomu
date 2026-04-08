"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardPaste,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { CAMP_TYPE_ICONS, CAMP_TYPE_LABELS, DISTRICT_LIST } from "@/lib/mock-data";
import { cn, formatDateShort, formatPrice } from "@/lib/utils";
import type { Camp } from "@/types/database";

type DerivedCampStatus = Camp["status"] | "outdated";
type CampListFilter = "all" | "published" | "draft" | "outdated";

export default function AdminCampsPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<CampListFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});

  const [pasteModal, setPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteHeaders, setPasteHeaders] = useState<string[]>([]);
  const [pastePreview, setPastePreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });

  const mapCampRow = (row: Record<string, unknown>): Camp => {
    const priceFrom = typeof row.price_from === "number" ? row.price_from : null;
    const priceSingle = typeof row.price === "number" ? row.price : null;
    return {
      ...row,
      content_type: "camp",
      price: priceFrom ?? priceSingle ?? null,
    } as Camp;
  };

  const fetchCamps = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/camps");
    const data = await res.json();
    if (Array.isArray(data)) {
      setCamps(data.map((c: Record<string, unknown>) => mapCampRow(c)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCamps();
  }, [fetchCamps]);

  const toggleCategory = (type: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const getEffectiveStatus = useCallback((camp: Camp): DerivedCampStatus => {
    const today = new Date().toISOString().slice(0, 10);
    const endDate = camp.date_end ? camp.date_end.slice(0, 10) : null;
    if (camp.status === "published" && endDate && endDate < today) return "outdated";
    return camp.status;
  }, []);

  const statusOrder: Record<DerivedCampStatus, number> = {
    draft: 0,
    published: 1,
    outdated: 2,
    cancelled: 3,
  };

  const filteredCamps = useMemo(() => {
    const scopedCamps = typeFilter ? camps.filter((camp) => camp.camp_type === typeFilter) : camps;
    if (statusFilter === "all") return scopedCamps;
    if (statusFilter === "draft") {
      return scopedCamps.filter((camp) => {
        const effectiveStatus = getEffectiveStatus(camp);
        return effectiveStatus === "draft" || effectiveStatus === "cancelled";
      });
    }
    return scopedCamps.filter((camp) => getEffectiveStatus(camp) === statusFilter);
  }, [camps, typeFilter, statusFilter, getEffectiveStatus]);
  const displayedTypeKeys = useMemo(
    () => Object.keys(CAMP_TYPE_LABELS).filter((type) => !typeFilter || type === typeFilter),
    [typeFilter]
  );

  const groupedCamps = useMemo(() => {
    const order: Camp["camp_type"][] = ["polkolonie", "kolonie", "warsztaty_wakacyjne"];
    return order.map((type) => ({
      type,
      items: filteredCamps
        .filter((c) => c.camp_type === type)
        .sort((a, b) => {
          const statusDiff = statusOrder[getEffectiveStatus(a)] - statusOrder[getEffectiveStatus(b)];
          if (statusDiff !== 0) return statusDiff;
          const dateDiff = (a.date_start || "").localeCompare(b.date_start || "");
          if (dateDiff !== 0) return dateDiff;
          return a.title.localeCompare(b.title, "pl");
        }),
    }));
  }, [filteredCamps, getEffectiveStatus]);

  const publishedCount = useMemo(() => camps.filter((camp) => getEffectiveStatus(camp) === "published").length, [camps, getEffectiveStatus]);
  const draftCount = useMemo(() => camps.filter((camp) => {
    const effectiveStatus = getEffectiveStatus(camp);
    return effectiveStatus === "draft" || effectiveStatus === "cancelled";
  }).length, [camps, getEffectiveStatus]);
  const outdatedCount = useMemo(() => camps.filter((camp) => getEffectiveStatus(camp) === "outdated").length, [camps, getEffectiveStatus]);
  const sectionStats = useMemo(() => Object.fromEntries(
    Object.keys(CAMP_TYPE_LABELS).map((type) => {
      const typeCamps = camps.filter((camp) => camp.camp_type === type);
      const published = typeCamps.filter((camp) => getEffectiveStatus(camp) === "published").length;
      const draft = typeCamps.filter((camp) => {
        const effectiveStatus = getEffectiveStatus(camp);
        return effectiveStatus === "draft" || effectiveStatus === "cancelled";
      }).length;
      const outdated = typeCamps.filter((camp) => getEffectiveStatus(camp) === "outdated").length;
      return [type, { all: typeCamps.length, published, draft, outdated }];
    })
  ), [camps, getEffectiveStatus]);
  const visibleTypeKeys = useMemo(() => displayedTypeKeys, [displayedTypeKeys]);
  const hasExpandedCategories = useMemo(() => visibleTypeKeys.some((type) => !collapsedCategories[type]), [visibleTypeKeys, collapsedCategories]);

  const toggleStatusFilter = (filter: CampListFilter) => {
    const nextFilter = statusFilter === filter ? "all" : filter;
    setTypeFilter(null);
    setStatusFilter(nextFilter);
    const nextCollapsed = Object.fromEntries(
      Object.keys(CAMP_TYPE_LABELS).map((type) => {
        const matchingItems = camps.filter((camp) => {
          if (camp.camp_type !== type) return false;
          if (nextFilter === "all") return true;
          if (nextFilter === "draft") {
            const effectiveStatus = getEffectiveStatus(camp);
            return effectiveStatus === "draft" || effectiveStatus === "cancelled";
          }
          return getEffectiveStatus(camp) === nextFilter;
        });
        return [type, matchingItems.length === 0];
      })
    );
    setCollapsedCategories(nextCollapsed);
  };

  const toggleTypeStatusFilter = (type: string, filter: CampListFilter) => {
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

  const FIELD_ALIASES: Record<string, string[]> = {
    title: ["title", "tytul", "tytuł", "nazwa", "nazwa turnusu", "nazwa_polkolonii"],
    description_short: ["description_short", "krotki opis", "krótki opis", "tematyka", "temat", "program"],
    description_long: ["description_long", "dlugi opis", "długi opis"],
    camp_type: ["camp_type", "typ", "rodzaj", "typ_oferty", "type"],
    date_start: ["date_start", "termin_od", "data od", "od"],
    date_end: ["date_end", "termin_do", "data do", "do"],
    duration_days: ["duration_days", "dni", "liczba dni", "czas trwania"],
    age_min: ["age_min", "wiek_od", "wiek od"],
    age_max: ["age_max", "wiek_do", "wiek do"],
    price: ["price", "cena", "cena_za_tydzien", "cena_za_tydzien (pln, jesli dostepna)", "cena_za_tydzien (PLN, jeśli dostępna)"],
    price_from: ["price_from", "cena_od", "cena od"],
    price_to: ["price_to", "cena_do", "cena do"],
    organizer: ["organizer", "organizator"],
    source_url: ["source_url", "url", "link", "link_zrodlowy"],
    facebook_url: ["facebook_url", "facebook", "fb", "facebook page"],
    venue_name: ["venue_name", "miejsce", "nazwa miejsca"],
    venue_address: ["venue_address", "adres", "address", "lokalizacja"],
    meals_included: ["meals_included", "wyzywienie", "wyzywienie (tak/nie/brak danych)"],
    care_hours: ["godziny_opieki", "godziny", "hours"],
    seats: ["liczba_miejsc", "liczba_miejsc (jesli dostepna)", "liczba_miejsc (jeśli dostępna)", "miejsca"],
  };

  const resolveField = (header: string): string | null => {
    const key = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some((a) => a.toLowerCase() === key)) return field;
    }
    return null;
  };

  const asNumber = (v?: string): number | null => {
    if (!v) return null;
    const n = Number(String(v).replace(/,/g, ".").replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const detectDistrict = (location: string): Camp["district"] => {
    const hit = DISTRICT_LIST.find((d) => location.toLowerCase().includes(d.toLowerCase()));
    return (hit || "Inne") as Camp["district"];
  };

  const inferSeason = (dateStart?: string): Camp["season"] => {
    if (!dateStart) return "caly_rok";
    const month = new Date(dateStart).getMonth() + 1;
    if ([6, 7, 8].includes(month)) return "lato";
    if ([12, 1, 2].includes(month)) return "zima";
    return "caly_rok";
  };

  const inferCampType = (mappedType: string | undefined, title: string): Camp["camp_type"] => {
    const t = (mappedType || "").toLowerCase();
    const n = title.toLowerCase();
    if (t.includes("warsztat") || n.includes("warsztat")) return "warsztaty_wakacyjne";
    if (t.includes("oboz") || t.includes("koloni") || n.includes("oboz") || n.includes("koloni")) return "kolonie";
    return "polkolonie";
  };

  const calcDurationDays = (from?: string, to?: string): number => {
    if (!from || !to) return 5;
    const a = new Date(from);
    const b = new Date(to);
    const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Number.isFinite(diff) && diff > 0 ? diff : 5;
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
        .replace(/\bNaN\b/g, "null");

      const pythonLikeToJson = (input: string) => {
        let out = "";
        let inSingle = false;
        let escaped = false;
        for (let i = 0; i < input.length; i++) {
          const ch = input[i];
          if (inSingle) {
            if (escaped) {
              out += ch;
              escaped = false;
              continue;
            }
            if (ch === "\\") {
              out += "\\\\";
              escaped = true;
              continue;
            }
            if (ch === "'") {
              inSingle = false;
              out += '"';
              continue;
            }
            if (ch === '"') {
              out += '\\"';
              continue;
            }
            out += ch;
            continue;
          }
          if (ch === "'") {
            inSingle = true;
            out += '"';
            continue;
          }
          out += ch;
        }
        return out;
      };

      const attempts = [
        raw,
        raw.replace(/(?<=[{,[\s])'/g, '"').replace(/'(?=\s*[:,\]}])/g, '"'),
        pythonLikeToJson(raw),
      ];

      for (const attempt of attempts) {
        try {
          const obj = JSON.parse(
            attempt.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bNone\b/g, "null")
          );
          if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
            const headers = [...new Set(obj.flatMap((o: Record<string, unknown>) => Object.keys(o)))];
            const rows = obj.map((o: Record<string, unknown>) => {
              const row: Record<string, string> = {};
              headers.forEach((h) => {
                row[h] = o[h] != null ? String(o[h]) : "";
              });
              return row;
            });
            setPasteHeaders(headers);
            setPastePreview(rows);
            return;
          }
        } catch {
          // try next strategy
        }
      }
    }

    setPasteHeaders([]);
    setPastePreview([]);
  };

  const runPasteImport = async () => {
    if (pastePreview.length === 0) return;
    setImporting(true);
    setImportProgress({ done: 0, total: pastePreview.length });

    const imported: Camp[] = [];

    for (let i = 0; i < pastePreview.length; i++) {
      const row = pastePreview[i];
      const mapped: Record<string, string> = {};
      for (const header of pasteHeaders) {
        const field = resolveField(header);
        if (field) mapped[field] = row[header] || "";
      }

      if (!mapped.title) {
        setImportProgress({ done: i + 1, total: pastePreview.length });
        continue;
      }

      const dateStart = mapped.date_start || new Date().toISOString().slice(0, 10);
      const dateEnd = mapped.date_end || dateStart;
      const priceFrom = asNumber(mapped.price_from) ?? asNumber(mapped.price);
      const priceTo = asNumber(mapped.price_to);
      const shortDescription = mapped.description_short || "Opis oferty";
      const careHours = mapped.care_hours ? `Godziny opieki: ${mapped.care_hours}.` : "";
      const seats = mapped.seats ? `Liczba miejsc: ${mapped.seats}.` : "";
      const longDescription = mapped.description_long || `${shortDescription}${careHours ? ` ${careHours}` : ""}${seats ? ` ${seats}` : ""}`.trim();

      const payload = {
        title: mapped.title.trim(),
        description_short: shortDescription,
        description_long: longDescription,
        image_url: null,
        date_start: dateStart,
        date_end: dateEnd,
        camp_type: inferCampType(mapped.camp_type, mapped.title),
        season: inferSeason(dateStart),
        duration_days: asNumber(mapped.duration_days) || calcDurationDays(dateStart, dateEnd),
        meals_included: ["tak", "true", "1"].includes((mapped.meals_included || "").toLowerCase()),
        transport_included: false,
        age_min: asNumber(mapped.age_min),
        age_max: asNumber(mapped.age_max),
        price: null,
        price_from: priceFrom,
        price_to: priceTo,
        is_free: (priceFrom ?? priceTo ?? null) === 0,
        district: detectDistrict(mapped.venue_address || ""),
        venue_name: mapped.venue_name || mapped.organizer || "Miejsce",
        venue_address: mapped.venue_address || "Krakow",
        organizer: mapped.organizer || mapped.venue_name || "Organizator",
        source_url: mapped.source_url || null,
        facebook_url: mapped.facebook_url || null,
        is_featured: false,
      };

      try {
        const res = await fetch("/api/admin/camps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data?.id) imported.push(mapCampRow(data));
      } catch {
        // skip this row
      }

      setImportProgress({ done: i + 1, total: pastePreview.length });
    }

    setCamps((prev) => [...imported, ...prev]);
    setImporting(false);
    setPasteModal(false);
    setPasteText("");
    setPasteHeaders([]);
    setPastePreview([]);
    alert(`Zaimportowano ${imported.length} z ${pastePreview.length} kolonii`);
  };

  const startEditing = (camp: Camp) => {
    const row = camp as unknown as Record<string, unknown>;
    setEditing(camp.id);
    setEditForm({
      title: camp.title,
      description_short: camp.description_short,
      description_long: camp.description_long,
      camp_type: camp.camp_type,
      season: camp.season,
      date_start: camp.date_start,
      date_end: camp.date_end,
      duration_days: camp.duration_days,
      age_min: camp.age_min,
      age_max: camp.age_max,
      price_from: row.price_from ?? camp.price,
      price_to: row.price_to ?? null,
      organizer: camp.organizer,
      source_url: camp.source_url,
      facebook_url: camp.facebook_url ?? "",
      venue_name: camp.venue_name,
      venue_address: camp.venue_address,
      district: camp.district,
      is_free: camp.is_free,
      is_featured: camp.is_featured,
      meals_included: camp.meals_included,
      transport_included: camp.transport_included,
    });
  };

  const saveEdit = async (id: string) => {
    const updates = {
      title: String(editForm.title || ""),
      description_short: String(editForm.description_short || ""),
      description_long: String(editForm.description_long || ""),
      camp_type: editForm.camp_type,
      season: editForm.season,
      date_start: editForm.date_start,
      date_end: editForm.date_end,
      duration_days: Number(editForm.duration_days) || 5,
      age_min: editForm.age_min === "" || editForm.age_min === null ? null : Number(editForm.age_min),
      age_max: editForm.age_max === "" || editForm.age_max === null ? null : Number(editForm.age_max),
      price: null,
      price_from: editForm.price_from === "" || editForm.price_from === null ? null : Number(editForm.price_from),
      price_to: editForm.price_to === "" || editForm.price_to === null ? null : Number(editForm.price_to),
      organizer: String(editForm.organizer || ""),
      source_url: editForm.source_url ? String(editForm.source_url) : null,
      facebook_url: editForm.facebook_url ? String(editForm.facebook_url) : null,
      venue_name: String(editForm.venue_name || ""),
      venue_address: String(editForm.venue_address || ""),
      district: editForm.district,
      is_featured: Boolean(editForm.is_featured),
      is_free: Boolean(editForm.is_free),
      meals_included: Boolean(editForm.meals_included),
      transport_included: Boolean(editForm.transport_included),
    };

    let res = await fetch("/api/admin/camps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    let data = await res.json();

    if (!res.ok && data.error?.includes("facebook_url")) {
      const { facebook_url: _facebookUrl, ...updatesWithoutFacebook } = updates;
      res = await fetch("/api/admin/camps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatesWithoutFacebook }),
      });
      data = await res.json();
    }

    if (!res.ok) {
      alert(`Blad zapisu: ${data.error || "Nieznany blad"}`);
      return;
    }

    if (data.updated) {
      setCamps((prev) => prev.map((c) => (c.id === id ? mapCampRow(data.updated as Record<string, unknown>) : c)));
    }

    setEditing(null);
    setEditForm({});
  };

  const createCamp = async () => {
    const payload = {
      title: "Nowa kolonia",
      description_short: "Opis oferty",
      description_long: "",
      image_url: null,
      date_start: new Date().toISOString().slice(0, 10),
      date_end: new Date().toISOString().slice(0, 10),
      camp_type: "polkolonie",
      season: "lato",
      duration_days: 5,
      meals_included: false,
      transport_included: false,
      age_min: null,
      age_max: null,
      price: null,
      price_from: null,
      price_to: null,
      is_free: false,
      district: "Inne",
      venue_name: "Miejsce",
      venue_address: "Krakow",
      organizer: "Organizator",
      source_url: null,
      facebook_url: null,
      is_featured: false,
    };

    const res = await fetch("/api/admin/camps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data?.id) {
      const newCamp = mapCampRow(data as Record<string, unknown>);
      setCamps((prev) => [newCamp, ...prev]);
      startEditing(newCamp);
    }
  };

  const toggleStatus = async (camp: Camp) => {
    const newStatus = camp.status === "published" ? "draft" : "published";
    const res = await fetch("/api/admin/camps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: camp.id, status: newStatus }),
    });
    if (res.ok) {
      setCamps((prev) => prev.map((c) => (c.id === camp.id ? { ...c, status: newStatus } : c)));
    }
  };

  const toggleFeatured = async (camp: Camp) => {
    const nextFeatured = !camp.is_featured;
    const res = await fetch("/api/admin/camps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: camp.id, is_featured: nextFeatured }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(`Błąd: ${data.error || "Nie udało się zapisać wyróżnienia"}`);
      return;
    }
    setCamps((prev) => prev.map((c) => (c.id === camp.id ? { ...c, is_featured: nextFeatured } : c)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno chcesz usunac?")) return;
    await fetch("/api/admin/camps", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCamps((prev) => prev.filter((c) => c.id !== id));
  };

  const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
  const labelClass = "block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Kolonie</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setPasteModal(true)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <ClipboardPaste size={14} />
            Wklej dane
          </button>
          <button onClick={createCamp} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-foreground rounded-xl hover:bg-stone-700 transition-colors">
            <Plus size={14} />
            Dodaj
          </button>
          <button onClick={fetchCamps} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => toggleStatusFilter("all")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>
          {camps.length} kolonii
        </button>
        <button onClick={() => toggleStatusFilter("published")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>
          {publishedCount} published
        </button>
        <button onClick={() => toggleStatusFilter("draft")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", draftCount > 0 ? (statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200") : (statusFilter === "draft" ? "bg-stone-300 text-stone-700" : "bg-stone-200 text-stone-500 hover:bg-stone-300"))}>
          {draftCount} draft
        </button>
        <button onClick={() => toggleStatusFilter("outdated")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "outdated" ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-700 hover:bg-amber-200")}>
          {outdatedCount} outdated
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
          {groupedCamps.filter(({ type }) => !typeFilter || type === typeFilter).map(({ type, items }) => {
            const expanded = !collapsedCategories[type];
            const stats = sectionStats[type] ?? { all: 0, published: 0, draft: 0, outdated: 0 };
            return (
              <div key={type}>
                <div className="w-full flex items-center gap-2 mb-2 rounded-md px-1.5 py-1 hover:bg-accent/50 transition-colors">
                  <button type="button" onClick={() => toggleCategory(type)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                    <span className="text-lg">{CAMP_TYPE_ICONS[type]}</span>
                    <h2 className="text-[13px] font-semibold text-foreground">{CAMP_TYPE_LABELS[type]}</h2>
                  </button>
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "all")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>{stats.all} all</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "published")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>{stats.published} published</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "draft")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", stats.draft > 0 ? (typeFilter === type && statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200") : (typeFilter === type && statusFilter === "draft" ? "bg-stone-300 text-stone-700" : "bg-stone-200 text-stone-500 hover:bg-stone-300"))}>{stats.draft} draft</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "outdated")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "outdated" ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-700 hover:bg-amber-200")}>{stats.outdated} outdated</button>
                  </div>
                </div>

                {expanded && (
                  items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-white px-3 py-4 text-[12px] text-muted">
                    Brak rekordów dla tego filtra.
                  </div>
                  ) : (
                  <div className="space-y-1.5">
                    {items.map((camp, index) => {
                      const isDraft = camp.status !== "published";
                      const isEditing = editing === camp.id;
                      return (
                        <div key={camp.id} className={cn("rounded-lg border border-border/70", isDraft ? "bg-stone-100 opacity-70" : "bg-white")}>
                          <div className="flex items-center gap-2.5 px-3 py-2.5">
                            <span className="shrink-0 w-6 text-center text-[11px] font-mono text-muted-foreground">{index + 1}</span>
                            <span className="shrink-0 text-lg">{CAMP_TYPE_ICONS[camp.camp_type]}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-foreground truncate">{camp.title}</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5">
                                <span>{CAMP_TYPE_LABELS[camp.camp_type]}</span>
                                <span className="opacity-40">·</span>
                                <span>{formatDateShort(camp.date_start)} - {formatDateShort(camp.date_end)}</span>
                                <span className="opacity-40">·</span>
                                <span>{formatPrice(camp.price)}</span>
                                <span className="opacity-40">·</span>
                                <span className="truncate max-w-[180px]">{camp.organizer}</span>
                              </div>
                            </div>

                            <button onClick={() => startEditing(camp)} className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Edytuj">
                              <Pencil size={13} />
                            </button>

                            <button onClick={() => toggleFeatured(camp)} className={cn("p-1 rounded transition-colors", camp.is_featured ? "text-amber-500 hover:bg-amber-50" : "text-muted-foreground hover:bg-stone-100")} title="Wyróżnij">
                              <Star size={13} fill={camp.is_featured ? "currentColor" : "none"} />
                            </button>

                            {camp.source_url && (
                              <a href={camp.source_url} target="_blank" rel="noopener" className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Zrodlo">
                                <ExternalLink size={13} />
                              </a>
                            )}

                            <button onClick={() => toggleStatus(camp)} className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors", camp.status === "published" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-rose-100 text-rose-700 hover:bg-rose-200")}>
                              {camp.status === "published" ? "Published" : "Draft"}
                            </button>

                            <button onClick={() => handleDelete(camp.id)} className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Usun">
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {isEditing && (
                            <div className="px-3 pb-3 pt-2 border-t border-border/50">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                <div className="md:col-span-2">
                                  <label className={labelClass}>Tytul</label>
                                  <input className={inputClass} value={(editForm.title as string) || ""} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
                                </div>
                                <div>
                                  <label className={labelClass}>Typ</label>
                                  <select className={inputClass} value={(editForm.camp_type as string) || camp.camp_type} onChange={(e) => setEditForm((p) => ({ ...p, camp_type: e.target.value }))}>
                                    <option value="polkolonie">Polkolonie</option>
                                    <option value="kolonie">Kolonie</option>
                                    <option value="warsztaty_wakacyjne">Warsztaty wakacyjne</option>
                                  </select>
                                </div>

                                <div className="md:col-span-4">
                                  <label className={labelClass}>Krotki opis</label>
                                  <textarea rows={2} className={inputClass} value={(editForm.description_short as string) || ""} onChange={(e) => setEditForm((p) => ({ ...p, description_short: e.target.value }))} />
                                </div>
                                <div className="md:col-span-4">
                                  <label className={labelClass}>Dlugi opis</label>
                                  <textarea rows={6} className={inputClass} value={(editForm.description_long as string) || ""} onChange={(e) => setEditForm((p) => ({ ...p, description_long: e.target.value }))} />
                                </div>

                                <div>
                                  <label className={labelClass}>Data od</label>
                                  <input type="date" className={inputClass} value={(editForm.date_start as string) || ""} onChange={(e) => setEditForm((p) => ({ ...p, date_start: e.target.value }))} />
                                </div>
                                <div>
                                  <label className={labelClass}>Data do</label>
                                  <input type="date" className={inputClass} value={(editForm.date_end as string) || ""} onChange={(e) => setEditForm((p) => ({ ...p, date_end: e.target.value }))} />
                                </div>
                                <div>
                                  <label className={labelClass}>Dni</label>
                                  <input type="number" min={1} className={inputClass} value={String(editForm.duration_days ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, duration_days: e.target.value ? Number(e.target.value) : 1 }))} />
                                </div>

                                <div className="hidden md:block md:col-span-4" />

                                <div>
                                  <label className={labelClass}>Wiek od</label>
                                  <input type="number" min={0} max={18} className={inputClass} value={editForm.age_min === null ? "" : String(editForm.age_min ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, age_min: e.target.value ? Number(e.target.value) : null }))} />
                                </div>
                                <div>
                                  <label className={labelClass}>Wiek do</label>
                                  <input type="number" min={0} max={18} className={inputClass} value={editForm.age_max === null ? "" : String(editForm.age_max ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, age_max: e.target.value ? Number(e.target.value) : null }))} />
                                </div>
                                <div>
                                  <label className={labelClass}>Cena od</label>
                                  <input type="number" min={0} className={inputClass} value={editForm.price_from === null ? "" : String(editForm.price_from ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, price_from: e.target.value ? Number(e.target.value) : null }))} />
                                </div>
                                <div>
                                  <label className={labelClass}>Cena do</label>
                                  <input type="number" min={0} className={inputClass} value={editForm.price_to === null ? "" : String(editForm.price_to ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, price_to: e.target.value ? Number(e.target.value) : null }))} />
                                </div>

                                <div className="flex items-center gap-2 pt-5">
                                  <input type="checkbox" id={`featured-camp-${camp.id}`} checked={Boolean(editForm.is_featured)} onChange={(e) => setEditForm((p) => ({ ...p, is_featured: e.target.checked }))} className="rounded border-border" />
                                  <label htmlFor={`featured-camp-${camp.id}`} className="text-[12px] text-foreground">Wyróżnij</label>
                                </div>

                                <div className="hidden md:block md:col-span-4" />

                                <div className="md:col-span-2">
                                  <label className={labelClass}>Organizator</label>
                                  <input className={inputClass} value={(editForm.organizer as string) || ""} onChange={(e) => setEditForm((p) => ({ ...p, organizer: e.target.value }))} />
                                </div>
                                <div className="md:col-span-2">
                                  <label className={labelClass}>URL zrodla</label>
                                  <input className={inputClass} value={(editForm.source_url as string) || ""} onChange={(e) => setEditForm((p) => ({ ...p, source_url: e.target.value }))} />
                                </div>
                                <div className="md:col-span-2">
                                  <label className={labelClass}>Facebook</label>
                                  <input className={inputClass} value={(editForm.facebook_url as string) || ""} onChange={(e) => setEditForm((p) => ({ ...p, facebook_url: e.target.value }))} placeholder="https://facebook.com/..." />
                                </div>
                                <div className="md:col-span-2">
                                  <label className={labelClass}>Miejsce</label>
                                  <input className={inputClass} value={(editForm.venue_name as string) || ""} onChange={(e) => setEditForm((p) => ({ ...p, venue_name: e.target.value }))} />
                                </div>
                                <div className="md:col-span-2">
                                  <label className={labelClass}>Adres</label>
                                  <input className={inputClass} value={(editForm.venue_address as string) || ""} onChange={(e) => setEditForm((p) => ({ ...p, venue_address: e.target.value }))} />
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button onClick={() => saveEdit(camp.id)} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors">
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
                <p className="text-[11px] text-muted mt-0.5">Wklej tabele z Excela, Google Sheets lub DataFrame</p>
              </div>
              <button onClick={() => { setPasteModal(false); setPasteText(""); setPastePreview([]); setPasteHeaders([]); }} className="p-1.5 rounded hover:bg-accent text-muted transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
              <textarea
                className="w-full h-40 px-3 py-2 rounded-lg border border-border text-[12px] font-mono bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value);
                  parsePastedData(e.target.value);
                }}
              />

              {pasteHeaders.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rozpoznane kolumny</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pasteHeaders.map((h) => {
                      const field = resolveField(h);
                      return (
                        <span key={h} className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", field ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                          {h} {field ? `-> ${field}` : "(pominieta)"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {pastePreview.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Podglad ({pastePreview.length} wierszy)</p>
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
                              <td key={h} className="px-2.5 py-1.5 text-foreground max-w-[200px] truncate">{row[h] || <span className="text-muted/40">-</span>}</td>
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
              <p className="text-[11px] text-muted">Kolonie zostana dodane jako Draft</p>
              <div className="flex items-center gap-2">
                {importing && <span className="text-[11px] text-muted">{importProgress.done}/{importProgress.total}</span>}
                <button onClick={() => { setPasteModal(false); setPasteText(""); setPastePreview([]); setPasteHeaders([]); }} className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:text-foreground transition-colors">
                  Anuluj
                </button>
                <button
                  onClick={runPasteImport}
                  disabled={importing || pastePreview.length === 0 || !pasteHeaders.some((h) => resolveField(h) === "title")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {importing ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {importing ? "Importowanie..." : `Importuj ${pastePreview.length} kolonii`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
