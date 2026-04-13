import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "fs/promises";
import path from "path";

const BUCKET = "event-images";
// Photos live one level above the Next.js project root
const PHOTOS_BASE = path.join(process.cwd(), "..", "photos", "kolonie");

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  const { id, category } = await request.json();

  if (!id || !category) {
    return NextResponse.json({ error: "id and category required" }, { status: 400 });
  }

  const folderPath = path.join(PHOTOS_BASE, category);

  let files: string[];
  try {
    const entries = await readdir(folderPath);
    files = entries.filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f));
  } catch {
    return NextResponse.json({ error: `No photos folder for: ${category}` }, { status: 404 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "No photos in folder" }, { status: 404 });
  }

  const randomFile = files[Math.floor(Math.random() * files.length)];
  const ext = path.extname(randomFile).slice(1).toLowerCase();
  const storagePath = `events/${id}.${ext}`;
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const bytes = await readFile(path.join(folderPath, randomFile));
  const db = getDb();

  await db.storage.from(BUCKET).remove([
    `events/${id}.png`, `events/${id}.jpg`, `events/${id}.jpeg`, `events/${id}.webp`,
  ]);

  const { error: uploadError } = await db.storage.from(BUCKET).upload(storagePath, bytes, {
    contentType,
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(storagePath);
  const imageUrl = urlData.publicUrl;

  const { error: dbError } = await db.from("camps").update({ image_url: imageUrl }).eq("id", id);
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, image_url: imageUrl });
}
