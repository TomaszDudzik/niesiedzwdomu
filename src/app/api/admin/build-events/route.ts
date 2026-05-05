import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import {
  PUBLIC_SUBMISSION_TAXONOMY_FALLBACK,
  resolveCategoryLevel1Name,
  resolveCategoryLevel2Name,
  resolveTypeLevel1Id,
  resolveTypeLevel2Id,
} from "@/lib/admin-taxonomy";

const NEW_EVENTS_JSON = path.join(process.cwd(), "events_new.json");

function resolvePythonExecutable() {
  const venvPython = path.join(process.cwd(), ".venv", "Scripts", "python.exe");
  return fs.existsSync(venvPython) ? `"${venvPython}"` : "python";
}

function asNullableString(value: unknown) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function asNullableNumber(value: unknown) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "tak", "yes", "y"].includes(normalized);
  }
  return false;
}

function asNullableDistrict(value: unknown) {
  const district = asNullableString(value);
  return district ?? "Inne";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeEventCategory(value: unknown) {
  const normalized = asNullableString(value)?.toLowerCase() ?? "";
  const aliases: Record<string, string> = {
    warsztat: "warsztaty",
    warsztaty: "warsztaty",
    spektakl: "spektakl",
    teatr: "spektakl",
    muzyka: "muzyka",
    koncert: "muzyka",
    sport: "sport",
    sportowe: "sport",
    natura: "natura",
    przyroda: "natura",
    edukacja: "edukacja",
    edukacyjne: "edukacja",
    festyn: "festyn",
    kino: "kino",
    film: "kino",
    wystawa: "wystawa",
    inne: "inne",
  };

  return aliases[normalized] ?? "inne";
}

function normalizeImportedTypeLevel1() {
  return resolveTypeLevel1Id(PUBLIC_SUBMISSION_TAXONOMY_FALLBACK.type_lvl_1, "dzieci") ?? "dzieci";
}

function normalizeImportedTypeLevel2() {
  return resolveTypeLevel2Id(
    PUBLIC_SUBMISSION_TAXONOMY_FALLBACK.type_lvl_2,
    "wydarzenia",
    normalizeImportedTypeLevel1(),
  ) ?? "wydarzenia";
}

function normalizeImportedCategoryLevel1(value: unknown) {
  const normalized = asNullableString(value);
  if (!normalized) return null;

  const alias = normalized.toLowerCase() === "sztuka" ? "Kultura" : normalized;
  return resolveCategoryLevel1Name(PUBLIC_SUBMISSION_TAXONOMY_FALLBACK.category_lvl_1, alias);
}

function normalizeImportedCategoryLevel2(categoryLevel1Name: string | null, primaryValue: unknown) {
  const normalizedPrimary = asNullableString(primaryValue);
  const categoryLookup = categoryLevel1Name ?? null;

  const preferredValue = normalizedPrimary;
  if (!preferredValue) return null;

  const aliasMap: Record<string, string> = {
    wystawa: "Sztuka i rękodzieło",
    warsztaty: categoryLookup === "Kultura" ? "Sztuka i rękodzieło" : "Nauka i eksperymenty",
    spektakl: "Teatr",
    spektakle: "Teatr",
    koncert: "Muzyka",
    film: "Film i fotografia",
    fotografia: "Film i fotografia",
  };

  const alias = aliasMap[preferredValue.toLowerCase()] ?? preferredValue;
  const resolved = resolveCategoryLevel2Name(
    PUBLIC_SUBMISSION_TAXONOMY_FALLBACK.category_lvl_2,
    alias,
    categoryLookup,
    PUBLIC_SUBMISSION_TAXONOMY_FALLBACK.category_lvl_1,
  );

  return resolved;
}

function buildDraftPayload(raw: Record<string, unknown>) {
  const title = asNullableString(raw.title) ?? "Nowe wydarzenie";
  const descriptionShort = asNullableString(raw.description_short)
    ?? asNullableString(raw.description_long)
    ?? `Wydarzenie: ${title}`;
  const descriptionLong = asNullableString(raw.description_long) ?? "";
  const dateStart = asNullableString(raw.date_start) ?? new Date().toISOString().slice(0, 10);
  const city = asNullableString(raw.city) ?? "Kraków";
  const eventId = asNullableString(raw.event_id);
  const baseSlug = slugify(title) || "wydarzenie";
  const slugSuffix = eventId ? slugify(eventId) : Date.now().toString(36);
  const typeLevel1 = normalizeImportedTypeLevel1();
  const typeLevel2 = normalizeImportedTypeLevel2();
  const categoryLevel1 = normalizeImportedCategoryLevel1(raw.category_lvl_1);
  const categoryLevel2 = normalizeImportedCategoryLevel2(categoryLevel1, raw.category_lvl_2 ?? raw.category);

  return {
    event_id: eventId,
    title,
    slug: `${baseSlug}-${slugSuffix}`,
    description_short: descriptionShort,
    description_long: descriptionLong,
    date_start: dateStart,
    date_end: asNullableString(raw.date_end),
    time_start: asNullableString(raw.time_start),
    time_end: asNullableString(raw.time_end),
    age_min: asNullableNumber(raw.age_min),
    age_max: asNullableNumber(raw.age_max),
    district: asNullableDistrict(raw.district),
    street: asNullableString(raw.street) ?? "Do uzupełnienia",
    city,
    postcode: asNullableString(raw.postcode),
    lat: asNullableNumber(raw.lat),
    lng: asNullableNumber(raw.lng),
    source_url: asNullableString(raw.source_url),
    facebook_url: asNullableString(raw.facebook_url),
    organizer: asNullableString(raw.organizer),
    price_from: asNullableNumber(raw.price_from),
    price_to: asNullableNumber(raw.price_to),
    is_free: asBoolean(raw.is_free),
    type_lvl_1: typeLevel1,
    type_lvl_2: typeLevel2,
    category_lvl_1: categoryLevel1,
    category_lvl_2: categoryLevel2,
    category_lvl_3: asNullableString(raw.category_lvl_3),
    category: normalizeEventCategory(categoryLevel2),
    image_prompt: asNullableString(raw.image_prompt),
    status: "draft",
  };
}

function hasMissingGeo(payload: ReturnType<typeof buildDraftPayload>) {
  const hasLat = typeof payload.lat === "number" && Number.isFinite(payload.lat);
  const hasLng = typeof payload.lng === "number" && Number.isFinite(payload.lng);
  const district = asNullableString(payload.district);
  const hasDistrict = district != null && district.toLowerCase() !== "inne";
  return !hasLat || !hasLng || !hasDistrict;
}

async function geocodeFromAddress(
  geocodeUrl: URL,
  payload: ReturnType<typeof buildDraftPayload>,
) {
  const street = asNullableString(payload.street);
  const city = asNullableString(payload.city) ?? "Kraków";
  if (!street || !hasMissingGeo(payload)) {
    return { payload, geocoded: false };
  }

  try {
    const response = await fetch(geocodeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: street, city }),
      cache: "no-store",
    });

    if (!response.ok) {
      return { payload, geocoded: false };
    }

    const geocodeData = await response.json() as Record<string, unknown>;
    const lat = asNullableNumber(geocodeData.lat);
    const lng = asNullableNumber(geocodeData.lng);
    const district = asNullableString(geocodeData.district);
    const postcode = asNullableString(geocodeData.postcode);
    const geocodedCity = asNullableString(geocodeData.city);

    const updated = {
      ...payload,
      lat: payload.lat ?? lat,
      lng: payload.lng ?? lng,
      district:
        payload.district && payload.district.toLowerCase() !== "inne"
          ? payload.district
          : (district ?? payload.district),
      postcode: payload.postcode ?? postcode,
      city: payload.city ?? geocodedCity ?? city,
    };

    const geocoded =
      (payload.lat == null && updated.lat != null) ||
      (payload.lng == null && updated.lng != null) ||
      ((payload.district == null || payload.district.toLowerCase() === "inne") &&
        updated.district != null &&
        updated.district.toLowerCase() !== "inne");

    return { payload: updated, geocoded };
  } catch {
    return { payload, geocoded: false };
  }
}

