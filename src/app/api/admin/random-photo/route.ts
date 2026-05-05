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

type CoverCandidate = {
  coverName: string;
  thumbName: string;
  imageSet: string;
};

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

function resolveTypeSegment(value: string | null | undefined) {
  return normalizePathSegment(value ?? null);
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

    const coverCandidates = files
      .map((file) => toCoverCandidate(file.name))
      .filter((candidate): candidate is CoverCandidate => Boolean(candidate));

    if (coverCandidates.length > 0) {
      return { folderPath, coverCandidates };
    }
  }

  return null;
}

function toCoverCandidate(fileName: string): CoverCandidate | null {
  const indexedMatch = fileName.match(/^(.*)-cover-(\d+)\.webp$/i);
  if (indexedMatch) {
    const base = indexedMatch[1];
    const index = indexedMatch[2];
    return {
      coverName: fileName,
      thumbName: `${base}-thumb-${index}.webp`,
      imageSet: `${base}-${index}`,
    };
  }

  const defaultMatch = fileName.match(/^(.*)-cover\.webp$/i);
  if (defaultMatch) {
    const base = defaultMatch[1];
    return {
      coverName: fileName,
      thumbName: `${base}-thumb.webp`,
      imageSet: base,
    };
  }

  return null;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function POST(request: NextRequest) {
  const {
    id,
    photo_seed,
    stable_by_id,
    type_lvl_1,
    type_lvl_2,
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

  const typeLevel1Segment = resolveTypeSegment(type_lvl_1 ?? type_id);
  const typeLevel2Segment = resolveTypeSegment(type_lvl_2 ?? subtype_id);

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

  const { folderPath, coverCandidates } = folderMatch;
  const chooseBySeed = Boolean(stable_by_id);
  const seedValue = typeof photo_seed === "string" && photo_seed.trim().length > 0
    ? photo_seed.trim()
    : String(id);
  const chosenIndex = chooseBySeed
    ? (hashString(seedValue) % coverCandidates.length)
    : Math.floor(Math.random() * coverCandidates.length);

  const selected = coverCandidates[chosenIndex];
  const setId = selected.imageSet;

  const coverPath = `${folderPath}/${selected.coverName}`;
  const thumbPath = `${folderPath}/${selected.thumbName}`;

  const coverUrl = db.storage.from(BUCKET).getPublicUrl(coverPath).data.publicUrl;
  const thumbUrl = db.storage.from(BUCKET).getPublicUrl(thumbPath).data.publicUrl;

  const { error: dbError } = await db
    .from(table)
    .update({
      image_cover: coverUrl,
      image_thumb: thumbUrl,
      image_set: setId,
    })
    .eq("id", id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, image_cover: coverUrl, image_thumb: thumbUrl, image_set: setId });
}
