import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * Seed sources from the original YAML config into the database.
 * Skips sources that already exist (by name).
 * POST /api/admin/sources/seed
 */

const YAML_SOURCES = [
  {
    name: "Nowohuckie Centrum Kultury",
    base_url: "https://nck.krakow.pl/wydarzenia/filtruj/wydarzenia-0-0-0-62-0-0/",
    extractor_type: "generic",
    is_active: true,
    listing_urls: [
      "https://nck.krakow.pl/wydarzenia/filtruj/wydarzenia-0-0-0-62-0-0/",
    ],
    default_venue_name: "Nowohuckie Centrum Kultury",
    default_venue_address: "al. Jana Pawła II 232, 31-913 Kraków",
    default_district: "Nowa Huta",
    default_organizer: "Nowohuckie Centrum Kultury",
    default_is_free: true,
  },
  {
    name: "biletyna",
    base_url: "https://biletyna.pl",
    extractor_type: "biletyna",
    is_active: true,
    listing_urls: ["https://biletyna.pl/dla-dzieci/Krakow?city_id=16#list"],
  },
  {
    name: "ck_podgorza",
    base_url: "https://www.ckpodgorza.pl",
    extractor_type: "ck_podgorza",
    is_active: true,
    listing_urls: ["https://www.ckpodgorza.pl/oferta/wydarzenia"],
  },
];

export async function POST() {
  const db = getDb();
  const created: string[] = [];
  const skipped: string[] = [];

  for (const src of YAML_SOURCES) {
    // Check if already exists
    const { data: existing } = await db
      .from("scrape_sources")
      .select("id")
      .eq("name", src.name)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped.push(src.name);
      continue;
    }

    const { error } = await db.from("scrape_sources").insert(src);

    if (error) {
      return NextResponse.json(
        { error: `Failed to insert "${src.name}": ${error.message}` },
        { status: 500 },
      );
    }
    created.push(src.name);
  }

  return NextResponse.json({ created, skipped });
}
