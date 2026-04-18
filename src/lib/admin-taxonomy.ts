export interface AdminTypeLevel1 {
  id: string;
  name: string;
  slug: string | null;
}

export interface AdminTypeLevel2 {
  id: string;
  type_lvl_1_id: string | null;
  name: string;
  slug: string | null;
}

export interface AdminCategoryLevel1 {
  id: string;
  name: string;
  slug: string | null;
}

export interface AdminCategoryLevel2 {
  id: string;
  category_lvl_1_id: string | null;
  name: string;
  slug: string | null;
}

export interface AdminCategoryLevel3 {
  id: string;
  category_lvl_2_id: string | null;
  name: string;
  slug: string | null;
}

export interface AdminTaxonomyResponse {
  type_lvl_1: AdminTypeLevel1[];
  type_lvl_2: AdminTypeLevel2[];
  category_lvl_1: AdminCategoryLevel1[];
  category_lvl_2: AdminCategoryLevel2[];
  category_lvl_3: AdminCategoryLevel3[];
}

export const PUBLIC_SUBMISSION_TAXONOMY_FALLBACK: AdminTaxonomyResponse = {
  type_lvl_1: [
    { id: "dzieci", name: "Dzieci", slug: "dzieci" },
    { id: "sportowcy", name: "Sportowcy", slug: "sportowcy" },
  ],
  type_lvl_2: [
    { id: "kolonie", type_lvl_1_id: null, name: "Kolonie", slug: "kolonie" },
    { id: "kursy", type_lvl_1_id: null, name: "Kursy", slug: "kursy" },
    { id: "miejsca", type_lvl_1_id: null, name: "Miejsca", slug: "miejsca" },
    { id: "obozy", type_lvl_1_id: null, name: "Obozy", slug: "obozy" },
    { id: "polkolonie", type_lvl_1_id: null, name: "Półkolonie", slug: "polkolonie" },
    { id: "warsztaty", type_lvl_1_id: null, name: "Warsztaty", slug: "warsztaty" },
    { id: "warsztaty-wakacyjne", type_lvl_1_id: null, name: "Warsztaty wakacyjne", slug: "warsztaty_wakacyjne" },
    { id: "wydarzenia", type_lvl_1_id: null, name: "Wydarzenia", slug: "wydarzenia" },
    { id: "wyjazdy-weekendowe", type_lvl_1_id: null, name: "Wyjazdy weekendowe", slug: "wyjazdy-weekendowe" },
    { id: "zajecia", type_lvl_1_id: null, name: "Zajęcia", slug: "zajecia" },
  ],
  category_lvl_1: [
    { id: "edukacja", name: "Edukacja", slug: "edukacja" },
    { id: "integracja", name: "Integracja", slug: "integracja" },
    { id: "kreatywnosc", name: "Kreatywność", slug: "kreatywnosc" },
    { id: "kulinaria", name: "Kulinaria", slug: "kulinaria" },
    { id: "kultura", name: "Kultura", slug: "kultura" },
    { id: "nauka", name: "Nauka", slug: "nauka" },
    { id: "plac-zabaw", name: "Plac Zabaw", slug: "plac_zabaw" },
    { id: "przygoda", name: "Przygoda", slug: "przygoda" },
    { id: "przyroda", name: "Przyroda", slug: "przyroda" },
    { id: "relaks", name: "Relaks", slug: "relaks" },
    { id: "sala-zabaw", name: "Sala Zabaw", slug: "sala_zabaw" },
    { id: "sport", name: "Sport", slug: "sport" },
    { id: "technologia", name: "Technologia", slug: "technologia" },
  ],
  category_lvl_2: [
    { id: "czytanie-i-pisanie", category_lvl_1_id: "edukacja", name: "Czytanie i pisanie", slug: "czytanie-i-pisanie" },
    { id: "ekologia", category_lvl_1_id: "przyroda", name: "Ekologia", slug: "ekologia" },
    { id: "film-i-fotografia", category_lvl_1_id: "kultura", name: "Film i fotografia", slug: "film-i-fotografia" },
    { id: "gaming-i-e-sport", category_lvl_1_id: "technologia", name: "Gaming i e-sport", slug: "gaming-i-e-sport" },
    { id: "gimnastyka-i-akrobatyka", category_lvl_1_id: "sport", name: "Gimnastyka i akrobatyka", slug: "gimnastyka-i-akrobatyka" },
    { id: "gokarty", category_lvl_1_id: "sport", name: "Gokarty", slug: "gokarty" },
    { id: "gotowanie", category_lvl_1_id: "kulinaria", name: "Gotowanie", slug: "gotowanie" },
    { id: "gory-i-trekking", category_lvl_1_id: "przygoda", name: "Góry i trekking", slug: "gory-i-trekking" },
    { id: "gry-i-zabawy-grupowe", category_lvl_1_id: "integracja", name: "Gry i zabawy grupowe", slug: "gry-i-zabawy-grupowe" },
    { id: "jazda-konna", category_lvl_1_id: "sport", name: "Jazda konna", slug: "jazda-konna" },
    { id: "jezyki-obce", category_lvl_1_id: "edukacja", name: "Języki obce", slug: "jezyki-obce" },
    { id: "kompetencje-miekkie", category_lvl_1_id: "integracja", name: "Kompetencje miękkie", slug: "kompetencje-miekkie" },
    { id: "lego", category_lvl_1_id: "kreatywnosc", name: "Lego", slug: "lego" },
    { id: "lesna-edukacja", category_lvl_1_id: "przyroda", name: "Leśna edukacja", slug: "lesna-edukacja" },
    { id: "matematyka-i-logika", category_lvl_1_id: "edukacja", name: "Matematyka i logika", slug: "matematyka-i-logika" },
    { id: "muzyka", category_lvl_1_id: "kultura", name: "Muzyka", slug: "muzyka" },
    { id: "nauka-i-eksperymenty", category_lvl_1_id: "edukacja", name: "Nauka i eksperymenty", slug: "nauka-i-eksperymenty" },
    { id: "nowe-technologie", category_lvl_1_id: "technologia", name: "Nowe technologie", slug: "nowe-technologie" },
    { id: "ogolnosportowe", category_lvl_1_id: "sport", name: "Ogólnosportowe", slug: "ogolnosportowe" },
    { id: "outdoor-i-aktywnosci-terenowe", category_lvl_1_id: "przygoda", name: "Outdoor i aktywności terenowe", slug: "outdoor-i-aktywnosci-terenowe" },
    { id: "park-linowy", category_lvl_1_id: "sport", name: "Park Linowy", slug: "park-linowy" },
    { id: "pieczenie-i-cukiernictwo", category_lvl_1_id: "kulinaria", name: "Pieczenie i cukiernictwo", slug: "pieczenie-i-cukiernictwo" },
    { id: "pilka-nozna", category_lvl_1_id: "sport", name: "Piłka nożna", slug: "pilka-nozna" },
    { id: "plywanie", category_lvl_1_id: "sport", name: "Pływanie", slug: "plywanie" },
    { id: "programowanie-i-robotyka", category_lvl_1_id: "edukacja", name: "Programowanie i robotyka", slug: "programowanie-i-robotyka" },
    { id: "rosliny-i-ogrodnictwo", category_lvl_1_id: "przyroda", name: "Rośliny i ogrodnictwo", slug: "rosliny-i-ogrodnictwo" },
    { id: "rowery-i-rolki", category_lvl_1_id: "sport", name: "Rowery i rolki", slug: "rowery-i-rolki" },
    { id: "rozwoj-osobisty", category_lvl_1_id: "edukacja", name: "Rozwój osobisty", slug: "rozwoj-osobisty" },
    { id: "spacer", category_lvl_1_id: "relaks", name: "Spacer", slug: "spacer" },
    { id: "sporty-walki", category_lvl_1_id: "sport", name: "Sporty walki", slug: "sporty-walki" },
    { id: "sporty-zimowe", category_lvl_1_id: "sport", name: "Sporty zimowe", slug: "sporty-zimowe" },
    { id: "survival-i-bushcraft", category_lvl_1_id: "przygoda", name: "Survival i bushcraft", slug: "survival-i-bushcraft" },
    { id: "sztuka-i-rekodzielo", category_lvl_1_id: "kultura", name: "Sztuka i rękodzieło", slug: "sztuka-i-rekodzielo" },
    { id: "taniec", category_lvl_1_id: "sport", name: "Taniec", slug: "taniec" },
    { id: "taniec-sceniczny", category_lvl_1_id: "kultura", name: "Taniec sceniczny", slug: "taniec-sceniczny" },
    { id: "teatr", category_lvl_1_id: "kultura", name: "Teatr", slug: "teatr" },
    { id: "tenis-i-sporty-rakietowe", category_lvl_1_id: "sport", name: "Tenis i sporty rakietowe", slug: "tenis-i-sporty-rakietowe" },
    { id: "tworzenie-cyfrowe", category_lvl_1_id: "technologia", name: "Tworzenie cyfrowe", slug: "tworzenie-cyfrowe" },
    { id: "wodne-przygody", category_lvl_1_id: "przygoda", name: "Wodne przygody", slug: "wodne-przygody" },
    { id: "zajecia-spoleczne", category_lvl_1_id: "integracja", name: "Zajęcia społeczne", slug: "zajecia-spoleczne" },
    { id: "zdrowe-odzywianie", category_lvl_1_id: "kulinaria", name: "Zdrowe odżywianie", slug: "zdrowe-odzywianie" },
    { id: "zwierzeta", category_lvl_1_id: "przyroda", name: "Zwierzęta", slug: "zwierzeta" },
  ],
  category_lvl_3: [],
};

