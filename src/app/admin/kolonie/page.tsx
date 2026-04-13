"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardPaste,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { CAMP_TYPE_ICONS, CAMP_TYPE_LABELS, DISTRICT_LIST } from "@/lib/mock-data";
import { cn, formatDateShort, formatPrice } from "@/lib/utils";
import type { Camp } from "@/types/database";

const MiniMapLazy = lazy(() => import("../miejsca/mini-map").then((m) => ({ default: m.MiniMap })));

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

  // Organizer-level grouping state
  const [collapsedOrganizers, setCollapsedOrganizers] = useState<Record<string, boolean>>({});
  const [editingOrganizer, setEditingOrganizer] = useState<string | null>(null);
  const [organizerEditForm, setOrganizerEditForm] = useState<Record<string, unknown>>({});
  const [uploadingOrganizerImage, setUploadingOrganizerImage] = useState(false);
  const [organizerPendingFile, setOrganizerPendingFile] = useState<File | null>(null);
  const [organizerPendingPreview, setOrganizerPendingPreview] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [sessionEditForm, setSessionEditForm] = useState<Record<string, unknown>>({});
  const [sessionGeocoding, setSessionGeocoding] = useState(false);
  // Add new organizer modal
  const [addModal, setAddModal] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addForm, setAddForm] = useState<Record<string, unknown>>({});
  const [addSessions, setAddSessions] = useState<{ date_start: string; date_end: string }[]>([{ date_start: "", date_end: "" }]);
  // Add single turnus to existing organizer
  const [addTurnusFor, setAddTurnusFor] = useState<string | null>(null);
  const [addTurnusForm, setAddTurnusForm] = useState<Record<string, unknown>>({});
  const [addTurnusSaving, setAddTurnusSaving] = useState(false);
  const [addTurnusGeocoding, setAddTurnusGeocoding] = useState(false);

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
    deleted: 4,
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

  const groupedByTypeAndOrganizer = useMemo(() => {
    const order: Camp["camp_type"][] = ["polkolonie", "kolonie", "warsztaty_wakacyjne"];
    return order.map((type) => {
      const typeCamps = filteredCamps
        .filter((c) => c.camp_type === type)
        .sort((a, b) => (a.date_start || "").localeCompare(b.date_start || "") || a.title.localeCompare(b.title, "pl"));
      const organizerMap = new Map<string, Camp[]>();
      for (const camp of typeCamps) {
        const key = camp.organizer || "Brak organizatora";
        if (!organizerMap.has(key)) organizerMap.set(key, []);
        organizerMap.get(key)!.push(camp);
      }
      return {
        type,
        organizers: Array.from(organizerMap.entries()).map(([organizer, sessions]) => ({ organizer, sessions })),
      };
    });
  }, [filteredCamps]);

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

  const createCamp = () => {
    setAddForm({
      title: "",
      description_short: "",
      description_long: "",
      camp_type: "polkolonie",
      age_min: "",
      age_max: "",
      price_from: "",
      price_to: "",
      organizer: "",
      source_url: "",
      facebook_url: "",
      venue_name: "",
      venue_address: "",
      district: "Inne",
      is_free: false,
      is_featured: false,
      meals_included: false,
      transport_included: false,
    });
    setAddSessions([{ date_start: "", date_end: "" }]);
    setAddModal(true);
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

  const toggleOrganizer = (key: string) => {
    setCollapsedOrganizers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const startEditingOrganizer = (key: string, proto: Camp) => {
    setEditingOrganizer(key);
    setOrganizerPendingFile(null);
    setOrganizerPendingPreview(null);
    setOrganizerEditForm({
      description_short: proto.description_short,
      description_long: proto.description_long,
      camp_type: proto.camp_type,
      organizer: proto.organizer,
      image_url: proto.image_url || "",
    });
  };

  const saveOrganizerEdit = async (campIds: string[]) => {
    let uploadedImageUrl: string | null = null;
    if (organizerPendingFile && campIds.length > 0) {
      setUploadingOrganizerImage(true);
      try {
        const formData = new FormData();
        formData.append("file", organizerPendingFile);
        formData.append("id", campIds[0]);
        formData.append("target", "camps");
        const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
        const data = await res.json();
        if (data.image_url) {
          uploadedImageUrl = `${String(data.image_url).split("?")[0]}?t=${Date.now()}`;
        } else {
          alert(`Błąd obrazka: ${data.error || "Nie udało się"}`);
        }
      } catch {
        alert("Błąd połączenia przy wgrywaniu obrazka");
      }
      setUploadingOrganizerImage(false);
    }

    const updates = {
      description_short: String(organizerEditForm.description_short || ""),
      description_long: String(organizerEditForm.description_long || ""),
      camp_type: organizerEditForm.camp_type,
      organizer: String(organizerEditForm.organizer || ""),
      image_url: uploadedImageUrl || (organizerEditForm.image_url ? String(organizerEditForm.image_url) : null),
    };
    const results = await Promise.all(
      campIds.map((id) =>
        fetch("/api/admin/camps", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...updates }),
        }).then((r) => r.json())
      )
    );
    setCamps((prev) =>
      prev.map((c) => {
        const found = results.find((r) => r.updated?.id === c.id);
        return found?.updated ? mapCampRow(found.updated as Record<string, unknown>) : c;
      })
    );
    setEditingOrganizer(null);
    setOrganizerEditForm({});
    setOrganizerPendingFile(null);
    setOrganizerPendingPreview(null);
  };

  const startEditingSession = (camp: Camp) => {
    const row = camp as unknown as Record<string, unknown>;
    setEditingSession(camp.id);
    setSessionEditForm({
      title: camp.title,
      date_start: camp.date_start || "",
      date_end: camp.date_end || "",
      age_min: camp.age_min,
      age_max: camp.age_max,
      price_from: row.price_from ?? camp.price,
      price_to: row.price_to ?? null,
      venue_address: camp.venue_address,
      city: "Kraków",
      district: camp.district,
      source_url: camp.source_url || "",
      facebook_url: camp.facebook_url || "",
      is_featured: camp.is_featured,
    });
  };

  const saveSessionEdit = async (id: string) => {
    const dateStart = String(sessionEditForm.date_start || "");
    const dateEnd = String(sessionEditForm.date_end || "");
    const res = await fetch("/api/admin/camps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title: String(sessionEditForm.title || ""),
        date_start: dateStart,
        date_end: dateEnd,
        duration_days: calcDurationDays(dateStart, dateEnd),
        season: inferSeason(dateStart),
        age_min: sessionEditForm.age_min === "" || sessionEditForm.age_min === null ? null : Number(sessionEditForm.age_min),
        age_max: sessionEditForm.age_max === "" || sessionEditForm.age_max === null ? null : Number(sessionEditForm.age_max),
        price: null,
        price_from: sessionEditForm.price_from === "" || sessionEditForm.price_from === null ? null : Number(sessionEditForm.price_from),
        price_to: sessionEditForm.price_to === "" || sessionEditForm.price_to === null ? null : Number(sessionEditForm.price_to),
        venue_address: String(sessionEditForm.venue_address || ""),
        district: sessionEditForm.district,
        source_url: sessionEditForm.source_url ? String(sessionEditForm.source_url) : null,
        facebook_url: sessionEditForm.facebook_url ? String(sessionEditForm.facebook_url) : null,
        is_featured: Boolean(sessionEditForm.is_featured),
      }),
    });
    const data = await res.json();
    if (!res.ok) { alert(`Błąd: ${data.error}`); return; }
    if (data.updated) setCamps((prev) => prev.map((c) => (c.id === id ? mapCampRow(data.updated as Record<string, unknown>) : c)));
    setEditingSession(null);
  };

  const geocodeSessionAddress = async () => {
    const address = String(sessionEditForm.venue_address || "").trim();
    const city = String(sessionEditForm.city || "Kraków").trim();
    if (!address) {
      alert("Wpisz adres turnusu");
      return;
    }
    setSessionGeocoding(true);
    try {
      const res = await fetch("/api/admin/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, city: city || "Kraków" }),
      });
      const data = await res.json();
      if (data.lat && data.lng) {
        setSessionEditForm((prev) => ({
          ...prev,
          lat: data.lat,
          lng: data.lng,
          ...(data.district ? { district: data.district } : {}),
        }));
      } else {
        alert(data.error || "Nie znaleziono lokalizacji");
      }
    } catch {
      alert("Błąd geolokalizacji");
    }
    setSessionGeocoding(false);
  };

  const openAddTurnus = (orgKey: string) => {
    const hyphenIdx = orgKey.indexOf("-");
    const protoCampType = orgKey.slice(0, hyphenIdx) as Camp["camp_type"];
    const organizerName = orgKey.slice(hyphenIdx + 1);
    const proto = camps.find((c) => c.camp_type === protoCampType && (c.organizer || "Brak organizatora") === organizerName);
    const protoRow = (proto ?? {}) as Record<string, unknown>;
    setAddTurnusFor(orgKey);
    setAddTurnusForm({
      title: proto?.title || "",
      date_start: "",
      date_end: "",
      age_min: proto?.age_min ?? null,
      age_max: proto?.age_max ?? null,
      price_from: protoRow.price_from ?? proto?.price ?? null,
      price_to: protoRow.price_to ?? null,
      venue_address: proto?.venue_address || "",
      city: "Kraków",
      district: proto?.district || "Inne",
      source_url: proto?.source_url || "",
      facebook_url: proto?.facebook_url || "",
      is_featured: proto?.is_featured ?? false,
      lat: null,
      lng: null,
    });
  };

  const geocodeAddTurnusAddress = async () => {
    const address = String(addTurnusForm.venue_address || "").trim();
    const city = String(addTurnusForm.city || "Kraków").trim();
    if (!address) {
      alert("Wpisz adres turnusu");
      return;
    }
    setAddTurnusGeocoding(true);
    try {
      const res = await fetch("/api/admin/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, city: city || "Kraków" }),
      });
      const data = await res.json();
      if (data.lat && data.lng) {
        setAddTurnusForm((prev) => ({
          ...prev,
          lat: data.lat,
          lng: data.lng,
          ...(data.district ? { district: data.district } : {}),
        }));
      } else {
        alert(data.error || "Nie znaleziono lokalizacji");
      }
    } catch {
      alert("Błąd geolokalizacji");
    }
    setAddTurnusGeocoding(false);
  };

  const saveAddTurnus = async () => {
    if (!addTurnusFor || !addTurnusForm.date_start || !addTurnusForm.date_end) { alert("Podaj daty turnusu."); return; }
    setAddTurnusSaving(true);
    const hyphenIdx = addTurnusFor.indexOf("-");
    const protoCampType = addTurnusFor.slice(0, hyphenIdx) as Camp["camp_type"];
    const organizerName = addTurnusFor.slice(hyphenIdx + 1);
    const proto = camps.find((c) => c.camp_type === protoCampType && (c.organizer || "Brak organizatora") === organizerName);
    if (!proto) { setAddTurnusSaving(false); return; }
    const protoRow = proto as unknown as Record<string, unknown>;
    const dateStart = String(addTurnusForm.date_start || "");
    const dateEnd = String(addTurnusForm.date_end || "");
    const res = await fetch("/api/admin/camps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(addTurnusForm.title || proto.title), description_short: proto.description_short, description_long: proto.description_long,
        image_url: proto.image_url, date_start: dateStart, date_end: dateEnd,
        camp_type: proto.camp_type, season: inferSeason(dateStart), duration_days: calcDurationDays(dateStart, dateEnd),
        meals_included: proto.meals_included, transport_included: proto.transport_included,
        age_min: addTurnusForm.age_min === "" || addTurnusForm.age_min === null ? null : Number(addTurnusForm.age_min),
        age_max: addTurnusForm.age_max === "" || addTurnusForm.age_max === null ? null : Number(addTurnusForm.age_max),
        price: null,
        price_from: addTurnusForm.price_from === "" || addTurnusForm.price_from === null ? null : Number(addTurnusForm.price_from),
        price_to: addTurnusForm.price_to === "" || addTurnusForm.price_to === null ? null : Number(addTurnusForm.price_to),
        is_free: proto.is_free, district: addTurnusForm.district || proto.district, venue_name: proto.venue_name,
        venue_address: String(addTurnusForm.venue_address || ""), organizer: proto.organizer,
        source_url: addTurnusForm.source_url ? String(addTurnusForm.source_url) : null,
        facebook_url: addTurnusForm.facebook_url ? String(addTurnusForm.facebook_url) : null,
        is_featured: Boolean(addTurnusForm.is_featured),
      }),
    });
    const data = await res.json();
    if (data?.id) setCamps((prev) => [...prev, mapCampRow(data as Record<string, unknown>)]);
    setAddTurnusFor(null);
    setAddTurnusSaving(false);
  };

  const saveNewCamps = async () => {
    const validSessions = addSessions.filter((s) => s.date_start && s.date_end);
    if (!addForm.title || validSessions.length === 0) { alert("Podaj tytuł i co najmniej jeden turnus z datami."); return; }
    setAddSaving(true);
    const created: Camp[] = [];
    for (const session of validSessions) {
      const dateStart = session.date_start;
      const dateEnd = session.date_end;
      try {
        const res = await fetch("/api/admin/camps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: String(addForm.title || "").trim(),
            description_short: String(addForm.description_short || "Opis oferty"),
            description_long: String(addForm.description_long || ""),
            image_url: null, date_start: dateStart, date_end: dateEnd,
            camp_type: addForm.camp_type || "polkolonie", season: inferSeason(dateStart),
            duration_days: calcDurationDays(dateStart, dateEnd),
            meals_included: Boolean(addForm.meals_included), transport_included: false,
            age_min: addForm.age_min === "" || addForm.age_min === null ? null : Number(addForm.age_min),
            age_max: addForm.age_max === "" || addForm.age_max === null ? null : Number(addForm.age_max),
            price: null,
            price_from: addForm.price_from === "" || addForm.price_from === null ? null : Number(addForm.price_from),
            price_to: addForm.price_to === "" || addForm.price_to === null ? null : Number(addForm.price_to),
            is_free: Boolean(addForm.is_free), district: addForm.district || "Inne",
            venue_name: String(addForm.venue_name || "Miejsce"),
            venue_address: String(addForm.venue_address || "Krakow"),
            organizer: String(addForm.organizer || "Organizator"),
            source_url: addForm.source_url ? String(addForm.source_url) : null,
            facebook_url: addForm.facebook_url ? String(addForm.facebook_url) : null,
            is_featured: Boolean(addForm.is_featured),
          }),
        });
        const data = await res.json();
        if (data?.id) created.push(mapCampRow(data as Record<string, unknown>));
      } catch { /* skip */ }
    }
    setCamps((prev) => [...created, ...prev]);
    setAddSaving(false);
    setAddModal(false);
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
          {groupedByTypeAndOrganizer.filter(({ type }) => !typeFilter || type === typeFilter).map(({ type, organizers }) => {
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
                  organizers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-white px-3 py-4 text-[12px] text-muted">
                    Brak rekordów dla tego filtra.
                  </div>
                  ) : (
                  <div className="space-y-2">
                    {organizers.map(({ organizer, sessions }) => {
                      const orgKey = `${type}-${organizer}`;
                      const orgExpanded = !collapsedOrganizers[orgKey];
                      const proto = sessions[0];
                      const protoRow = proto as unknown as Record<string, unknown>;
                      const organizerExternalUrl =
                        typeof protoRow.source_url === "string" && protoRow.source_url.trim()
                          ? protoRow.source_url
                          : typeof protoRow.facebook_url === "string" && protoRow.facebook_url.trim()
                            ? protoRow.facebook_url
                            : null;
                      const isEditingOrg = editingOrganizer === orgKey;
                      return (
                        <div key={orgKey} className="rounded-xl border border-border bg-white overflow-hidden">
                          {/* Organizer header */}
                          <div className="flex items-center gap-2.5 px-3 py-2.5">
                            <button type="button" onClick={() => toggleOrganizer(orgKey)} className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                              {orgExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-foreground truncate">{organizer}</p>
                              <div className="flex items-center gap-2 text-[11px] text-muted mt-0.5 flex-wrap">
                                <span className="shrink-0">{CAMP_TYPE_LABELS[proto.camp_type]}</span>
                                {proto.description_short && (
                                  <span className="truncate max-w-[320px] opacity-70">{proto.description_short}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[11px] text-muted-foreground shrink-0 mr-1">
                              {sessions.length} {sessions.length === 1 ? "turnus" : sessions.length < 5 ? "turnusy" : "turnusów"}
                            </span>
                            <button onClick={() => startEditingOrganizer(orgKey, proto)} className={cn("p-1 rounded hover:bg-accent transition-colors shrink-0", isEditingOrg ? "text-primary" : "text-muted")} title="Edytuj dane organizatora">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => openAddTurnus(orgKey)} className="p-1 rounded hover:bg-accent text-muted transition-colors shrink-0" title="Dodaj turnus">
                              <Plus size={13} />
                            </button>
                            {organizerExternalUrl && (
                              <a href={organizerExternalUrl} target="_blank" rel="noopener" className="p-1 rounded hover:bg-accent text-muted transition-colors shrink-0">
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>

                          {/* Organizer shared-data edit form */}
                          {isEditingOrg && (
                            <div className="px-3 pb-3 pt-2 border-t border-border/50 bg-accent/20">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                <div className="md:col-span-3">
                                  <label className={labelClass}>Organizator</label>
                                  <input className={inputClass} value={(organizerEditForm.organizer as string) || ""} onChange={(e) => setOrganizerEditForm((p) => ({ ...p, organizer: e.target.value }))} />
                                </div>
                                <div className="md:col-span-1">
                                  <label className={labelClass}>Typ</label>
                                  <select className={inputClass} value={(organizerEditForm.camp_type as string) || "polkolonie"} onChange={(e) => setOrganizerEditForm((p) => ({ ...p, camp_type: e.target.value }))}>
                                    <option value="polkolonie">Półkolonie</option>
                                    <option value="kolonie">Kolonie</option>
                                    <option value="warsztaty_wakacyjne">Warsztaty wakacyjne</option>
                                  </select>
                                </div>
                                <div className="md:col-span-4">
                                  <label className={labelClass}>Krótki opis</label>
                                  <textarea rows={2} className={inputClass} value={(organizerEditForm.description_short as string) || ""} onChange={(e) => setOrganizerEditForm((p) => ({ ...p, description_short: e.target.value }))} />
                                </div>
                                <div className="md:col-span-4">
                                  <label className={labelClass}>Długi opis</label>
                                  <textarea rows={4} className={inputClass} value={(organizerEditForm.description_long as string) || ""} onChange={(e) => setOrganizerEditForm((p) => ({ ...p, description_long: e.target.value }))} />
                                </div>
                                <div className="md:col-span-4">
                                  <label className={labelClass}>Zdjęcie organizatora (wspólne)</label>
                                  <div className="flex flex-wrap gap-3 items-start">
                                    <div className="w-[180px] shrink-0">
                                      {(organizerPendingPreview || organizerEditForm.image_url) ? (
                                        <div className="relative group">
                                          <img
                                            src={String(organizerPendingPreview || organizerEditForm.image_url || "")}
                                            alt="Podgląd zdjęcia"
                                            className={cn("w-full aspect-[3/2] rounded-lg object-contain bg-accent/30 border border-border", organizerPendingPreview && "ring-2 ring-primary/40")}
                                          />
                                          {organizerPendingPreview && (
                                            <button
                                              onClick={() => { if (organizerPendingPreview) URL.revokeObjectURL(organizerPendingPreview); setOrganizerPendingFile(null); setOrganizerPendingPreview(null); }}
                                              className="absolute -top-2 -right-2 p-1 rounded-full bg-white border border-border text-muted-foreground hover:text-red-600 shadow-sm"
                                              title="Usuń wybrany plik"
                                            >
                                              <XCircle size={13} />
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="w-full aspect-[3/2] rounded-lg border border-dashed border-border flex items-center justify-center text-[11px] text-muted-foreground">
                                          Brak zdjęcia
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-2 flex-1 min-w-[260px]">
                                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground hover:border-primary/30 transition-colors cursor-pointer">
                                        <Upload size={11} />
                                        {organizerPendingPreview ? "Zmień plik" : "Wgraj plik"}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            if (organizerPendingPreview) URL.revokeObjectURL(organizerPendingPreview);
                                            setOrganizerPendingFile(file);
                                            setOrganizerPendingPreview(URL.createObjectURL(file));
                                          }}
                                        />
                                      </label>
                                      <input
                                        className={inputClass}
                                        placeholder="lub wklej URL obrazka"
                                        value={String(organizerEditForm.image_url || "")}
                                        onChange={(e) => setOrganizerEditForm((p) => ({ ...p, image_url: e.target.value }))}
                                      />
                                      <p className="text-[10px] text-muted">Po zapisie zdjęcie zostanie ustawione dla wszystkich turnusów organizatora.</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <p className="text-[10px] text-muted mb-2">Na poziomie organizatora edytujesz tylko: organizatora, typ oraz opisy. Reszta pól jest per turnus.</p>
                              <div className="flex items-center gap-2">
                                <button onClick={() => saveOrganizerEdit(sessions.map((s) => s.id))} disabled={uploadingOrganizerImage} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors disabled:opacity-60">
                                  {uploadingOrganizerImage ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} {uploadingOrganizerImage ? "Wgrywanie..." : "Zapisz wszystkie"}
                                </button>
                                <button onClick={() => { setEditingOrganizer(null); setOrganizerEditForm({}); }} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground transition-colors">
                                  <X size={11} /> Anuluj
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Sessions list */}
                          {orgExpanded && (
                            <div className="border-t border-border/40 divide-y divide-border/40">
                              {sessions.map((camp, si) => {
                                const isDraft = camp.status !== "published";
                                const isSessEdit = editingSession === camp.id;
                                return (
                                  <div key={camp.id} className={cn("flex items-center gap-2 px-3 py-2 pl-10", isDraft && "opacity-60")}>
                                    <span className="w-5 shrink-0 text-center text-[11px] font-mono text-muted-foreground">{si + 1}</span>
                                    {isSessEdit ? (
                                      <div className="w-full rounded-lg border border-border/60 bg-white p-2.5">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                          <div className="md:col-span-2">
                                            <label className={labelClass}>Tytuł turnusu</label>
                                            <input className={inputClass} value={String(sessionEditForm.title || "")} onChange={(e) => setSessionEditForm((p) => ({ ...p, title: e.target.value }))} />
                                          </div>
                                          <div>
                                            <label className={labelClass}>Data od</label>
                                            <input type="date" value={String(sessionEditForm.date_start || "")} onChange={(e) => setSessionEditForm((p) => ({ ...p, date_start: e.target.value }))} className={inputClass} />
                                          </div>
                                          <div>
                                            <label className={labelClass}>Data do</label>
                                            <input type="date" value={String(sessionEditForm.date_end || "")} onChange={(e) => setSessionEditForm((p) => ({ ...p, date_end: e.target.value }))} className={inputClass} />
                                          </div>
                                          <div>
                                            <label className={labelClass}>Wiek od</label>
                                            <input type="number" min={0} max={18} className={inputClass} value={sessionEditForm.age_min === null ? "" : String(sessionEditForm.age_min ?? "")} onChange={(e) => setSessionEditForm((p) => ({ ...p, age_min: e.target.value ? Number(e.target.value) : null }))} />
                                          </div>
                                          <div>
                                            <label className={labelClass}>Wiek do</label>
                                            <input type="number" min={0} max={18} className={inputClass} value={sessionEditForm.age_max === null ? "" : String(sessionEditForm.age_max ?? "")} onChange={(e) => setSessionEditForm((p) => ({ ...p, age_max: e.target.value ? Number(e.target.value) : null }))} />
                                          </div>
                                          <div>
                                            <label className={labelClass}>Cena od</label>
                                            <input type="number" min={0} className={inputClass} value={sessionEditForm.price_from === null ? "" : String(sessionEditForm.price_from ?? "")} onChange={(e) => setSessionEditForm((p) => ({ ...p, price_from: e.target.value ? Number(e.target.value) : null }))} />
                                          </div>
                                          <div>
                                            <label className={labelClass}>Cena do</label>
                                            <input type="number" min={0} className={inputClass} value={sessionEditForm.price_to === null ? "" : String(sessionEditForm.price_to ?? "")} onChange={(e) => setSessionEditForm((p) => ({ ...p, price_to: e.target.value ? Number(e.target.value) : null }))} />
                                          </div>
                                          <div className="md:col-span-2">
                                            <label className={labelClass}>URL źródła</label>
                                            <input className={inputClass} value={String(sessionEditForm.source_url || "")} onChange={(e) => setSessionEditForm((p) => ({ ...p, source_url: e.target.value }))} />
                                          </div>
                                          <div className="md:col-span-2">
                                            <label className={labelClass}>Facebook</label>
                                            <input className={inputClass} value={String(sessionEditForm.facebook_url || "")} onChange={(e) => setSessionEditForm((p) => ({ ...p, facebook_url: e.target.value }))} />
                                          </div>
                                          <div className="md:col-span-4 rounded-lg border border-border/60 p-3">
                                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lokalizacja</p>
                                            <div className="grid grid-cols-1 md:grid-cols-[1fr,260px] gap-3 items-start">
                                              <div className="space-y-2">
                                                <div>
                                                  <label className={labelClass}>Ulica</label>
                                                  <input className={inputClass} value={String(sessionEditForm.venue_address || "")} onChange={(e) => setSessionEditForm((p) => ({ ...p, venue_address: e.target.value }))} />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                  <div>
                                                    <label className={labelClass}>Miasto</label>
                                                    <input className={inputClass} value={String(sessionEditForm.city || "Kraków")} onChange={(e) => setSessionEditForm((p) => ({ ...p, city: e.target.value }))} />
                                                  </div>
                                                  <div>
                                                    <label className={labelClass}>Dzielnica</label>
                                                    <select className={inputClass} value={String(sessionEditForm.district || "Inne")} onChange={(e) => setSessionEditForm((p) => ({ ...p, district: e.target.value }))}>
                                                      {DISTRICT_LIST.map((district) => <option key={district} value={district}>{district}</option>)}
                                                    </select>
                                                  </div>
                                                </div>
                                                <div>
                                                  <label className={labelClass}>Współrzędne</label>
                                                  <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
                                                    <input type="number" step="any" className={inputClass} value={sessionEditForm.lat === null || sessionEditForm.lat === undefined ? "" : String(sessionEditForm.lat)} onChange={(e) => setSessionEditForm((p) => ({ ...p, lat: e.target.value === "" ? null : Number(e.target.value) }))} />
                                                    <input type="number" step="any" className={inputClass} value={sessionEditForm.lng === null || sessionEditForm.lng === undefined ? "" : String(sessionEditForm.lng)} onChange={(e) => setSessionEditForm((p) => ({ ...p, lng: e.target.value === "" ? null : Number(e.target.value) }))} />
                                                    <button
                                                      type="button"
                                                      onClick={geocodeSessionAddress}
                                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground transition-colors"
                                                    >
                                                      {sessionGeocoding ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} />}
                                                      {sessionGeocoding ? "Szukam..." : "Znajdź"}
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="rounded-lg border border-border overflow-hidden" style={{ height: 180 }}>
                                                {Number.isFinite(Number(sessionEditForm.lat)) && Number.isFinite(Number(sessionEditForm.lng)) ? (
                                                  <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-accent/20 text-[11px] text-muted">Ładowanie mapy...</div>}>
                                                    <MiniMapLazy lat={Number(sessionEditForm.lat)} lng={Number(sessionEditForm.lng)} />
                                                  </Suspense>
                                                ) : (
                                                  <div className="w-full h-full flex items-center justify-center bg-accent/20 text-[11px] text-muted">Mapa pojawi się po geolokalizacji</div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-2">
                                          <button onClick={() => saveSessionEdit(camp.id)} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors">
                                            <Save size={10} /> Zapisz
                                          </button>
                                          <button onClick={() => setEditingSession(null)} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-muted border border-border rounded hover:text-foreground transition-colors">
                                            <X size={10} /> Anuluj
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="text-[12px] font-medium text-foreground flex-1">
                                          {formatDateShort(camp.date_start)} — {formatDateShort(camp.date_end)}
                                        </span>
                                        <span className="text-[11px] text-muted shrink-0">{camp.duration_days} dni</span>
                                        <button onClick={() => startEditingSession(camp)} className="p-1 rounded hover:bg-accent text-muted transition-colors shrink-0" title="Edytuj daty">
                                          <Pencil size={12} />
                                        </button>
                                        <button onClick={() => toggleFeatured(camp)} className={cn("p-1 rounded transition-colors shrink-0", camp.is_featured ? "text-amber-500 hover:bg-amber-50" : "text-muted-foreground hover:bg-stone-100")} title="Wyróżnij">
                                          <Star size={12} fill={camp.is_featured ? "currentColor" : "none"} />
                                        </button>
                                        <button onClick={() => toggleStatus(camp)} className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors shrink-0", camp.status === "published" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-rose-100 text-rose-700 hover:bg-rose-200")}>
                                          {camp.status === "published" ? "Published" : "Draft"}
                                        </button>
                                        <button onClick={() => handleDelete(camp.id)} className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors shrink-0" title="Usuń">
                                          <Trash2 size={12} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
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

      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="text-[15px] font-bold text-foreground">Nowa kolonia</h2>
                <p className="text-[11px] text-muted mt-0.5">Dane organizatora raz — potem dodaj turnusy</p>
              </div>
              <button onClick={() => setAddModal(false)} className="p-1.5 rounded hover:bg-accent text-muted transition-colors"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className={labelClass}>Tytuł *</label>
                  <input className={inputClass} placeholder="np. Letni obóz sportowy" value={String(addForm.title || "")} onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Typ</label>
                  <select className={inputClass} value={String(addForm.camp_type || "polkolonie")} onChange={(e) => setAddForm((p) => ({ ...p, camp_type: e.target.value }))}>
                    <option value="polkolonie">Półkolonie</option>
                    <option value="kolonie">Kolonie</option>
                    <option value="warsztaty_wakacyjne">Warsztaty wakacyjne</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Organizator</label>
                  <input className={inputClass} value={String(addForm.organizer || "")} onChange={(e) => setAddForm((p) => ({ ...p, organizer: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Krótki opis</label>
                  <textarea rows={2} className={inputClass} value={String(addForm.description_short || "")} onChange={(e) => setAddForm((p) => ({ ...p, description_short: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Długi opis</label>
                  <textarea rows={3} className={inputClass} value={String(addForm.description_long || "")} onChange={(e) => setAddForm((p) => ({ ...p, description_long: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Wiek od</label>
                  <input type="number" min={0} max={18} className={inputClass} value={String(addForm.age_min ?? "")} onChange={(e) => setAddForm((p) => ({ ...p, age_min: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Wiek do</label>
                  <input type="number" min={0} max={18} className={inputClass} value={String(addForm.age_max ?? "")} onChange={(e) => setAddForm((p) => ({ ...p, age_max: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Cena od (zł)</label>
                  <input type="number" min={0} className={inputClass} value={String(addForm.price_from ?? "")} onChange={(e) => setAddForm((p) => ({ ...p, price_from: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Cena do (zł)</label>
                  <input type="number" min={0} className={inputClass} value={String(addForm.price_to ?? "")} onChange={(e) => setAddForm((p) => ({ ...p, price_to: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Miejsce</label>
                  <input className={inputClass} value={String(addForm.venue_name || "")} onChange={(e) => setAddForm((p) => ({ ...p, venue_name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Adres</label>
                  <input className={inputClass} value={String(addForm.venue_address || "")} onChange={(e) => setAddForm((p) => ({ ...p, venue_address: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>URL źródła</label>
                  <input className={inputClass} placeholder="https://..." value={String(addForm.source_url || "")} onChange={(e) => setAddForm((p) => ({ ...p, source_url: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Facebook</label>
                  <input className={inputClass} placeholder="https://facebook.com/..." value={String(addForm.facebook_url || "")} onChange={(e) => setAddForm((p) => ({ ...p, facebook_url: e.target.value }))} />
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                    <input type="checkbox" checked={Boolean(addForm.meals_included)} onChange={(e) => setAddForm((p) => ({ ...p, meals_included: e.target.checked }))} className="rounded border-border" />
                    Wyżywienie
                  </label>
                  <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                    <input type="checkbox" checked={Boolean(addForm.is_free)} onChange={(e) => setAddForm((p) => ({ ...p, is_free: e.target.checked }))} className="rounded border-border" />
                    Bezpłatne
                  </label>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Turnusy *</p>
                  <button onClick={() => setAddSessions((p) => [...p, { date_start: "", date_end: "" }])} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors">
                    <Plus size={12} /> Dodaj turnus
                  </button>
                </div>
                <div className="space-y-2">
                  {addSessions.map((session, si) => (
                    <div key={si} className="flex items-center gap-2 rounded-lg border border-border bg-accent/30 px-3 py-2">
                      <span className="text-[11px] font-mono text-muted-foreground w-5 shrink-0">{si + 1}.</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1">
                          <label className="block text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Od</label>
                          <input type="date" className={inputClass} value={session.date_start} onChange={(e) => setAddSessions((p) => p.map((s, i) => i === si ? { ...s, date_start: e.target.value } : s))} />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Do</label>
                          <input type="date" className={inputClass} value={session.date_end} onChange={(e) => setAddSessions((p) => p.map((s, i) => i === si ? { ...s, date_end: e.target.value } : s))} />
                        </div>
                      </div>
                      {addSessions.length > 1 && (
                        <button onClick={() => setAddSessions((p) => p.filter((_, i) => i !== si))} className="p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-between">
              <p className="text-[11px] text-muted">Zostanie utworzone {addSessions.filter((s) => s.date_start && s.date_end).length} rekord(ów) jako Draft</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setAddModal(false)} className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:text-foreground transition-colors">Anuluj</button>
                <button onClick={saveNewCamps} disabled={addSaving || !addForm.title || addSessions.filter((s) => s.date_start && s.date_end).length === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-foreground rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50">
                  {addSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {addSaving ? "Zapisywanie..." : "Utwórz turnusy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {addTurnusFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-[15px] font-bold text-foreground">Dodaj turnus</h2>
              <button onClick={() => setAddTurnusFor(null)} className="p-1.5 rounded hover:bg-accent text-muted transition-colors"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tytuł turnusu</label>
                  <input className={inputClass} value={String(addTurnusForm.title || "")} onChange={(e) => setAddTurnusForm((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Data od *</label>
                  <input type="date" className={inputClass} value={String(addTurnusForm.date_start || "")} onChange={(e) => setAddTurnusForm((p) => ({ ...p, date_start: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Data do *</label>
                  <input type="date" className={inputClass} value={String(addTurnusForm.date_end || "")} onChange={(e) => setAddTurnusForm((p) => ({ ...p, date_end: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Wiek od</label>
                  <input type="number" min={0} max={18} className={inputClass} value={addTurnusForm.age_min === null ? "" : String(addTurnusForm.age_min ?? "")} onChange={(e) => setAddTurnusForm((p) => ({ ...p, age_min: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <label className={labelClass}>Wiek do</label>
                  <input type="number" min={0} max={18} className={inputClass} value={addTurnusForm.age_max === null ? "" : String(addTurnusForm.age_max ?? "")} onChange={(e) => setAddTurnusForm((p) => ({ ...p, age_max: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <label className={labelClass}>Cena od</label>
                  <input type="number" min={0} className={inputClass} value={addTurnusForm.price_from === null ? "" : String(addTurnusForm.price_from ?? "")} onChange={(e) => setAddTurnusForm((p) => ({ ...p, price_from: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div>
                  <label className={labelClass}>Cena do</label>
                  <input type="number" min={0} className={inputClass} value={addTurnusForm.price_to === null ? "" : String(addTurnusForm.price_to ?? "")} onChange={(e) => setAddTurnusForm((p) => ({ ...p, price_to: e.target.value ? Number(e.target.value) : null }))} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>URL źródła</label>
                  <input className={inputClass} value={String(addTurnusForm.source_url || "")} onChange={(e) => setAddTurnusForm((p) => ({ ...p, source_url: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Facebook</label>
                  <input className={inputClass} value={String(addTurnusForm.facebook_url || "")} onChange={(e) => setAddTurnusForm((p) => ({ ...p, facebook_url: e.target.value }))} />
                </div>
                <div className="md:col-span-2 rounded-lg border border-border/60 p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lokalizacja</p>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr,260px] gap-3 items-start">
                    <div className="space-y-2">
                      <div>
                        <label className={labelClass}>Ulica</label>
                        <input className={inputClass} value={String(addTurnusForm.venue_address || "")} onChange={(e) => setAddTurnusForm((p) => ({ ...p, venue_address: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className={labelClass}>Miasto</label>
                          <input className={inputClass} value={String(addTurnusForm.city || "Kraków")} onChange={(e) => setAddTurnusForm((p) => ({ ...p, city: e.target.value }))} />
                        </div>
                        <div>
                          <label className={labelClass}>Dzielnica</label>
                          <select className={inputClass} value={String(addTurnusForm.district || "Inne")} onChange={(e) => setAddTurnusForm((p) => ({ ...p, district: e.target.value }))}>
                            {DISTRICT_LIST.map((district) => <option key={district} value={district}>{district}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Współrzędne</label>
                        <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
                          <input type="number" step="any" className={inputClass} value={addTurnusForm.lat === null || addTurnusForm.lat === undefined ? "" : String(addTurnusForm.lat)} onChange={(e) => setAddTurnusForm((p) => ({ ...p, lat: e.target.value === "" ? null : Number(e.target.value) }))} />
                          <input type="number" step="any" className={inputClass} value={addTurnusForm.lng === null || addTurnusForm.lng === undefined ? "" : String(addTurnusForm.lng)} onChange={(e) => setAddTurnusForm((p) => ({ ...p, lng: e.target.value === "" ? null : Number(e.target.value) }))} />
                          <button
                            type="button"
                            onClick={geocodeAddTurnusAddress}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground transition-colors"
                          >
                            {addTurnusGeocoding ? <Loader2 size={11} className="animate-spin" /> : <MapPin size={11} />}
                            {addTurnusGeocoding ? "Szukam..." : "Znajdź"}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border overflow-hidden" style={{ height: 180 }}>
                      {Number.isFinite(Number(addTurnusForm.lat)) && Number.isFinite(Number(addTurnusForm.lng)) ? (
                        <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-accent/20 text-[11px] text-muted">Ładowanie mapy...</div>}>
                          <MiniMapLazy lat={Number(addTurnusForm.lat)} lng={Number(addTurnusForm.lng)} />
                        </Suspense>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-accent/20 text-[11px] text-muted">Mapa pojawi się po geolokalizacji</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
              <button onClick={() => setAddTurnusFor(null)} className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:text-foreground transition-colors">Anuluj</button>
              <button onClick={saveAddTurnus} disabled={addTurnusSaving || !addTurnusForm.date_start || !addTurnusForm.date_end} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-foreground rounded-lg hover:bg-stone-700 transition-colors disabled:opacity-50">
                {addTurnusSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                {addTurnusSaving ? "Dodawanie..." : "Dodaj turnus"}
              </button>
            </div>
          </div>
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
