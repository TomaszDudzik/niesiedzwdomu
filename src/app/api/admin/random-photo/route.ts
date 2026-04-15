import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "event-library";
const ALLOWED_TABLES = new Set(["camps", "events", "activities", "places"]);
const TABLE_ROOT_BY_NAME = {
  camps: "polkolonie",
  events: "wydarzenia",
  activities: "zajecia",
  places: "miejsca",
} as const;

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function normalizePathSegment(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || null;
}

async function resolveTypeSegment(db: ReturnType<typeof getDb>, tableName: "type_lvl_1" | "type_lvl_2", id: string | null | undefined) {
  if (!id) return null;

  const { data } = await db
    .from(tableName)
    .select("name, slug")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  return normalizePathSegment(data.slug ?? data.name ?? null);
}

function buildFolderCandidates(table: keyof typeof TABLE_ROOT_BY_NAME, typeSegments: string[], categorySegments: string[]) {
  const rootSegment = TABLE_ROOT_BY_NAME[table];
  const candidates: string[] = [];

  const addCandidate = (segments: Array<string | null | undefined>) => {
    const path = segments.filter(Boolean).join("/");
    if (path && !candidates.includes(path)) {
      candidates.push(path);
    }
  };

  for (let categoryLength = categorySegments.length; categoryLength >= 1; categoryLength -= 1) {
    const categorySlice = categorySegments.slice(0, categoryLength);

    addCandidate([rootSegment, ...typeSegments, ...categorySlice]);

    if (typeSegments.length > 1) {
      addCandidate([rootSegment, typeSegments[0], ...categorySlice]);
    }

    addCandidate([rootSegment, ...categorySlice]);
    addCandidate([...typeSegments, ...categorySlice]);

    if (typeSegments.length > 1) {
      addCandidate([typeSegments[0], ...categorySlice]);
    }

    addCandidate([...categorySlice]);
  }

  addCandidate([rootSegment, ...typeSegments]);
  if (typeSegments.length > 1) {
    addCandidate([rootSegment, typeSegments[0]]);
  }
  addCandidate([...typeSegments]);
  if (typeSegments.length > 1) {
    addCandidate([typeSegments[0]]);
  }
  addCandidate([rootSegment]);

  return candidates;
}

async function findRandomPhotoFolder(db: ReturnType<typeof getDb>, folderCandidates: string[]) {
  for (const folderPath of folderCandidates) {
    const { data: files, error } = await db.storage
      .from(BUCKET)
      .list(folderPath, { limit: 200 });

    if (error || !files) {
      continue;
    }

    const coverFiles = files.filter((file) => file.name.endsWith("-cover.webp"));
    if (coverFiles.length > 0) {
      return { folderPath, coverFiles };
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const {
    id,
    type_lvl_1_id,
    type_lvl_2_id,
    type_id,
    subtype_id,
    category_lvl_1,
    category_lvl_2,
    category_lvl_3,
    main_category,
    category,
    subcategory,
    table = "camps",
  } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: "invalid table" }, { status: 400 });
  }

  const db = getDb();

  const [typeLevel1Segment, typeLevel2Segment] = await Promise.all([
    resolveTypeSegment(db, "type_lvl_1", type_lvl_1_id ?? type_id),
    resolveTypeSegment(db, "type_lvl_2", type_lvl_2_id ?? subtype_id),
  ]);

  const categorySegments = [category_lvl_1 ?? main_category, category_lvl_2 ?? category, category_lvl_3 ?? subcategory]
    .map((segment) => normalizePathSegment(typeof segment === "string" ? segment : null))
    .filter((segment): segment is string => Boolean(segment));

  const typeSegments = [typeLevel1Segment, typeLevel2Segment].filter((segment): segment is string => Boolean(segment));
  const folderCandidates = buildFolderCandidates(table, typeSegments, categorySegments);

  if (folderCandidates.length === 0) {
    return NextResponse.json({ error: "At least one type or category level is required" }, { status: 400 });
  }

  const folderMatch = await findRandomPhotoFolder(db, folderCandidates);
  if (!folderMatch) {
    return NextResponse.json({ error: `No images found for paths: ${folderCandidates.join(", ")}` }, { status: 404 });
  }

  const { folderPath, coverFiles } = folderMatch;
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