function hasEntries<T>(entries: T[]) {
  return Array.isArray(entries) && entries.length > 0;
}

export function withPublicSubmissionTaxonomyFallback(taxonomy: AdminTaxonomyResponse): AdminTaxonomyResponse {
  return {
    type_lvl_1: hasEntries(taxonomy.type_lvl_1) ? taxonomy.type_lvl_1 : PUBLIC_SUBMISSION_TAXONOMY_FALLBACK.type_lvl_1,
    type_lvl_2: hasEntries(taxonomy.type_lvl_2) ? taxonomy.type_lvl_2 : PUBLIC_SUBMISSION_TAXONOMY_FALLBACK.type_lvl_2,
    category_lvl_1: hasEntries(taxonomy.category_lvl_1) ? taxonomy.category_lvl_1 : PUBLIC_SUBMISSION_TAXONOMY_FALLBACK.category_lvl_1,
    category_lvl_2: hasEntries(taxonomy.category_lvl_2) ? taxonomy.category_lvl_2 : PUBLIC_SUBMISSION_TAXONOMY_FALLBACK.category_lvl_2,
    category_lvl_3: hasEntries(taxonomy.category_lvl_3) ? taxonomy.category_lvl_3 : PUBLIC_SUBMISSION_TAXONOMY_FALLBACK.category_lvl_3,
  };
}

