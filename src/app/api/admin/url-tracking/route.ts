import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type UrlSourceType = "miejsce" | "kolonie" | "wydarzenia" | "zajecia";

function isUrlSourceType(value: unknown): value is UrlSourceType {
  return value === "miejsce" || value === "kolonie" || value === "wydarzenia" || value === "zajecia";
}

function getDb() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceRoleKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY lub SUPABASE_SERVICE_ROLE");
    throw new Error(`Brak konfiguracji Supabase: ustaw ${missing.join(", ")}.`);
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

// GET /api/admin/url-tracking?typ=kolonie
export async function GET(req: NextRequest) {
  const typ = req.nextUrl.searchParams.get("typ");
  if (!isUrlSourceType(typ)) {
    return NextResponse.json({ error: "Invalid typ" }, { status: 400 });
  }

  const db = getDb();
  const { data, error } = await db
    .from("url_tracking")
    .select("id, url, typ, is_done, last_checked_at, created_at, updated_at")
    .eq("typ", typ)
    .order("is_done", { ascending: true })
    .order("last_checked_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(Array.isArray(data) ? data : []);
}

// POST /api/admin/url-tracking
// Body: { typ, rows: [{ url, isDone, lastCheckedAt? }] }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    typ?: unknown;
    rows?: Array<{ url?: unknown; isDone?: unknown; lastCheckedAt?: unknown }>;
  } | null;

  const typ = body?.typ;
  if (!isUrlSourceType(typ)) {
    return NextResponse.json({ error: "Invalid typ" }, { status: 400 });
  }

  const rows = Array.isArray(body?.rows) ? body.rows : [];
  const sanitized = rows
    .map((row) => {
      const url = typeof row.url === "string" ? row.url.trim() : "";
      if (!url) return null;
      const isDone = Boolean(row.isDone);
      const providedLastCheckedAt = typeof row.lastCheckedAt === "string" && row.lastCheckedAt.trim().length > 0
        ? row.lastCheckedAt
        : null;

      return {
        url,
        typ,
        is_done: isDone,
        last_checked_at: isDone ? (providedLastCheckedAt ?? new Date().toISOString()) : providedLastCheckedAt,
      };
    })
    .filter((row): row is { url: string; typ: UrlSourceType; is_done: boolean; last_checked_at: string | null } => row !== null);

  const db = getDb();

  if (sanitized.length > 0) {
    const { error: upsertError } = await db
      .from("url_tracking")
      .upsert(sanitized, { onConflict: "url" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  const incomingUrlSet = new Set(sanitized.map((row) => row.url));
  const { data: existingRows, error: existingError } = await db
    .from("url_tracking")
    .select("url")
    .eq("typ", typ);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const urlsToDelete = (existingRows ?? [])
    .map((row) => String(row.url))
    .filter((url) => !incomingUrlSet.has(url));

  if (urlsToDelete.length > 0) {
    const { error: deleteError } = await db
      .from("url_tracking")
      .delete()
      .eq("typ", typ)
      .in("url", urlsToDelete);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  const { data, error } = await db
    .from("url_tracking")
    .select("id, url, typ, is_done, last_checked_at, created_at, updated_at")
    .eq("typ", typ)
    .order("is_done", { ascending: true })
    .order("last_checked_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(Array.isArray(data) ? data : []);
}

// PATCH /api/admin/url-tracking
// Body: { typ, url, isDone }
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null) as { typ?: unknown; url?: unknown; isDone?: unknown } | null;
  const typ = body?.typ;
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const isDone = Boolean(body?.isDone);

  if (!isUrlSourceType(typ) || !url) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getDb();
  const updatePayload: { is_done: boolean; last_checked_at?: string | null } = { is_done: isDone };
  if (isDone) {
    updatePayload.last_checked_at = new Date().toISOString();
  }

  const { data, error } = await db
    .from("url_tracking")
    .update(updatePayload)
    .eq("typ", typ)
    .eq("url", url)
    .select("id, url, typ, is_done, last_checked_at, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "URL not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// DELETE /api/admin/url-tracking?typ=kolonie&url=https://...
export async function DELETE(req: NextRequest) {
  const typ = req.nextUrl.searchParams.get("typ");
  const url = req.nextUrl.searchParams.get("url")?.trim() ?? "";

  if (!isUrlSourceType(typ) || !url) {
    return NextResponse.json({ error: "Invalid typ or url" }, { status: 400 });
  }

  const db = getDb();
  const { error } = await db
    .from("url_tracking")
    .delete()
    .eq("typ", typ)
    .eq("url", url);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
