import { createClient } from "@supabase/supabase-js";
import {
  normalizeAdminCategoryLevel1,
  normalizeAdminCategoryLevel2,
  normalizeAdminCategoryLevel3,
  normalizeAdminTypeLevel1,
  normalizeAdminTypeLevel2,
  type AdminTaxonomyResponse,
} from "@/lib/admin-taxonomy";

const EMPTY_TAXONOMY: AdminTaxonomyResponse = {
  type_lvl_1: [],
  type_lvl_2: [],
  category_lvl_1: [],
  category_lvl_2: [],
  category_lvl_3: [],
};

export async function loadAdminTaxonomy(): Promise<AdminTaxonomyResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return EMPTY_TAXONOMY;
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const [
    { data: typeLevel1Rows, error: typeLevel1Error },
    { data: typeLevel2Rows, error: typeLevel2Error },
    { data: categoryLevel1Rows, error: categoryLevel1Error },
    { data: categoryLevel2Rows, error: categoryLevel2Error },
    { data: categoryLevel3Rows, error: categoryLevel3Error },
  ] = await Promise.all([
    db.from("type_lvl_1").select("*"),
    db.from("type_lvl_2").select("*"),
    db.from("category_lvl_1").select("*"),
    db.from("category_lvl_2").select("*"),
    db.from("category_lvl_3").select("*"),
  ]);

  if (typeLevel1Error || typeLevel2Error || categoryLevel1Error || categoryLevel2Error || categoryLevel3Error) {
    return EMPTY_TAXONOMY;
  }

  return {
    type_lvl_1: (typeLevel1Rows ?? [])
      .map((row) => normalizeAdminTypeLevel1(row as Record<string, unknown>))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => left.name.localeCompare(right.name, "pl")),
    type_lvl_2: (typeLevel2Rows ?? [])
      .map((row) => normalizeAdminTypeLevel2(row as Record<string, unknown>))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => left.name.localeCompare(right.name, "pl")),
    category_lvl_1: (categoryLevel1Rows ?? [])
      .map((row) => normalizeAdminCategoryLevel1(row as Record<string, unknown>))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => left.name.localeCompare(right.name, "pl")),
    category_lvl_2: (categoryLevel2Rows ?? [])
      .map((row) => normalizeAdminCategoryLevel2(row as Record<string, unknown>))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => left.name.localeCompare(right.name, "pl")),
    category_lvl_3: (categoryLevel3Rows ?? [])
      .map((row) => normalizeAdminCategoryLevel3(row as Record<string, unknown>))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => left.name.localeCompare(right.name, "pl")),
  };
}