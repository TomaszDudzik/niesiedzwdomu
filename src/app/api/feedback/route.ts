import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function adjustCount(db: ReturnType<typeof getDb>, table: string, id: string, field: "likes" | "dislikes", delta: number) {
  // Fetch current value, then update
  const { data } = await db.from(table).select(field).eq("id", id).single();
  if (data) {
    const current = (data as Record<string, number>)[field] || 0;
    await db.from(table).update({ [field]: Math.max(0, current + delta) }).eq("id", id);
  }
}

// POST /api/feedback — submit or change a vote
export async function POST(request: NextRequest) {
  const db = getDb();
  const { content_type, item_id, is_positive, session_id } = await request.json();

  if (!content_type || !item_id || typeof is_positive !== "boolean" || !session_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const table = content_type === "event" ? "events" : content_type === "place" ? "places" : content_type === "camp" ? "camps" : null;
  const fkColumn = content_type === "event" ? "event_id" : content_type === "place" ? "place_id" : content_type === "camp" ? "camp_id" : null;

  if (!table || !fkColumn) {
    return NextResponse.json({ error: "Invalid content_type" }, { status: 400 });
  }

  // Check if this session already voted on this item
  const { data: existing } = await db
    .from("feedback")
    .select("id, is_positive")
    .eq(fkColumn, item_id)
    .eq("session_id", session_id)
    .maybeSingle();

  if (existing) {
    if (existing.is_positive === is_positive) {
      // Same vote clicked again - remove vote (toggle off)
      await db.from("feedback").delete().eq("id", existing.id);
      await adjustCount(db, table, item_id, is_positive ? "likes" : "dislikes", -1);

      const { data: updatedAfterToggle } = await db.from(table).select("likes, dislikes").eq("id", item_id).single();

      revalidatePath("/");
      revalidatePath(content_type === "event" ? "/wydarzenia" : content_type === "place" ? "/miejsca" : "/kolonie");

      return NextResponse.json({
        ok: true,
        changed: true,
        removed: true,
        likes: updatedAfterToggle?.likes ?? 0,
        dislikes: updatedAfterToggle?.dislikes ?? 0,
      });
    }

    // Change vote: delete old, adjust counters
    await db.from("feedback").delete().eq("id", existing.id);
    await adjustCount(db, table, item_id, existing.is_positive ? "likes" : "dislikes", -1);
  }

  // Insert new vote
  const { error: insertError } = await db.from("feedback").insert({
    content_type,
    [fkColumn]: item_id,
    is_positive,
    session_id,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Increment new counter
  await adjustCount(db, table, item_id, is_positive ? "likes" : "dislikes", 1);

  // Return updated counts
  const { data: updated } = await db.from(table).select("likes, dislikes").eq("id", item_id).single();

  revalidatePath("/");
  revalidatePath(content_type === "event" ? "/wydarzenia" : content_type === "place" ? "/miejsca" : "/kolonie");

  return NextResponse.json({
    ok: true,
    changed: true,
    likes: updated?.likes ?? 0,
    dislikes: updated?.dislikes ?? 0,
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

  const fkColumn = content_type === "event" ? "event_id" : content_type === "place" ? "place_id" : content_type === "camp" ? "camp_id" : null;
  if (!fkColumn) {
    return NextResponse.json({ error: "Invalid content_type" }, { status: 400 });
  }

  const { data } = await db
    .from("feedback")
    .select("is_positive")
    .eq(fkColumn, item_id)
    .eq("session_id", session_id)
    .maybeSingle();

  return NextResponse.json({
    vote: data ? (data.is_positive ? "up" : "down") : null,
  });
}