export async function POST(request: NextRequest) {
  const scriptPath = path.join(process.cwd(), "scripts", "build_events_dataframe.py");
  const pythonExecutable = resolvePythonExecutable();

  return new Promise<NextResponse>((resolve) => {
    exec(`${pythonExecutable} "${scriptPath}"`, { cwd: process.cwd(), env: process.env }, (error, stdout, stderr) => {
      if (error) {
        resolve(NextResponse.json({ ok: false, error: stderr || error.message }, { status: 500 }));
        return;
      }

      let newEvents: Array<Record<string, unknown>> = [];
      try {
        const raw = fs.readFileSync(NEW_EVENTS_JSON, "utf-8");
        newEvents = JSON.parse(raw);
      } catch { /* JSON missing — return empty list */ }

      if (!Array.isArray(newEvents) || newEvents.length === 0) {
        resolve(NextResponse.json({ ok: true, output: stdout, newEvents: [] }));
        return;
      }

      const baseUrl = new URL(request.url);
      const adminEventsUrl = new URL("/api/admin/events", baseUrl);
      const adminGeocodeUrl = new URL("/api/admin/geocode", baseUrl);
      const created: Array<{ id: string; event_id: string; title: string; image_prompt: string }> = [];
      let failed = 0;
      let geocodedCount = 0;

      const run = async () => {
        const existingResponse = await fetch(adminEventsUrl, { cache: "no-store" });
        const existingEvents = existingResponse.ok ? await existingResponse.json() as Array<Record<string, unknown>> : [];

        for (const row of newEvents) {
          if (!row || typeof row !== "object") {
            failed += 1;
            continue;
          }

          const geocodeResult = await geocodeFromAddress(adminGeocodeUrl, buildDraftPayload(row as Record<string, unknown>));
          const payload = geocodeResult.payload;
          if (geocodeResult.geocoded) {
            geocodedCount += 1;
          }
          const matchedExisting = existingEvents.find((event) => {
            const sameSource = payload.source_url
              && typeof event.source_url === "string"
              && event.source_url === payload.source_url;
            const sameTitleAndDate = event.title === payload.title && event.date_start === payload.date_start;
            const isPublished = event.status === "published";
            return !isPublished && (sameSource || sameTitleAndDate);
          });

          try {
            const response = await fetch(adminEventsUrl, {
              method: matchedExisting?.id ? "PATCH" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(matchedExisting?.id ? {
                id: matchedExisting.id,
                ...payload,
                slug: typeof matchedExisting.slug === "string" && matchedExisting.slug.trim().length > 0
                  ? matchedExisting.slug
                  : payload.slug,
              } : payload),
              cache: "no-store",
            });

            const json = await response.json();
            const returnedId = matchedExisting?.id ? json?.updated?.id : json?.id;
            if (!response.ok || !returnedId) {
              failed += 1;
              continue;
            }

            created.push({
              id: String(returnedId),
              event_id: payload.event_id ?? "",
              title: payload.title,
              image_prompt: payload.image_prompt ?? "",
            });
          } catch {
            failed += 1;
          }
        }

        resolve(NextResponse.json({ ok: true, output: stdout, newEvents: created, failed, geocoded: geocodedCount }));
      };

      run().catch((runError) => {
        resolve(NextResponse.json({ ok: false, error: String(runError) }, { status: 500 }));
      });
    });
  });
}
