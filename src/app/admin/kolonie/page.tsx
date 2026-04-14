"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  ExternalLink,
  ImagePlus,
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
import { CAMP_CATEGORY_LABELS, CAMP_MAIN_CATEGORY_ICONS, CAMP_MAIN_CATEGORY_LABELS, DISTRICT_LIST } from "@/lib/mock-data";
import { cn, formatDateShort, formatPrice } from "@/lib/utils";
import type { Camp, Organizer } from "@/types/database";
import { ImageSection } from "@/components/admin/image-section";

const MiniMapLazy = lazy(() => import("../miejsca/mini-map").then((m) => ({ default: m.MiniMap })));

// ── Constants (outside component to avoid re-creation on every render) ─────

type DerivedCampStatus = Camp["status"] | "outdated";
type CampListFilter = "all" | "published" | "draft" | "outdated";

const STATUS_ORDER: Record<DerivedCampStatus, number> = {
  draft: 0, published: 1, outdated: 2, cancelled: 3, deleted: 4,
};

const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
const labelClass = "block text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1";

const FIELD_ALIASES: Record<string, string[]> = {
  title:               ["title", "tytul", "tytuł", "nazwa", "nazwa turnusu", "nazwa_polkolonii"],
  description_short:   ["description_short", "krotki opis", "krótki opis", "tematyka", "temat", "program"],
  description_long:    ["description_long", "dlugi opis", "długi opis"],
  main_category:       ["main_category", "camp_type", "typ", "rodzaj", "typ_oferty", "type"],
  category:            ["category", "kategoria", "kategoria_obozu", "camp_subtype", "podtyp"],
  subcategory:         ["subcategory", "podkategoria", "sub_category", "dyscyplina"],
  date_start:          ["date_start", "termin_od", "data od", "od"],
  date_end:            ["date_end", "termin_do", "data do", "do"],
  duration_days:       ["duration_days", "dni", "liczba dni", "czas trwania"],
  age_min:             ["age_min", "wiek_od", "wiek od"],
  age_max:             ["age_max", "wiek_do", "wiek do"],
  price:               ["price", "cena", "cena_za_tydzien", "cena_za_tydzien (pln, jesli dostepna)", "cena_za_tydzien (PLN, jeśli dostępna)"],
  price_from:          ["price_from", "cena_od", "cena od"],
  price_to:            ["price_to", "cena_do", "cena do"],
  is_free:             ["is_free", "bezplatne", "bezpłatne", "darmowe"],
  meals_included:      ["meals_included", "wyzywienie", "wyzywienie (tak/nie/brak danych)", "jedzenie"],
  transport_included:  ["transport_included", "transport", "dojazd", "dowoz", "dowóz"],
  organizer:           ["organizer", "organizator"],
  source_url:          ["source_url", "url", "link", "link_zrodlowy"],
  facebook_url:        ["facebook_url", "facebook", "fb", "facebook page"],
  venue_name:          ["venue_name", "miejsce", "nazwa miejsca"],
  venue_address:       ["venue_address", "adres", "address", "lokalizacja", "ulica"],
  city:                ["city", "miasto", "places"],
  care_hours:          ["care_hours", "godziny_opieki", "godziny", "hours"],
  seats:               ["seats", "liczba_miejsc", "liczba_miejsc (jesli dostepna)", "liczba_miejsc (jeśli dostępna)", "miejsca"],
};

const CATEGORY_ALIASES: Record<string, Camp["category"]> = {
  sport: "sportowe", sportowa: "sportowe", sportowy: "sportowe", sportowe: "sportowe",
  edukacja: "edukacyjne", edukacyjna: "edukacyjne", edukacyjny: "edukacyjne", edukacyjne: "edukacyjne",
  integracja: "integracyjne", integracyjna: "integracyjne", integracyjny: "integracyjne", integracyjne: "integracyjne",
  przygoda: "przygodowe", przygodowa: "przygodowe", przygodowy: "przygodowe", przygodowe: "przygodowe",
  artystyczna: "artystyczne", artystyczny: "artystyczne", art: "artystyczne", sztuka: "artystyczne", artystyczne: "artystyczne",
  kulinarne: "kulinarne", kulinarna: "kulinarne", kulinaria: "kulinarne", kuchnia: "kulinarne", gotowanie: "kulinarne",
  przyrodnicze: "przyrodnicze", przyrodnicza: "przyrodnicze", przyrodniczy: "przyrodnicze", przyroda: "przyrodnicze", natura: "przyrodnicze",
};

function resolveField(header: string): string | null {
  const key = header.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === key)) return field;
  }
  return null;
}

function mapCampRow(row: Record<string, unknown>): Camp {
  const priceFrom = typeof row.price_from === "number" ? row.price_from : null;
  const priceSingle = typeof row.price === "number" ? row.price : null;
  const organizerData = row.organizer_data as Record<string, unknown> | null | undefined;
  return {
    ...row,
    content_type: "camp",
    organizer: typeof organizerData?.name === "string" && organizerData.name.trim().length > 0
      ? organizerData.name
      : String(row.organizer || ""),
    price: priceFrom ?? priceSingle ?? null,
  } as Camp;
}

function asNumber(v?: string): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(/,/g, ".").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function inferCategory(raw: string | undefined): Camp["category"] {
  if (!raw) return null;
  return CATEGORY_ALIASES[raw.toLowerCase().trim()] ?? null;
}

