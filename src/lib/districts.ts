import type { District } from "@/types/database";
import { DISTRICT_LIST } from "@/lib/mock-data";

const DISTRICT_ALIASES: Record<string, District> = {
  "stare miasto": "Stare Miasto",
  grzegorzki: "Grzegórzki",
  "pradnik czerwony": "Prądnik Czerwony",
  "pradnik bialy": "Prądnik Biały",
  krowodrza: "Krowodrza",
  bronowice: "Bronowice",
  zwierzyniec: "Zwierzyniec",
  debniki: "Dębniki",
  "lagiewniki borek falecki": "Łagiewniki-Borek Fałęcki",
  swoszowice: "Swoszowice",
  podgorze: "Podgórze",
  "biezanow prokocim": "Bieżanów-Prokocim",
  czyzyny: "Czyżyny",
  mistrzejowice: "Mistrzejowice",
  "wzgorza krzeslawickie": "Wzgórza Krzesławickie",
  "nowa huta": "Nowa Huta",
  kazimierz: "Kazimierz",
  inne: "Inne",
  "bronowice wielkie": "Bronowice",
  "bronowice male": "Bronowice",
  "podgorze duchackie": "Podgórze",
  biezanow: "Bieżanów-Prokocim",
  prokocim: "Bieżanów-Prokocim",
  lagiewniki: "Łagiewniki-Borek Fałęcki",
  "borek falecki": "Łagiewniki-Borek Fałęcki",
  bienczyce: "Nowa Huta",
  dabie: "Grzegórzki",
  olsza: "Prądnik Czerwony",
  pradnik: "Prądnik Biały",
  salwator: "Zwierzyniec",
  "wola justowska": "Zwierzyniec",
  ruczaj: "Dębniki",
  zablocie: "Podgórze",
  plaszow: "Podgórze",
};

function normalizeDistrictKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DISTRICT_KEYS = DISTRICT_LIST.map((district) => ({
  district,
  key: normalizeDistrictKey(district),
})).sort((left, right) => right.key.length - left.key.length);

const DISTRICT_ALIAS_KEYS = Object.entries(DISTRICT_ALIASES)
  .map(([alias, district]) => ({ alias: normalizeDistrictKey(alias), district }))
  .sort((left, right) => right.alias.length - left.alias.length);

export function normalizeDistrictName(value: unknown, fallback: District = "Inne"): District {
  if (typeof value !== "string") return fallback;

  const key = normalizeDistrictKey(value);
  if (!key) return fallback;

  const directDistrict = DISTRICT_KEYS.find((entry) => entry.key === key)?.district;
  if (directDistrict) return directDistrict;

  return DISTRICT_ALIASES[key] ?? fallback;
}

export function detectDistrictFromText(value: unknown, fallback: District = "Inne"): District {
  if (typeof value !== "string") return fallback;

  const directMatch = normalizeDistrictName(value, fallback);
  if (directMatch !== fallback || normalizeDistrictKey(value) === normalizeDistrictKey(fallback)) {
    return directMatch;
  }

  const normalizedText = normalizeDistrictKey(value);
  if (!normalizedText) return fallback;

  const districtHit = DISTRICT_KEYS.find((entry) => normalizedText.includes(entry.key));
  if (districtHit) return districtHit.district;

  const aliasHit = DISTRICT_ALIAS_KEYS.find((entry) => normalizedText.includes(entry.alias));
  return aliasHit?.district ?? fallback;
}