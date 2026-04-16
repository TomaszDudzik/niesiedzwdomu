import type { SupabaseClient } from "@supabase/supabase-js";

type TaxonomyRecord = Record<string, unknown>;

export interface AdminCategoryMaps {
  categoryLevel1ById: Map<string, string>;
  categoryLevel2ById: Map<string, string>;
  categoryLevel3ById: Map<string, string>;
  categoryLevel1IdByName: Map<string, string>;
  categoryLevel2IdByName: Map<string, string>;
  categoryLevel3IdByName: Map<string, string>;
}

function pickString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function createEmptyCategoryMaps(): AdminCategoryMaps {
  return {
    categoryLevel1ById: new Map(),
    categoryLevel2ById: new Map(),
    categoryLevel3ById: new Map(),
    categoryLevel1IdByName: new Map(),
    categoryLevel2IdByName: new Map(),
    categoryLevel3IdByName: new Map(),
  };
}

function buildMaps(rows: TaxonomyRecord[] | null | undefined) {
  const byId = new Map<string, string>();
  const idByName = new Map<string, string>();

  for (const row of rows ?? []) {
    const id = pickString(row.id);
    const name = pickString(row.name);
    if (!id || !name) continue;
    byId.set(id, name);
    idByName.set(name, id);
  }

  return { byId, idByName };
}

export async function loadAdminCategoryMaps(db: SupabaseClient): Promise<AdminCategoryMaps> {
  const [level1Result, level2Result, level3Result] = await Promise.all([
    db.from("category_lvl_1").select("id, name"),
    db.from("category_lvl_2").select("id, name"),
    db.from("category_lvl_3").select("id, name"),
  ]);

  if (level1Result.error || level2Result.error || level3Result.error) {
    return createEmptyCategoryMaps();
  }

  const level1 = buildMaps((level1Result.data ?? []) as TaxonomyRecord[]);
  const level2 = buildMaps((level2Result.data ?? []) as TaxonomyRecord[]);
  const level3 = buildMaps((level3Result.data ?? []) as TaxonomyRecord[]);

  return {
    categoryLevel1ById: level1.byId,
    categoryLevel2ById: level2.byId,
    categoryLevel3ById: level3.byId,
    categoryLevel1IdByName: level1.idByName,
    categoryLevel2IdByName: level2.idByName,
    categoryLevel3IdByName: level3.idByName,
  };
}

export function withCategoryIds(input: Record<string, unknown>, maps: AdminCategoryMaps) {
  const payload = { ...input };

  const categoryLevel1Name = pickString(payload.category_lvl_1) ?? pickString(payload.main_category);
  const categoryLevel2Name = pickString(payload.category_lvl_2) ?? pickString(payload.category);
  const categoryLevel3Name = pickString(payload.category_lvl_3) ?? pickString(payload.subcategory);

  if ("category_lvl_1" in payload || "main_category" in payload || "category_lvl_1_id" in payload) {
    payload.category_lvl_1_id = pickString(payload.category_lvl_1_id) ?? (categoryLevel1Name ? maps.categoryLevel1IdByName.get(categoryLevel1Name) ?? null : null);
    payload.category_lvl_1 = categoryLevel1Name;
  }

  if ("category_lvl_2" in payload || "category" in payload || "category_lvl_2_id" in payload) {
    payload.category_lvl_2_id = pickString(payload.category_lvl_2_id) ?? (categoryLevel2Name ? maps.categoryLevel2IdByName.get(categoryLevel2Name) ?? null : null);
    payload.category_lvl_2 = categoryLevel2Name;
  }

  if ("category_lvl_3" in payload || "subcategory" in payload || "category_lvl_3_id" in payload) {
    payload.category_lvl_3_id = pickString(payload.category_lvl_3_id) ?? (categoryLevel3Name ? maps.categoryLevel3IdByName.get(categoryLevel3Name) ?? null : null);
    payload.category_lvl_3 = categoryLevel3Name;
  }

  return payload;
}

export function withCategoryNames(record: Record<string, unknown>, maps: AdminCategoryMaps) {
  const categoryLevel1Id = pickString(record.category_lvl_1_id);
  const categoryLevel2Id = pickString(record.category_lvl_2_id);
  const categoryLevel3Id = pickString(record.category_lvl_3_id);

  const categoryLevel1Name = pickString(record.category_lvl_1) ?? pickString(record.main_category) ?? (categoryLevel1Id ? maps.categoryLevel1ById.get(categoryLevel1Id) ?? null : null);
  const categoryLevel2Name = pickString(record.category_lvl_2) ?? pickString(record.category) ?? (categoryLevel2Id ? maps.categoryLevel2ById.get(categoryLevel2Id) ?? null : null);
  const categoryLevel3Name = pickString(record.category_lvl_3) ?? pickString(record.subcategory) ?? (categoryLevel3Id ? maps.categoryLevel3ById.get(categoryLevel3Id) ?? null : null);

  return {
    ...record,
    category_lvl_1_id: categoryLevel1Id,
    category_lvl_2_id: categoryLevel2Id,
    category_lvl_3_id: categoryLevel3Id,
    category_lvl_1: categoryLevel1Name,
    category_lvl_2: categoryLevel2Name,
    category_lvl_3: categoryLevel3Name,
    main_category: categoryLevel1Name,
    category: categoryLevel2Name,
    subcategory: categoryLevel3Name,
  };
}