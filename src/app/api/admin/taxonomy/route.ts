import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeAdminCategoryLevel1,
  normalizeAdminCategoryLevel2,
  normalizeAdminCategoryLevel3,
  normalizeAdminTypeLevel1,
  normalizeAdminTypeLevel2,
} from "@/lib/admin-taxonomy";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET() {
  const db = getDb();

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

  if (typeLevel1Error) {
    return NextResponse.json({ error: typeLevel1Error.message }, { status: 500 });
  }

  if (typeLevel2Error) {
    return NextResponse.json({ error: typeLevel2Error.message }, { status: 500 });
  }

  if (categoryLevel1Error) {
    return NextResponse.json({ error: categoryLevel1Error.message }, { status: 500 });
  }

  if (categoryLevel2Error) {
    return NextResponse.json({ error: categoryLevel2Error.message }, { status: 500 });
  }

  if (categoryLevel3Error) {
    return NextResponse.json({ error: categoryLevel3Error.message }, { status: 500 });
  }

  const type_lvl_1 = (typeLevel1Rows ?? [])
    .map((row) => normalizeAdminTypeLevel1(row as Record<string, unknown>))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((left, right) => left.name.localeCompare(right.name, "pl"));

  const type_lvl_2 = (typeLevel2Rows ?? [])
    .map((row) => normalizeAdminTypeLevel2(row as Record<string, unknown>))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((left, right) => left.name.localeCompare(right.name, "pl"));

  const category_lvl_1 = (categoryLevel1Rows ?? [])
    .map((row) => normalizeAdminCategoryLevel1(row as Record<string, unknown>))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((left, right) => left.name.localeCompare(right.name, "pl"));

  const category_lvl_2 = (categoryLevel2Rows ?? [])
    .map((row) => normalizeAdminCategoryLevel2(row as Record<string, unknown>))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((left, right) => left.name.localeCompare(right.name, "pl"));

  const category_lvl_3 = (categoryLevel3Rows ?? [])
    .map((row) => normalizeAdminCategoryLevel3(row as Record<string, unknown>))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((left, right) => left.name.localeCompare(right.name, "pl"));

  return NextResponse.json({ type_lvl_1, type_lvl_2, category_lvl_1, category_lvl_2, category_lvl_3 });
}