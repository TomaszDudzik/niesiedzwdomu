import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "event-images";
const ALLOWED_TABLES = new Set(["events", "camps", "activities", "places"]);

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
  const variant = (formData.get("variant") as string) || "cover"; // "cover" | "thumb"

  if (!file || !id) {
    return NextResponse.json({ error: "file and id required" }, { status: 400 });
  }
  if (!ALLOWED_TABLES.has(target)) {
    return NextResponse.json({ error: "invalid target" }, { status: 400 });
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = variant === "thumb"
    ? `${target}/${id}-thumb.${ext}`
    : `${target}/${id}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Remove old files for this variant
  const basePath = variant === "thumb" ? `${target}/${id}-thumb` : `${target}/${id}`;
  await db.storage.from(BUCKET).remove([
    `${basePath}.png`, `${basePath}.jpg`, `${basePath}.jpeg`, `${basePath}.webp`,
  ]);

  const { error: uploadError } = await db.storage.from(BUCKET).upload(filePath, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(filePath);
  const imageUrl = urlData.publicUrl;

  // Update the correct column based on variant
  const updateField = variant === "thumb"
    ? { image_thumb: imageUrl }
    : { image_url: imageUrl, image_cover: imageUrl };

  const { error: dbError } = await db.from(target).update(updateField).eq("id", id);
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, image_url: imageUrl, variant });
}
