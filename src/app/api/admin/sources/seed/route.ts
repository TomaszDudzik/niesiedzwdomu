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
    fetch_method: "requests",
    is_active: true,
    pre_filtered: true,
    listing_urls: [
      "https://nck.krakow.pl/wydarzenia/filtruj/wydarzenia-0-0-0-62-0-0/",
    ],
    pagination: "path",
    max_pages: 5,
    page_pattern:
      "https://nck.krakow.pl/wydarzenia/filtruj/wydarzenia-0-0-0-62-0-0/page/{page}/",
    events_mode: "inline",
    link_selector: "a",
    default_venue_name: "Nowohuckie Centrum Kultury",
    default_venue_address: "al. Jana Pawła II 232, 31-913 Kraków",
    default_district: "Nowa Huta",
    default_organizer: "Nowohuckie Centrum Kultury",
    default_is_free: true,
    notes:
      "Events listed inline on listing pages. Pagination via /page/2/, /page/3/ etc.",
  },
  {
    name: "Kraków dla dzieci",
    base_url: "https://krakowdladzieci.pl",
    fetch_method: "requests",
    is_active: false,
    pre_filtered: true,
    listing_urls: ["https://krakowdladzieci.pl/wydarzenia"],
    pagination: "query",
    max_pages: 5,
    page_pattern: "https://krakowdladzieci.pl/wydarzenia?page={page}",
    events_mode: "links",
    link_selector: "a.event-card",
    notes: "All events are kids-focused. Follow links for full detail.",
  },
  {
    name: "Karnet Kraków Culture",
    base_url: "https://karnet.krakowculture.pl",
    fetch_method: "requests",
    is_active: false,
    pre_filtered: false,
    listing_urls: ["https://karnet.krakowculture.pl/"],
    pagination: "none",
    max_pages: 5,
    events_mode: "inline",
    notes: "Main page has event summaries inline.",
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

    const { error } = await db.from("scrape_sources").insert({
      ...src,
      extractor_type: "llm",
      scrape_config: {},
    });

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
