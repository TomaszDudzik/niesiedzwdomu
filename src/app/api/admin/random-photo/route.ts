import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "event-library";
const ALLOWED_TABLES = new Set(["camps", "events", "activities", "places"]);

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  const { id, main_category, category, subcategory, table = "camps" } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: "invalid table" }, { status: 400 });
  }

  const db = getDb();

  const pathParts = [main_category, category, subcategory].filter(Boolean);
  if (pathParts.length === 0) {
    return NextResponse.json({ error: "At least main_category is required" }, { status: 400 });
  }
  const folderPath = pathParts.join("/");

  const { data: files, error: listError } = await db.storage
    .from(BUCKET)
    .list(folderPath, { limit: 200 });

  if (listError || !files) {
    return NextResponse.json({ error: `Cannot list folder: ${folderPath}` }, { status: 404 });
  }

  const coverFiles = files.filter((f) => f.name.endsWith("-cover.webp"));
  if (coverFiles.length === 0) {
    return NextResponse.json({ error: `No cover images in: ${folderPath}` }, { status: 404 });
  }

  const randomCover = coverFiles[Math.floor(Math.random() * coverFiles.length)];
  const setId = randomCover.name.replace("-cover.webp", "");

  const coverPath = `${folderPath}/${setId}-cover.webp`;
  const thumbPath = `${folderPath}/${setId}-thumb.webp`;

  const coverUrl = db.storage.from(BUCKET).getPublicUrl(coverPath).data.publicUrl;
  const thumbUrl = db.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;

  const { error: dbError } = await db
    .from(table)
    .update({
      image_url: coverUrl,
      image_cover: coverUrl,
      image_thumb: thumbUrl,
      image_set: setId,
    })
    .eq("id", id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, image_url: coverUrl, thumb_url: thumbUrl, set_id: setId });
}
