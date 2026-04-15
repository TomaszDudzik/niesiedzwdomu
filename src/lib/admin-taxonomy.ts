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

export function getCategoryLevel2ForCategoryLevel1(categoryLevel2: AdminCategoryLevel2[], categoryLevel1Id: string | null | undefined) {
  if (!categoryLevel1Id) return [];
  return categoryLevel2.filter((entry) => entry.category_lvl_1_id === categoryLevel1Id);
}

export function getCategoryLevel3ForCategoryLevel2(categoryLevel3: AdminCategoryLevel3[], categoryLevel2Id: string | null | undefined) {
  if (!categoryLevel2Id) return [];
  return categoryLevel3.filter((entry) => entry.category_lvl_2_id === categoryLevel2Id);
}