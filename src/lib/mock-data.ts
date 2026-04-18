import type {
  EventCategory,
  CampMainCategory,
  CampCategory,
  CampSeason,
  PlaceType,
  ContentType,
  ActivityType,
} from "@/types/database";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  event: "Wydarzenie",
  camp: "Kolonie",
  place: "Miejsce",
  activity: "Zajęcia",
};

export const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  event: "🎪",
  camp: "⛺",
  place: "📍",
  activity: "🎯",
};

export const CONTENT_TYPE_COLORS: Record<ContentType, { bg: string; text: string; border: string }> = {
  event: { bg: "bg-[#FFF5F2]", text: "text-[#E8573A]", border: "border-[#FFE8E0]" },
  camp: { bg: "bg-blue-50", text: "text-[#2E7DBA]", border: "border-blue-200" },
  place: { bg: "bg-[#F2F7F2]", text: "text-[#4A7C59]", border: "border-[#DCE8DC]" },
  activity: { bg: "bg-purple-50", text: "text-[#7B5EA7]", border: "border-purple-200" },
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  warsztaty: "Warsztaty",
  spektakl: "Spektakle",
  muzyka: "Muzyka",
  sport: "Sport",
  natura: "Natura",
  edukacja: "Edukacja",
  festyn: "Festyny",
  kino: "Kino",
  wystawa: "Wystawy",
  inne: "Inne",
};

export const CATEGORY_ICONS: Record<EventCategory, string> = {
  warsztaty: "✂️",
  spektakl: "🎭",
  muzyka: "🎵",
  sport: "⚽",
  natura: "🌿",
  edukacja: "📚",
  festyn: "🎉",
  kino: "🎬",
  wystawa: "🖼️",
  inne: "✨",
};

export const CAMP_MAIN_CATEGORY_LABELS: Record<CampMainCategory, string> = {
  kolonie: "Kolonie",
  polkolonie: "Półkolonie",
  warsztaty_wakacyjne: "Warsztaty wakacyjne",
};

export const CAMP_CATEGORY_LABELS: Record<CampCategory, string> = {
  sportowe: "Sportowe",
  edukacyjne: "Edukacyjne",
  integracyjne: "Integracyjne",
  przygodowe: "Przygodowe",
  artystyczne: "Artystyczne",
  kulinarne: "Kulinarne",
  przyrodnicze: "Przyrodnicze",
};

export const CAMP_CATEGORY_ICONS: Record<CampCategory, string> = {
  sportowe: "⚽",
  edukacyjne: "📚",
  integracyjne: "🤝",
  przygodowe: "🏕️",
  artystyczne: "🎨",
  kulinarne: "🍳",
  przyrodnicze: "🌿",
};

export const CAMP_MAIN_CATEGORY_ICONS: Record<CampMainCategory, string> = {
  kolonie: "🏕️",
  polkolonie: "☀️",
  warsztaty_wakacyjne: "🎨",
};

export const CAMP_SEASON_LABELS: Record<CampSeason, string> = {
  lato: "Lato",
  zima: "Zima",
  ferie_zimowe: "Ferie zimowe",
  ferie_wiosenne: "Ferie wiosenne",
  caly_rok: "Cały rok",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  sportowe: "Sportowe",
  artystyczne: "Artystyczne",
  edukacyjne: "Edukacyjne",
  muzyczne: "Muzyczne",
  taneczne: "Taneczne",
  jezykowe: "Językowe",
  sensoryczne: "Sensoryczne",
  inne: "Inne",
};

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  sportowe: "⚽",
  artystyczne: "🎨",
  edukacyjne: "📚",
  muzyczne: "🎵",
  taneczne: "💃",
  jezykowe: "🗣️",
  sensoryczne: "🧩",
  inne: "✨",
};

export const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  "Relaks i natura": "Relaks",
  "Nauka przez zabawę": "Nauka",
  "Szybka rozrywka / atrakcje": "Rozrywka",
  "Ruch i aktywność fizyczna": "Ruch",
  "Oglądanie / kultura": "Kultura",
  "Kreatywność i warsztaty": "Kreatywność",
  "Sala zabaw": "Sala zabaw",
  "Plac zabaw": "Plac zabaw",
  inne: "Inne",
};

export const PLACE_TYPE_ICONS: Record<PlaceType, string> = {
  "Relaks i natura": "🌿",
  "Nauka przez zabawę": "🔬",
  "Szybka rozrywka / atrakcje": "🎢",
  "Ruch i aktywność fizyczna": "⚽",
  "Oglądanie / kultura": "🎭",
  "Kreatywność i warsztaty": "🎨",
  "Sala zabaw": "🧸",
  "Plac zabaw": "🛝",
  inne: "📍",
};

export const DISTRICT_LIST = [
  "Stare Miasto",
  "Grzegórzki",
  "Prądnik Czerwony",
  "Prądnik Biały",
  "Krowodrza",
  "Bronowice",
  "Zwierzyniec",
  "Dębniki",
  "Łagiewniki-Borek Fałęcki",
  "Swoszowice",
  "Podgórze",
  "Bieżanów-Prokocim",
  "Czyżyny",
  "Mistrzejowice",
  "Wzgórza Krzesławickie",
  "Nowa Huta",
  "Kazimierz",
  "Inne",
] as const;

export const AGE_GROUPS = [
  { label: "Niemowlęta (0-2)", min: 0, max: 2, value: "0-2" },
  { label: "Maluchy (3-5)", min: 3, max: 5, value: "3-5" },
  { label: "Dzieci (6-9)", min: 6, max: 9, value: "6-9" },
  { label: "Starsze (10+)", min: 10, max: 99, value: "10+" },
] as const;
