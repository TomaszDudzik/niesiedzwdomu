import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "event-images";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  const db = getDb();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const id = formData.get("id") as string | null;
  const target = (formData.get("target") as string) || "places";

  if (!file || !id) {
    return NextResponse.json({ error: "file and id required" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `events/${id}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Remove old files
  await db.storage.from(BUCKET).remove([
    `events/${id}.png`,
    `events/${id}.jpg`,
    `events/${id}.jpeg`,
    `events/${id}.webp`,
  ]);

  // Upload new file
  const { error: uploadError } = await db.storage.from(BUCKET).upload(filePath, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(filePath);
  const imageUrl = urlData.publicUrl;

  // Update the record
  const table = target === "events" ? "events" : target === "camps" ? "camps" : "places";
  const { error: dbError } = await db.from(table).update({ image_url: imageUrl }).eq("id", id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, image_url: imageUrl });
}