function inferMainCategory(mappedType: string | undefined, title: string): Camp["main_category"] {
  const t = (mappedType || "").toLowerCase();
  const n = title.toLowerCase();
  if (t.includes("warsztat") || n.includes("warsztat")) return "warsztaty_wakacyjne";
  if (t.includes("polkoloni") || n.includes("polkoloni")) return "polkolonie";
  if (t.includes("koloni") || t.includes("oboz") || n.includes("koloni") || n.includes("oboz")) return "kolonie";
  return "polkolonie";
}

function inferSeason(dateStart?: string): Camp["season"] {
  if (!dateStart) return "caly_rok";
  const m = new Date(dateStart).getMonth() + 1;
  if ([6, 7, 8].includes(m)) return "lato";
  if ([12, 1, 2].includes(m)) return "zima";
  return "caly_rok";
}

function calcDurationDays(from?: string, to?: string): number {
  if (!from || !to) return 5;
  const diff = Math.round((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Number.isFinite(diff) && diff > 0 ? diff : 5;
}

function detectDistrict(location: string): Camp["district"] {
  const hit = DISTRICT_LIST.find((d) => location.toLowerCase().includes(d.toLowerCase()));
  return (hit || "Inne") as Camp["district"];
}

function splitAddress(venueAddress: string) {
  const parts = venueAddress.split(",").map((p) => p.trim()).filter(Boolean);
  return {
    street: parts.length >= 2 ? parts.slice(0, -1).join(", ") : parts[0] || "",
    city:   parts.length >= 2 ? parts[parts.length - 1] : "Kraków",
  };
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AdminCampsPage() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [collapsedOrganizers, setCollapsedOrganizers] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<CampListFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const [organizers, setOrganizers] = useState<Organizer[]>([]);

  const [pasteModal, setPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteHeaders, setPasteHeaders] = useState<string[]>([]);
  const [pastePreview, setPastePreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchCamps = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/camps");
    const data = await res.json();
    if (Array.isArray(data)) setCamps(data.map((c: Record<string, unknown>) => mapCampRow(c)));
    setLoading(false);
  }, []);

  useEffect(() => { fetchCamps(); }, [fetchCamps]);

  useEffect(() => {
    fetch("/api/admin/organizers")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setOrganizers(data); });
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────

  const getEffectiveStatus = useCallback((camp: Camp): DerivedCampStatus => {
    const today = new Date().toISOString().slice(0, 10);
    const end = camp.date_end ? camp.date_end.slice(0, 10) : null;
    if (camp.status === "published" && end && end < today) return "outdated";
    return camp.status;
  }, []);

  const filteredCamps = useMemo(() => {
    const scoped = typeFilter ? camps.filter((c) => c.main_category === typeFilter) : camps;
    if (statusFilter === "all") return scoped;
    if (statusFilter === "draft") return scoped.filter((c) => { const s = getEffectiveStatus(c); return s === "draft" || s === "cancelled"; });
    return scoped.filter((c) => getEffectiveStatus(c) === statusFilter);
  }, [camps, typeFilter, statusFilter, getEffectiveStatus]);

  const groupedByType = useMemo(() => {
    const order: Camp["main_category"][] = ["polkolonie", "kolonie", "warsztaty_wakacyjne"];
    return order.map((type) => {
      const typeItems = filteredCamps.filter((c) => c.main_category === type);
      const organizerGroups = new Map<string, { organizer: string; items: Camp[] }>();

      typeItems.forEach((camp) => {
        const organizer = (camp.organizer_data?.name ?? camp.organizer) || "Brak organizatora";
        const key = camp.organizer_id ? `id:${camp.organizer_id}` : organizer.toLowerCase();
        const existing = organizerGroups.get(key);
        if (existing) {
          existing.items.push(camp);
          return;
        }
        organizerGroups.set(key, { organizer, items: [camp] });
      });

      const byOrganizer = Array.from(organizerGroups.values())
        .sort((a, b) => a.organizer.localeCompare(b.organizer, "pl"))
        .map((group) => ({
          organizer: group.organizer,
          items: group.items.sort((a, b) => {
            const sd = STATUS_ORDER[getEffectiveStatus(a)] - STATUS_ORDER[getEffectiveStatus(b)];
            return sd !== 0 ? sd : a.title.localeCompare(b.title, "pl");
          }),
        }));
      return { type, byOrganizer };
    });
  }, [filteredCamps, getEffectiveStatus]);

  const publishedCount = useMemo(() => camps.filter((c) => getEffectiveStatus(c) === "published").length, [camps, getEffectiveStatus]);
  const draftCount    = useMemo(() => camps.filter((c) => { const s = getEffectiveStatus(c); return s === "draft" || s === "cancelled"; }).length, [camps, getEffectiveStatus]);
  const outdatedCount = useMemo(() => camps.filter((c) => getEffectiveStatus(c) === "outdated").length, [camps, getEffectiveStatus]);

  const sectionStats = useMemo(() => Object.fromEntries(
    Object.keys(CAMP_MAIN_CATEGORY_LABELS).map((type) => {
      const tc = camps.filter((c) => c.main_category === type);
      return [type, {
        all:      tc.length,
        published: tc.filter((c) => getEffectiveStatus(c) === "published").length,
        draft:    tc.filter((c) => { const s = getEffectiveStatus(c); return s === "draft" || s === "cancelled"; }).length,
        outdated: tc.filter((c) => getEffectiveStatus(c) === "outdated").length,
      }];
    })
  ), [camps, getEffectiveStatus]);

  const displayedTypeKeys = useMemo(
    () => groupedByType.filter(({ type }) => !typeFilter || type === typeFilter).map(({ type }) => type),
    [groupedByType, typeFilter]
  );
  const toggleOrganizer = (key: string) =>
    setCollapsedOrganizers((prev) => ({ ...prev, [key]: !prev[key] }));
  const hasExpandedCategories = useMemo(
    () => displayedTypeKeys.some((t) => !collapsedCategories[t]),
    [displayedTypeKeys, collapsedCategories]
  );

  // ── Filter / collapse helpers ──────────────────────────────────────────────

  const toggleCategory = (type: string) =>
    setCollapsedCategories((prev) => ({ ...prev, [type]: !prev[type] }));

  const toggleAllCategories = () => {
    if (displayedTypeKeys.length === 0) return;
    setCollapsedCategories(Object.fromEntries(displayedTypeKeys.map((t) => [t, hasExpandedCategories])));
  };

  const toggleStatusFilter = (filter: CampListFilter) => {
    const next = statusFilter === filter ? "all" : filter;
    setTypeFilter(null);
    setStatusFilter(next);
    setCollapsedCategories(Object.fromEntries(
      Object.keys(CAMP_MAIN_CATEGORY_LABELS).map((type) => [
        type,
        camps.filter((c) => {
          if (c.main_category !== type) return false;
          if (next === "all") return true;
          if (next === "draft") { const s = getEffectiveStatus(c); return s === "draft" || s === "cancelled"; }
          return getEffectiveStatus(c) === next;
        }).length === 0,
      ])
    ));
  };

  const toggleTypeStatusFilter = (type: string, filter: CampListFilter) => {
    if (typeFilter === type && statusFilter === filter) { setTypeFilter(null); setStatusFilter("all"); return; }
    setTypeFilter(type);
    setStatusFilter(filter);
    setCollapsedCategories((prev) => ({ ...prev, [type]: false }));
  };

  // ── Paste import ───────────────────────────────────────────────────────────

  const parsePastedData = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) { setPasteHeaders([]); setPastePreview([]); return; }

    // Remove literal newlines inside JSON/Python string values (e.g. URLs with trailing \n before closing quote)
    const fixLiteralNewlines = (s: string) => {
      let r = "", inStr = false, esc = false;
      for (const c of s) {
        if (esc) { r += c; esc = false; }
        else if (c === "\\" && inStr) { r += c; esc = true; }
        else if (c === '"') { inStr = !inStr; r += c; }
        else if (inStr && (c === "\n" || c === "\r")) { /* drop literal newlines inside strings */ }
        else r += c;
      }
      return r;
    };

    const structMatch = trimmed.match(/[\[{][\s\S]*[\]}]/);
    if (structMatch) {
      const raw = fixLiteralNewlines(structMatch[0]
        .replace(/#[^\n]*/g, "")
        .replace(/<NA>/g, "null")
        .replace(/\bNaN\b/g, "null"));

      const pythonToJson = (input: string) => {
        let out = ""; let inSingle = false; let escaped = false;
        for (const ch of input) {
          if (inSingle) {
            if (escaped) { out += ch; escaped = false; continue; }
            if (ch === "\\") { out += "\\\\"; escaped = true; continue; }
            if (ch === "'") { inSingle = false; out += '"'; continue; }
            if (ch === '"') { out += '\\"'; continue; }
            out += ch; continue;
          }
          if (ch === "'") { inSingle = true; out += '"'; continue; }
          out += ch;
        }
        return out;
      };

      for (const attempt of [raw, pythonToJson(raw)]) {
        try {
          const obj = JSON.parse(
            attempt.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bNone\b/g, "null")
          );
          if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
            const headers = [...new Set(obj.flatMap((o: Record<string, unknown>) => Object.keys(o)))];
            setPasteHeaders(headers);
            setPastePreview(obj.map((o: Record<string, unknown>) => {
              const row: Record<string, string> = {};
              headers.forEach((h) => { row[h] = o[h] != null ? String(o[h]) : ""; });
              return row;
            }));
            return;
          }
        } catch { /* try next */ }
      }
    }

    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) { setPasteHeaders([]); setPastePreview([]); return; }
    const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1)
      .map((line) => {
        const vals = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ""; });
        return row;
      })
      .filter((r) => Object.values(r).some(Boolean));
    setPasteHeaders(headers);
    setPastePreview(rows);
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

      if (!mapped.title) { setImportProgress({ done: i + 1, total: pastePreview.length }); continue; }

      const dateStart  = mapped.date_start || new Date().toISOString().slice(0, 10);
      const dateEnd    = mapped.date_end || dateStart;
      const priceFrom  = asNumber(mapped.price_from) ?? asNumber(mapped.price);
      const priceTo    = asNumber(mapped.price_to);
      const shortDesc  = mapped.description_short || "Opis oferty";
      const careHours  = mapped.care_hours ? `Godziny opieki: ${mapped.care_hours}.` : "";
      const seats      = mapped.seats ? `Liczba miejsc: ${mapped.seats}.` : "";
      const longDesc   = mapped.description_long || `${shortDesc}${careHours ? ` ${careHours}` : ""}${seats ? ` ${seats}` : ""}`.trim();
      const venueAddress = mapped.venue_address?.trim() || "";
      const cityHint   = mapped.city?.trim() || "";
      const organizerName = mapped.organizer || mapped.venue_name || "Organizator";
      const matchedOrg = organizers.find((o) => o.name.toLowerCase() === organizerName.toLowerCase());

      try {
        // Step 1 — create camp with core data
        const res = await fetch("/api/admin/camps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title:            mapped.title.trim(),
            description_short: shortDesc,
            description_long:  longDesc,
            date_start:        dateStart,
            date_end:          dateEnd,
            main_category:     inferMainCategory(mapped.main_category, mapped.title),
            category:          inferCategory(mapped.category),
            subcategory:       mapped.subcategory?.trim() || null,
            season:            inferSeason(dateStart),
            duration_days:     asNumber(mapped.duration_days) || calcDurationDays(dateStart, dateEnd),
            meals_included:    ["tak", "true", "1"].includes((mapped.meals_included || "").toLowerCase()),
            transport_included: ["tak", "true", "1"].includes((mapped.transport_included || "").toLowerCase()),
            age_min:           asNumber(mapped.age_min),
            age_max:           asNumber(mapped.age_max),
            price_from:        priceFrom,
            price_to:          priceTo,
            is_free:           ["tak", "true", "1"].includes((mapped.is_free || "").toLowerCase()) || (priceFrom ?? priceTo ?? null) === 0,
            venue_name:        mapped.venue_name || organizerName,
            venue_address:     venueAddress,
            organizer:         organizerName,
            organizer_id:      matchedOrg?.id ?? null,
            source_url:        mapped.source_url?.trim() || null,
            facebook_url:      mapped.facebook_url?.trim() || null,
            is_featured:       false,
          }),
        });
        const data = await res.json();
        if (!data?.id) { setImportProgress({ done: i + 1, total: pastePreview.length }); continue; }
        imported.push(mapCampRow(data));

        // Step 2 — geocode and apply district + lat/lng
        if (venueAddress) {
          try {
            if (i > 0) await new Promise((r) => setTimeout(r, 1100));
            const { street, city: addrCity } = splitAddress(venueAddress);
            const city = addrCity !== "Kraków" ? addrCity : (cityHint || "Kraków");
            if (street) {
              const geoRes = await fetch("/api/admin/geocode", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: street, city }),
              });
              const geo = await geoRes.json();
              const district = (geo.district || detectDistrict(venueAddress)) as Camp["district"];
              if (geo.lat && geo.lng) {
                // Full update: lat + lng + district via PUT
                await fetch("/api/admin/camps", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: data.id, lat: geo.lat, lng: geo.lng, district }),
                });
                const idx = imported.findIndex((c) => c.id === data.id);
                if (idx !== -1) imported[idx] = { ...imported[idx], lat: geo.lat, lng: geo.lng, district };
              } else if (district && district !== "Inne") {
                // Geocoding failed for coords but we can still set district
                await fetch("/api/admin/camps", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: data.id, district }),
                });
                const idx = imported.findIndex((c) => c.id === data.id);
                if (idx !== -1) imported[idx] = { ...imported[idx], district };
              }
            }
          } catch { /* geocoding is best-effort */ }
        }

        // Step 3 — pick a random photo from the category folder in Supabase storage
        const campMainCat = inferMainCategory(mapped.main_category, mapped.title);
        const campCategory = inferCategory(mapped.category);
        if (campMainCat) {
          try {
            const photoRes = await fetch("/api/admin/random-photo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: data.id,
                main_category: campMainCat,
                category: campCategory,
                subcategory: mapped.subcategory?.trim() || null,
              }),
            });
            const photo = await photoRes.json();
            if (photo.image_url) {
              const idx = imported.findIndex((c) => c.id === data.id);
              if (idx !== -1) imported[idx] = { ...imported[idx], image_url: photo.image_url };
            }
          } catch { /* photo assignment is best-effort */ }
        }
      } catch { /* skip row */ }

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

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const startEditing = (camp: Camp) => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setEditing(camp.id);
    const { street, city } = splitAddress(camp.venue_address || "");
    const row = camp as unknown as Record<string, unknown>;
    setEditForm({
      title:              camp.title,
      description_short:  camp.description_short,
      description_long:   camp.description_long,
      main_category:      camp.main_category,
      category:           camp.category ?? null,
      subcategory:        camp.subcategory ?? null,
      season:             camp.season,
      date_start:         camp.date_start,
      date_end:           camp.date_end,
      duration_days:      camp.duration_days,
      age_min:            camp.age_min,
      age_max:            camp.age_max,
      price_from:         row.price_from ?? camp.price,
      price_to:           row.price_to ?? null,
      organizer:          camp.organizer,
      organizer_id:       camp.organizer_id ?? null,
      source_url:         camp.source_url,
      facebook_url:       camp.facebook_url ?? "",
      venue_name:         camp.venue_name,
      venue_address:      camp.venue_address,
      street,
      city,
      district:           camp.district,
      lat:                camp.lat ?? null,
      lng:                camp.lng ?? null,
      is_free:            camp.is_free,
      is_featured:        camp.is_featured,
      meals_included:     camp.meals_included,
      transport_included: camp.transport_included,
      status:             camp.status,
    });
  };

  const saveEdit = async (id: string) => {
    let newImageUrl: string | null = null;

    if (pendingFile) {
      setUploadingImage(id);
      try {
        const formData = new FormData();
        formData.append("file", pendingFile);
        formData.append("id", id);
        formData.append("target", "camps");
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

    const dateStart = String(editForm.date_start || "");
    const dateEnd   = String(editForm.date_end || "");
    const updates: Record<string, unknown> = {
      title:              String(editForm.title || ""),
      description_short:  String(editForm.description_short || ""),
      description_long:   String(editForm.description_long || ""),
      main_category:      editForm.main_category,
      category:           editForm.category ?? null,
      subcategory:        editForm.subcategory ?? null,
      season:             editForm.season,
      date_start:         dateStart,
      date_end:           dateEnd,
      duration_days:      Number(editForm.duration_days) || calcDurationDays(dateStart, dateEnd),
      age_min:            editForm.age_min == null || editForm.age_min === "" ? null : Number(editForm.age_min),
      age_max:            editForm.age_max == null || editForm.age_max === "" ? null : Number(editForm.age_max),
      price_from:         editForm.price_from == null || editForm.price_from === "" ? null : Number(editForm.price_from),
      price_to:           editForm.price_to == null || editForm.price_to === "" ? null : Number(editForm.price_to),
      organizer:          String(editForm.organizer || ""),
      organizer_id:       editForm.organizer_id || null,
      source_url:         editForm.source_url ? String(editForm.source_url) : null,
      facebook_url:       editForm.facebook_url ? String(editForm.facebook_url) : null,
      venue_name:         String(editForm.venue_name || ""),
      venue_address:      [String(editForm.street || "").trim(), String(editForm.city || "Kraków").trim()].filter(Boolean).join(", "),
      district:           editForm.district,
      is_featured:        Boolean(editForm.is_featured),
      is_free:            Boolean(editForm.is_free),
      meals_included:     Boolean(editForm.meals_included),
      transport_included: Boolean(editForm.transport_included),
      status:             editForm.status,
    };
    if (newImageUrl) updates.image_url = newImageUrl;

    const res = await fetch("/api/admin/camps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    const data = await res.json();
    if (!res.ok) { alert(`Błąd zapisu: ${data.error || "Nieznany błąd"}`); return; }

    // Persist geocoded coords
    if (typeof editForm.lat === "number" && typeof editForm.lng === "number") {
      fetch("/api/admin/camps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, lat: editForm.lat, lng: editForm.lng, district: editForm.district }),
      }).catch(() => {});
    }

    if (data.updated) {
      setCamps((prev) => prev.map((c) =>
        c.id === id
          ? { ...mapCampRow(data.updated as Record<string, unknown>), lat: (editForm.lat as number) ?? c.lat, lng: (editForm.lng as number) ?? c.lng }
          : c
      ));
    }
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setEditing(null);
    setEditForm({});
  };

  const createCamp = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch("/api/admin/camps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:              "Nowa kolonia",
        description_short:  "Opis oferty",
        description_long:   "",
        date_start:         today,
        date_end:           today,
        main_category:      "polkolonie",
        season:             "lato",
        duration_days:      5,
        meals_included:     false,
        transport_included: false,
        age_min:            null,
        age_max:            null,
        price_from:         null,
        price_to:           null,
        is_free:            false,
        district:           "Inne",
        venue_name:         "Miejsce",
        venue_address:      "Kraków",
        organizer:          "Organizator",
        source_url:         null,
        facebook_url:       null,
        is_featured:        false,
      }),
    });
    const data = await res.json();
    if (data?.id) {
      const newCamp = mapCampRow(data);
      setCamps((prev) => [newCamp, ...prev]);
      startEditing(newCamp);
    } else {
      alert(`Błąd: ${data.error || "Nie udało się utworzyć kolonii"}`);
    }
  };

  const toggleStatus = async (camp: Camp) => {
    const newStatus = camp.status === "published" ? "draft" : "published";
    const res = await fetch("/api/admin/camps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: camp.id, status: newStatus }),
    });
    if (res.ok) setCamps((prev) => prev.map((c) => (c.id === camp.id ? { ...c, status: newStatus } : c)));
  };

  const toggleFeatured = async (camp: Camp) => {
    const next = !camp.is_featured;
    const res = await fetch("/api/admin/camps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: camp.id, is_featured: next }),
    });
    const data = await res.json();
    if (!res.ok) { alert(`Błąd: ${data.error || "Nie udało się"}`); return; }
    setCamps((prev) => prev.map((c) => (c.id === camp.id ? { ...c, is_featured: next } : c)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Na pewno chcesz usunąć?")) return;
    await fetch("/api/admin/camps", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCamps((prev) => prev.filter((c) => c.id !== id));
  };

  const handleFileSelect = (file: File) => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
  };

  const clearPendingFile = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  };

  const geocodeAddress = async () => {
    const street = String(editForm.street || "").trim();
    const city   = String(editForm.city || "Kraków").trim() || "Kraków";
    if (!street) return;
    setGeocoding(true);
    try {
      const res  = await fetch("/api/admin/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: street, city }),
      });
      const data = await res.json();
      if (data.lat && data.lng) {
        setEditForm((prev) => ({
          ...prev,
          lat: data.lat,
          lng: data.lng,
          ...(data.district ? { district: data.district } : {}),
        }));
      }
    } catch { /* silent */ }
    setGeocoding(false);
  };

  const updateField = (key: string, value: unknown) =>
    setEditForm((prev) => ({ ...prev, [key]: value }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-foreground">Kolonie</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setPasteModal(true)} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <ClipboardPaste size={14} /> Wklej dane
          </button>
          <button onClick={createCamp} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-white bg-foreground rounded-xl hover:bg-stone-700 transition-colors">
            <Plus size={14} /> Dodaj
          </button>
          <button onClick={fetchCamps} className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => toggleStatusFilter("all")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>{camps.length} kolonii</button>
        <button onClick={() => toggleStatusFilter("published")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>{publishedCount} published</button>
        <button onClick={() => toggleStatusFilter("draft")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", draftCount > 0 ? (statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200") : (statusFilter === "draft" ? "bg-stone-300 text-stone-700" : "bg-stone-200 text-stone-500 hover:bg-stone-300"))}>{draftCount} draft</button>
        <button onClick={() => toggleStatusFilter("outdated")} className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors", statusFilter === "outdated" ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-700 hover:bg-amber-200")}>{outdatedCount} outdated</button>
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
          {groupedByType.filter(({ type }) => !typeFilter || type === typeFilter).map(({ type, byOrganizer }) => {
            const expanded = !collapsedCategories[type];
            const stats = sectionStats[type] ?? { all: 0, published: 0, draft: 0, outdated: 0 };
            const allItems = byOrganizer.flatMap((g) => g.items);
            return (
              <div key={type}>
                <div className="w-full flex items-center gap-2 mb-2 rounded-md px-1.5 py-1 hover:bg-accent/50 transition-colors">
                  <button type="button" onClick={() => toggleCategory(type)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    {expanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground rotate-180" />}
                    <span className="text-lg">{CAMP_MAIN_CATEGORY_ICONS[type]}</span>
                    <h2 className="text-[13px] font-semibold text-foreground">{CAMP_MAIN_CATEGORY_LABELS[type]}</h2>
                  </button>
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "all")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "all" ? "bg-sky-200 text-sky-800" : "bg-sky-100 text-sky-700 hover:bg-sky-200")}>{stats.all} all</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "published")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "published" ? "bg-emerald-200 text-emerald-800" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")}>{stats.published} published</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "draft")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", stats.draft > 0 ? (typeFilter === type && statusFilter === "draft" ? "bg-rose-200 text-rose-800" : "bg-rose-100 text-rose-700 hover:bg-rose-200") : (typeFilter === type && statusFilter === "draft" ? "bg-stone-300 text-stone-700" : "bg-stone-200 text-stone-500 hover:bg-stone-300"))}>{stats.draft} draft</button>
                    <button type="button" onClick={() => toggleTypeStatusFilter(type, "outdated")} className={cn("px-1.5 py-0.5 rounded-full font-medium transition-colors", typeFilter === type && statusFilter === "outdated" ? "bg-amber-200 text-amber-800" : "bg-amber-100 text-amber-700 hover:bg-amber-200")}>{stats.outdated} outdated</button>
                  </div>
                </div>

                {expanded && (
                  allItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 bg-white px-3 py-4 text-[12px] text-muted">
                      Brak rekordów dla tego filtra.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {byOrganizer.filter((g) => g.items.length > 0).map(({ organizer, items }) => {
                        const orgKey = `${type}::${organizer}`;
                        const orgExpanded = !collapsedOrganizers[orgKey];
                        return (
                          <div key={orgKey}>
                            <button
                              type="button"
                              onClick={() => toggleOrganizer(orgKey)}
                              className="flex items-center gap-1.5 w-full text-left px-1.5 py-0.5 rounded hover:bg-accent/40 transition-colors mb-1"
                            >
                              {orgExpanded ? <ChevronDown size={12} className="text-muted-foreground shrink-0" /> : <ChevronUp size={12} className="text-muted-foreground shrink-0 rotate-180" />}
                              <span className="text-[11px] font-semibold text-muted-foreground truncate">{organizer}</span>
                              <span className="ml-auto text-[10px] text-muted shrink-0">{items.length}</span>
                            </button>
                            {orgExpanded && (
                              <div className="space-y-1.5 pl-3 border-l border-border/40 ml-1.5">
                                {items.map((camp, index) => {
                        const isEditing = editing === camp.id;
                        const effectiveStatus = getEffectiveStatus(camp);
                        const isDraft = effectiveStatus !== "published";
                        const externalUrl = camp.source_url || camp.facebook_url;
                        return (
                          <div key={camp.id} className={cn("rounded-lg border border-border/70", isDraft ? "bg-stone-100 opacity-70" : "bg-white")}>
                            <div className="flex items-center gap-2.5 px-3 py-2.5">
                              <span className="shrink-0 w-6 text-center text-[11px] font-mono text-muted-foreground">{index + 1}</span>
                              <span className="shrink-0 text-lg">{CAMP_MAIN_CATEGORY_ICONS[camp.main_category] || "🏕️"}</span>

                              {camp.image_url ? (
                                <img src={camp.image_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                              ) : (
                                <span className="w-8 h-8 rounded bg-stone-100 shrink-0 flex items-center justify-center text-[10px] text-stone-400">—</span>
                              )}

                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-foreground truncate">{camp.title}</p>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5 flex-wrap">
                                  {camp.organizer && <><span className="truncate max-w-[140px]">{camp.organizer}</span><span className="opacity-40">·</span></>}
                                  <span>{formatDateShort(camp.date_start)}{camp.date_end ? ` – ${formatDateShort(camp.date_end)}` : ""}</span>
                                  <span className="opacity-40">·</span>
                                  <span>{formatPrice(camp.price)}</span>
                                  {camp.venue_address && <><span className="opacity-40">·</span><span className="truncate max-w-[120px]">{camp.venue_address}</span></>}
                                </div>
                              </div>

                              <button onClick={() => startEditing(camp)} className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Edytuj"><Pencil size={13} /></button>
                              <button onClick={() => toggleFeatured(camp)} className={cn("p-1 rounded transition-colors", camp.is_featured ? "text-amber-500 hover:bg-amber-50" : "text-muted hover:bg-accent")} title="Wyróżnij">
                                <Star size={13} fill={camp.is_featured ? "currentColor" : "none"} />
                              </button>
                              {externalUrl && (
                                <a href={externalUrl} target="_blank" rel="noopener" className="p-1 rounded hover:bg-accent text-muted transition-colors" title="Źródło">
                                  <ExternalLink size={13} />
                                </a>
                              )}
                              {effectiveStatus === "outdated" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700">Outdated</span>
                              ) : (
                                <button onClick={() => toggleStatus(camp)} className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors",
                                  camp.status === "published" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                )}>
                                  {camp.status === "published" ? "Published" : camp.status === "cancelled" ? "Cancelled" : "Draft"}
                                </button>
                              )}
                              <button onClick={() => handleDelete(camp.id)} className="p-1 rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Usuń">
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {isEditing && (
                              <div className="px-3 pb-3 pt-2 border-t border-border/50">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
                                  <div className="md:col-span-6">
                                    <label className={labelClass}>Tytuł</label>
                                    <input className={inputClass} value={(editForm.title as string) || ""} onChange={(e) => updateField("title", e.target.value)} />
                                  </div>

                                  <div className="md:col-span-6">
                                    <label className={labelClass}>Krótki opis</label>
                                    <textarea rows={2} className={inputClass} value={(editForm.description_short as string) || ""} onChange={(e) => updateField("description_short", e.target.value)} />
                                  </div>
                                  <div className="md:col-span-6">
                                    <label className={labelClass}>Długi opis</label>
                                    <textarea rows={5} className={inputClass} value={(editForm.description_long as string) || ""} onChange={(e) => updateField("description_long", e.target.value)} />
                                  </div>

                                  <div>
                                    <label className={labelClass}>Data od</label>
                                    <input type="date" className={inputClass} value={(editForm.date_start as string) || ""} onChange={(e) => updateField("date_start", e.target.value)} />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Data do</label>
                                    <input type="date" className={inputClass} value={(editForm.date_end as string) || ""} onChange={(e) => updateField("date_end", e.target.value || null)} />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Wiek od</label>
                                    <input type="number" min={0} max={18} className={inputClass} value={editForm.age_min == null ? "" : String(editForm.age_min)} onChange={(e) => updateField("age_min", e.target.value ? Number(e.target.value) : null)} />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Wiek do</label>
                                    <input type="number" min={0} max={18} className={inputClass} value={editForm.age_max == null ? "" : String(editForm.age_max)} onChange={(e) => updateField("age_max", e.target.value ? Number(e.target.value) : null)} />
                                  </div>

                                  <div>
                                    <label className={labelClass}>Cena od (zł)</label>
                                    <input type="number" min={0} className={inputClass} value={editForm.price_from == null ? "" : String(editForm.price_from)} onChange={(e) => updateField("price_from", e.target.value ? Number(e.target.value) : null)} />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Cena do (zł)</label>
                                    <input type="number" min={0} className={inputClass} value={editForm.price_to == null ? "" : String(editForm.price_to)} onChange={(e) => updateField("price_to", e.target.value ? Number(e.target.value) : null)} />
                                  </div>
                                  <div className="md:col-span-4 flex items-center gap-4 pt-5">
                                    <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                                      <input type="checkbox" checked={Boolean(editForm.is_free)} onChange={(e) => updateField("is_free", e.target.checked)} className="rounded border-border" />
                                      Bezpłatne
                                    </label>
                                    <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                                      <input type="checkbox" checked={Boolean(editForm.meals_included)} onChange={(e) => updateField("meals_included", e.target.checked)} className="rounded border-border" />
                                      Wyżywienie
                                    </label>
                                    <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                                      <input type="checkbox" checked={Boolean(editForm.transport_included)} onChange={(e) => updateField("transport_included", e.target.checked)} className="rounded border-border" />
                                      Transport
                                    </label>
                                  </div>

                                  <div className="md:col-span-3">
                                    <label className={labelClass}>URL źródła</label>
                                    <input className={inputClass} value={(editForm.source_url as string) || ""} onChange={(e) => updateField("source_url", e.target.value)} placeholder="https://..." />
                                  </div>
                                  <div className="md:col-span-3">
                                    <label className={labelClass}>Facebook</label>
                                    <input className={inputClass} value={(editForm.facebook_url as string) || ""} onChange={(e) => updateField("facebook_url", e.target.value)} placeholder="https://facebook.com/..." />
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className={labelClass}>Main category</label>
                                    <select className={inputClass} value={(editForm.main_category as string) || "polkolonie"} onChange={(e) => updateField("main_category", e.target.value)}>
                                      <option value="polkolonie">Półkolonie</option>
                                      <option value="kolonie">Kolonie</option>
                                      <option value="warsztaty_wakacyjne">Warsztaty wakacyjne</option>
                                    </select>
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className={labelClass}>Category</label>
                                    <select className={inputClass} value={(editForm.category as string) || ""} onChange={(e) => updateField("category", e.target.value || null)}>
                                      <option value="">— brak —</option>
                                      {(Object.entries(CAMP_CATEGORY_LABELS) as [string, string][]).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="md:col-span-2">
                                    <label className={labelClass}>Subcategory</label>
                                    <input className={inputClass} value={(editForm.subcategory as string) || ""} onChange={(e) => updateField("subcategory", e.target.value || null)} placeholder="np. pilka_nozna" />
                                  </div>

                                  <div className="md:col-span-4">
                                    <label className={labelClass}>Organizator</label>
                                    <select
                                      className={inputClass}
                                      value={(editForm.organizer_id as string) || ""}
                                      onChange={(e) => {
                                        const org = organizers.find((o) => o.id === e.target.value);
                                        updateField("organizer_id", e.target.value || null);
                                        updateField("organizer", org ? org.name : "");
                                      }}
                                    >
                                      <option value="">— brak —</option>
                                      {organizers.map((o) => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className={labelClass}>Likes</label>
                                    <input type="number" min={0} className={inputClass} value={(editForm.likes as number) ?? 0} onChange={(e) => updateField("likes", Number(e.target.value) || 0)} />
                                  </div>
                                  <div>
                                    <label className={labelClass}>Dislikes</label>
                                    <input type="number" min={0} className={inputClass} value={(editForm.dislikes as number) ?? 0} onChange={(e) => updateField("dislikes", Number(e.target.value) || 0)} />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                  <div className="rounded-lg border border-border/50 p-3 space-y-2">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lokalizacja</p>
                                    <div>
                                      <label className={labelClass}>Ulica</label>
                                      <div className="relative">
                                        <input
                                          className={inputClass}
                                          value={(editForm.street as string) || ""}
                                          placeholder="np. ul. Skarbowa 2"
                                          onChange={(e) => { updateField("street", e.target.value); updateField("lat", null); updateField("lng", null); }}
                                          onBlur={geocodeAddress}
                                        />
                                        {geocoding && <Loader2 size={12} className="animate-spin text-muted absolute right-2 top-1/2 -translate-y-1/2" />}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className={labelClass}>Miasto</label>
                                        <input className={inputClass} value={(editForm.city as string) || "Kraków"} onChange={(e) => updateField("city", e.target.value)} />
                                      </div>
                                      <div>
                                        <label className={labelClass}>Dzielnica</label>
                                        <select className={inputClass} value={(editForm.district as string) || "Inne"} onChange={(e) => updateField("district", e.target.value)}>
                                          {DISTRICT_LIST.slice(1).map((d) => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className={labelClass}>Lat</label>
                                        <input readOnly className={cn(inputClass, "bg-accent/40 text-muted cursor-default")} value={typeof editForm.lat === "number" ? String(editForm.lat) : "—"} />
                                      </div>
                                      <div>
                                        <label className={labelClass}>Lng</label>
                                        <input readOnly className={cn(inputClass, "bg-accent/40 text-muted cursor-default")} value={typeof editForm.lng === "number" ? String(editForm.lng) : "—"} />
                                      </div>
                                    </div>
                                    {typeof editForm.lat === "number" && typeof editForm.lng === "number" && (
                                      <div className="rounded-lg overflow-hidden border border-border" style={{ height: 160 }}>
                                        <Suspense fallback={<div className="w-full h-full flex items-center justify-center bg-accent/20 text-[11px] text-muted">Ładowanie mapy...</div>}>
                                          <MiniMapLazy lat={editForm.lat as number} lng={editForm.lng as number} />
                                        </Suspense>
                                      </div>
                                    )}
                                  </div>

                                  <ImageSection
                                    imageUrl={camp.image_url}
                                    imageThumb={camp.image_thumb}
                                    pendingPreview={pendingPreview}
                                    onFileSelect={handleFileSelect}
                                    onClearPending={clearPendingFile}
                                    table="camps"
                                    itemId={camp.id}
                                    mainCategory={String(editForm.main_category || camp.main_category || "")}
                                    category={String(editForm.category || camp.category || "")}
                                    subcategory={String(editForm.subcategory || camp.subcategory || "")}
                                    onRandomPhoto={(url, thumb) => setCamps((prev) => prev.map((c) => c.id === camp.id ? { ...c, image_url: url, image_thumb: thumb } : c))}
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <button onClick={() => saveEdit(camp.id)} disabled={uploadingImage === camp.id} className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-foreground text-white rounded hover:bg-[#333] transition-colors disabled:opacity-50">
                                    {uploadingImage === camp.id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                                    {uploadingImage === camp.id ? "Wgrywanie..." : "Zapisz"}
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
                <p className="text-[11px] text-muted mt-0.5">Wklej tabelę z Excela, Google Sheets lub dane JSON/DataFrame</p>
              </div>
              <button onClick={() => { setPasteModal(false); setPasteText(""); setPasteHeaders([]); setPastePreview([]); }} className="p-1.5 rounded hover:bg-accent text-muted transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
              <textarea
                className="w-full h-40 px-3 py-2 rounded-lg border border-border text-[12px] font-mono bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); parsePastedData(e.target.value); }}
              />
              {pasteHeaders.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rozpoznane kolumny</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pasteHeaders.map((h) => {
                      const field = resolveField(h);
                      return (
                        <span key={h} className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", field ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                          {h}{field ? ` -> ${field}` : " (pominięta)"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {pastePreview.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Podgląd ({pastePreview.length} wierszy)</p>
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
                              <td key={h} className="px-2.5 py-1.5 text-foreground max-w-[220px] truncate">{row[h] || <span className="text-muted/40">—</span>}</td>
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
              <p className="text-[11px] text-muted">Kolonie zostaną dodane jako Draft.</p>
              <div className="flex items-center gap-2">
                {importing && <span className="text-[11px] text-muted">{importProgress.done}/{importProgress.total} — tworzenie + geokodowanie + zdjęcia...</span>}
                <button onClick={() => { setPasteModal(false); setPasteText(""); setPasteHeaders([]); setPastePreview([]); }} className="px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:text-foreground transition-colors">Anuluj</button>
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
