import type { SupabaseClient } from "@supabase/supabase-js";

// Category lookup tables have been replaced with plain-text columns.
// These helpers are retained for call-site compatibility but no longer
// query the database — they simply pass values through unchanged.

export interface AdminCategoryMaps {
  categoryLevel1ById: Map<string, string>;
  categoryLevel2ById: Map<string, string>;
  categoryLevel3ById: Map<string, string>;
  categoryLevel1IdByName: Map<string, string>;
  categoryLevel2IdByName: Map<string, string>;
  categoryLevel3IdByName: Map<string, string>;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function loadAdminCategoryMaps(_db: SupabaseClient): Promise<AdminCategoryMaps> {
  return createEmptyCategoryMaps();
}

export function withCategoryIds(input: Record<string, unknown>, _maps: AdminCategoryMaps) {
  const payload = { ...input };
  delete payload.category_lvl_1_id;
  delete payload.category_lvl_2_id;
  delete payload.category_lvl_3_id;
  return payload;
}

export function withCategoryNames(record: Record<string, unknown>, _maps: AdminCategoryMaps) {
  return {
    ...record,
    category_lvl_1: record.category_lvl_1 ?? record.main_category ?? null,
    category_lvl_2: record.category_lvl_2 ?? record.category ?? null,
    category_lvl_3: record.category_lvl_3 ?? record.subcategory ?? null,
    main_category: record.category_lvl_1 ?? record.main_category ?? null,
    category: record.category_lvl_2 ?? record.category ?? null,
    subcategory: record.category_lvl_3 ?? record.subcategory ?? null,
  };
}