type RawRecord = Record<string, unknown>;

function pickString(record: RawRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

export function normalizeAdminTypeLevel1(record: RawRecord): AdminTypeLevel1 | null {
  const id = pickString(record, ["id"]);
  if (!id) return null;

  return {
    id,
    name: pickString(record, ["name", "label", "title", "slug"]) ?? id,
    slug: pickString(record, ["slug"]),
  };
}

export function normalizeAdminTypeLevel2(record: RawRecord): AdminTypeLevel2 | null {
  const id = pickString(record, ["id"]);
  if (!id) return null;

  return {
    id,
    type_lvl_1_id: pickString(record, ["type_lvl_1_id", "type_id", "parent_type_id"]),
    name: pickString(record, ["name", "label", "title", "slug"]) ?? id,
    slug: pickString(record, ["slug"]),
  };
}

export function normalizeAdminCategoryLevel1(record: RawRecord): AdminCategoryLevel1 | null {
  const id = pickString(record, ["id"]);
  if (!id) return null;

  return {
    id,
    name: pickString(record, ["name", "label", "title", "slug"]) ?? id,
    slug: pickString(record, ["slug"]),
  };
}

export function normalizeAdminCategoryLevel2(record: RawRecord): AdminCategoryLevel2 | null {
  const id = pickString(record, ["id"]);
  if (!id) return null;

  return {
    id,
    category_lvl_1_id: pickString(record, ["category_lvl_1_id", "main_category_id", "parent_category_id"]),
    name: pickString(record, ["name", "label", "title", "slug"]) ?? id,
    slug: pickString(record, ["slug"]),
  };
}

export function normalizeAdminCategoryLevel3(record: RawRecord): AdminCategoryLevel3 | null {
  const id = pickString(record, ["id"]);
  if (!id) return null;

  return {
    id,
    category_lvl_2_id: pickString(record, ["category_lvl_2_id", "category_id", "parent_category_id"]),
    name: pickString(record, ["name", "label", "title", "slug"]) ?? id,
    slug: pickString(record, ["slug"]),
  };
}

export function getTypeLevel2ForTypeLevel1(typeLevel2: AdminTypeLevel2[], typeLevel1Id: string | null | undefined) {
  if (!typeLevel1Id) return [];

  const linkedEntries = typeLevel2.filter((entry) => entry.type_lvl_1_id === typeLevel1Id);
  if (linkedEntries.length > 0) {
    return linkedEntries;
  }

  const hasAnyParentLink = typeLevel2.some((entry) => Boolean(entry.type_lvl_1_id));
  return hasAnyParentLink ? [] : typeLevel2;
}

function normalizeTaxonomyLookupValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function resolveTypeLevel1Id(
  typeLevel1: AdminTypeLevel1[],
  value: string | null | undefined,
) {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const lookup = normalizeTaxonomyLookupValue(normalized);
  const matched = typeLevel1.find((entry) => {
    return entry.id === normalized
      || normalizeTaxonomyLookupValue(entry.id) === lookup
      || normalizeTaxonomyLookupValue(entry.name) === lookup
      || (entry.slug ? normalizeTaxonomyLookupValue(entry.slug) === lookup : false);
  });

  return matched?.id ?? normalized;
}

export function resolveTypeLevel2Id(
  typeLevel2: AdminTypeLevel2[],
  value: string | null | undefined,
  typeLevel1Id?: string | null,
) {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const lookup = normalizeTaxonomyLookupValue(normalized);
  const scopedEntries = typeLevel1Id
    ? getTypeLevel2ForTypeLevel1(typeLevel2, typeLevel1Id)
    : typeLevel2;
  const searchPool = scopedEntries.length > 0 ? scopedEntries : typeLevel2;
  const matched = searchPool.find((entry) => {
    return entry.id === normalized
      || normalizeTaxonomyLookupValue(entry.id) === lookup
      || normalizeTaxonomyLookupValue(entry.name) === lookup
      || (entry.slug ? normalizeTaxonomyLookupValue(entry.slug) === lookup : false);
  });

  return matched?.id ?? normalized;
}

export function resolveCategoryLevel1Name(
  categoryLevel1: AdminCategoryLevel1[],
  value: string | null | undefined,
) {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const lookup = normalizeTaxonomyLookupValue(normalized);
  const matched = categoryLevel1.find((entry) => {
    return entry.id === normalized
      || normalizeTaxonomyLookupValue(entry.id) === lookup
      || normalizeTaxonomyLookupValue(entry.name) === lookup
      || (entry.slug ? normalizeTaxonomyLookupValue(entry.slug) === lookup : false);
  });

  return matched?.name ?? normalized;
}

export function resolveCategoryLevel2Name(
  categoryLevel2: AdminCategoryLevel2[],
  value: string | null | undefined,
  categoryLevel1Name?: string | null,
  categoryLevel1Options?: AdminCategoryLevel1[],
) {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const lookup = normalizeTaxonomyLookupValue(normalized);
  const categoryLevel1Id = categoryLevel1Name && categoryLevel1Options
    ? categoryLevel1Options.find((entry) => entry.name === categoryLevel1Name)?.id ?? null
    : null;
  const scopedEntries = categoryLevel1Id
    ? getCategoryLevel2ForCategoryLevel1(categoryLevel2, categoryLevel1Id)
    : categoryLevel2;
  const searchPool = scopedEntries.length > 0 ? scopedEntries : categoryLevel2;
  const matched = searchPool.find((entry) => {
    return entry.id === normalized
      || normalizeTaxonomyLookupValue(entry.id) === lookup
      || normalizeTaxonomyLookupValue(entry.name) === lookup
      || (entry.slug ? normalizeTaxonomyLookupValue(entry.slug) === lookup : false);
  });

  return matched?.name ?? normalized;
}

export function resolveCategoryLevel3Name(
  categoryLevel3: AdminCategoryLevel3[],
  value: string | null | undefined,
  categoryLevel2Name?: string | null,
  categoryLevel2Options?: AdminCategoryLevel2[],
) {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const lookup = normalizeTaxonomyLookupValue(normalized);
  const categoryLevel2Id = categoryLevel2Name && categoryLevel2Options
    ? categoryLevel2Options.find((entry) => entry.name === categoryLevel2Name)?.id ?? null
    : null;
  const scopedEntries = categoryLevel2Id
    ? getCategoryLevel3ForCategoryLevel2(categoryLevel3, categoryLevel2Id)
    : categoryLevel3;
  const searchPool = scopedEntries.length > 0 ? scopedEntries : categoryLevel3;
  const matched = searchPool.find((entry) => {
    return entry.id === normalized
      || normalizeTaxonomyLookupValue(entry.id) === lookup
      || normalizeTaxonomyLookupValue(entry.name) === lookup
      || (entry.slug ? normalizeTaxonomyLookupValue(entry.slug) === lookup : false);
  });

  return matched?.name ?? normalized;
}

export function getCategoryLevel2ForCategoryLevel1(categoryLevel2: AdminCategoryLevel2[], categoryLevel1Id: string | null | undefined) {
  if (!categoryLevel1Id) return [];
  return categoryLevel2.filter((entry) => entry.category_lvl_1_id === categoryLevel1Id);
}

export function getCategoryLevel3ForCategoryLevel2(categoryLevel3: AdminCategoryLevel3[], categoryLevel2Id: string | null | undefined) {
  if (!categoryLevel2Id) return [];
  return categoryLevel3.filter((entry) => entry.category_lvl_2_id === categoryLevel2Id);
}