import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function resolveTargets(contentType: string) {
  const table = contentType === "event" ? "events" : contentType === "place" ? "places" : contentType === "camp" ? "camps" : null;
  const fkColumn = contentType === "event" ? "event_id" : contentType === "place" ? "place_id" : contentType === "camp" ? "camp_id" : null;
  return { table, fkColumn };
}

async function findExistingVote(
  db: ReturnType<typeof getDb>,
  contentType: string,
  itemId: string,
  sessionId: string,
  fkColumn: string
) {
  const byFk = await db
    .from("feedback")
    .select("id, is_positive")
    .eq(fkColumn, itemId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!byFk.error) return byFk;

  // Fallback for legacy schema: content_type + item_id
  const byItemId = await db
    .from("feedback")
    .select("id, is_positive")
    .eq("content_type", contentType)
    .eq("item_id", itemId)
    .eq("session_id", sessionId)
    .maybeSingle();

  return byItemId;
}

async function insertVote(
  db: ReturnType<typeof getDb>,
  contentType: string,
  itemId: string,
  isPositive: boolean,
  sessionId: string,
  fkColumn: string
) {
  const fkInsert = await db.from("feedback").insert({
    content_type: contentType,
    [fkColumn]: itemId,
    is_positive: isPositive,
    session_id: sessionId,
  });

  if (!fkInsert.error) return fkInsert;

  // Fallback for legacy schema: content_type + item_id
  return db.from("feedback").insert({
    content_type: contentType,
    item_id: itemId,
    is_positive: isPositive,
    session_id: sessionId,
  });
}

// POST /api/feedback — submit or change a vote
export async function POST(request: NextRequest) {
  const db = getDb();
  const { content_type, item_id, is_positive, session_id } = await request.json();

  if (!content_type || !item_id || typeof is_positive !== "boolean" || !session_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { table, fkColumn } = resolveTargets(content_type);

  if (!table || !fkColumn) {
    return NextResponse.json({ error: "Invalid content_type" }, { status: 400 });
  }

  // Read current counts + existing vote in parallel
  const [{ data: existing, error: existingError }, { data: current }] = await Promise.all([
    findExistingVote(db, content_type, item_id, session_id, fkColumn),
    db.from(table).select("likes, dislikes").eq("id", item_id).single(),
  ]);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  // Compute new counts locally — avoids stale re-read after write
  let likes: number = current?.likes ?? 0;
  let dislikes: number = current?.dislikes ?? 0;
  let removed = false;

  if (existing) {
    if (existing.is_positive === is_positive) {
      // Toggle off same vote
      await db.from("feedback").delete().eq("id", existing.id);
      if (is_positive) likes = Math.max(0, likes - 1);
      else dislikes = Math.max(0, dislikes - 1);
      removed = true;
    } else {
      // Change vote: remove old, add new
      await db.from("feedback").delete().eq("id", existing.id);
      if (existing.is_positive) likes = Math.max(0, likes - 1);
      else dislikes = Math.max(0, dislikes - 1);
    }
  }

  if (!removed) {
    const { error: insertError } = await insertVote(db, content_type, item_id, is_positive, session_id, fkColumn);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    if (is_positive) likes += 1;
    else dislikes += 1;
  }

  // Single write with computed values — no second read needed
  await db.from(table).update({ likes, dislikes }).eq("id", item_id);

  revalidatePath("/");
  revalidatePath(content_type === "event" ? "/wydarzenia" : content_type === "place" ? "/miejsca" : "/kolonie");

  return NextResponse.json({
    ok: true,
    changed: true,
    removed,
    likes,
    dislikes,
  });
}

// GET /api/feedback?content_type=event&item_id=xxx&session_id=yyy — check existing vote
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const content_type = searchParams.get("content_type");
  const item_id = searchParams.get("item_id");
  const session_id = searchParams.get("session_id");

  if (!content_type || !item_id || !session_id) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const { fkColumn } = resolveTargets(content_type);
  if (!fkColumn) {
    return NextResponse.json({ error: "Invalid content_type" }, { status: 400 });
  }

  const byFk = await db
    .from("feedback")
    .select("is_positive")
    .eq(fkColumn, item_id)
    .eq("session_id", session_id)
    .maybeSingle();

  let data = byFk.data;
  if (byFk.error) {
    const byItemId = await db
      .from("feedback")
      .select("is_positive")
      .eq("content_type", content_type)
      .eq("item_id", item_id)
      .eq("session_id", session_id)
      .maybeSingle();

    if (byItemId.error) {
      return NextResponse.json({ error: byItemId.error.message }, { status: 500 });
    }
    data = byItemId.data;
  }

  return NextResponse.json({
    vote: data ? (data.is_positive ? "up" : "down") : null,
  });
}
