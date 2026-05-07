import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const NEW_PLACES_JSON = path.join(process.cwd(), "places_new.json");

function resolvePythonExecutable() {
  const venvPython = path.join(process.cwd(), ".venv", "Scripts", "python.exe");
  return fs.existsSync(venvPython) ? `"${venvPython}"` : "python";
}

function asNullableString(value: unknown) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 && normalized !== "None" && normalized !== "nan" ? normalized : null;
}

function asNullableNumber(value: unknown) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function firstString(raw: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = asNullableString(raw[key]);
    if (val != null) return val;
  }
  return null;
}

function buildPlaceDraftPayload(raw: Record<string, unknown>) {
  const title = firstString(raw, "title", "tytul", "tytuł", "nazwa") ?? "Nowe miejsce";
  const placeId = asNullableString(raw.place_id);
  const city = firstString(raw, "city", "miasto") ?? "Kraków";

  return {
    place_id: placeId,
    title,
    description_short: firstString(raw, "description_short", "tematyka", "temat", "opis") ?? `Miejsce: ${title}`,
    description_long: asNullableString(raw.description_long) ?? "",
    age_min: asNullableNumber(raw.age_min) ?? asNullableNumber(raw.wiek_od),
    age_max: asNullableNumber(raw.age_max) ?? asNullableNumber(raw.wiek_do),
    district: firstString(raw, "district", "dzielnica") ?? "Inne",
    street: firstString(raw, "street", "ulica", "adres", "address") ?? "",
    city,
    postcode: firstString(raw, "postcode", "kod", "kod_pocztowy"),
    lat: asNullableNumber(raw.lat),
    lng: asNullableNumber(raw.lng),
    source_url: firstString(raw, "source_url", "url", "link", "link_zrodlowy"),
    facebook_url: firstString(raw, "facebook_url", "facebook", "fb"),
    organizer: firstString(raw, "organizer", "organizator"),
    is_indoor: raw.is_indoor != null ? Boolean(raw.is_indoor) : null,
    type_lvl_1: firstString(raw, "type_lvl_1", "grupa"),
    type_lvl_2: firstString(raw, "type_lvl_2", "podgrupa"),
    category_lvl_1: firstString(raw, "category_lvl_1", "main_category", "typ", "rodzaj", "type"),
    category_lvl_2: firstString(raw, "category_lvl_2", "category", "kategoria", "podtyp"),
    category_lvl_3: firstString(raw, "category_lvl_3", "subcategory", "podkategoria"),
    image_prompt: asNullableString(raw.image_prompt),
    status: "draft",
  };
}

export async function POST(request: NextRequest) {
  const scriptPath = path.join(process.cwd(), "scripts", "build_places_dataframe.py");
  const pythonExecutable = resolvePythonExecutable();

  return new Promise<NextResponse>((resolve) => {
    exec(`${pythonExecutable} "${scriptPath}"`, { cwd: process.cwd(), env: process.env }, async (error, stdout, stderr) => {
      if (error) {
        resolve(NextResponse.json({ ok: false, error: stderr || error.message }, { status: 500 }));
        return;
      }

      let newPlaces: Array<Record<string, unknown>> = [];
      try {
        const raw = fs.readFileSync(NEW_PLACES_JSON, "utf-8");
        newPlaces = JSON.parse(raw);
      } catch { /* JSON missing — return empty list */ }

      if (!Array.isArray(newPlaces) || newPlaces.length === 0) {
        resolve(NextResponse.json({ ok: true, output: stdout, newPlaces: [] }));
        return;
      }

      const baseUrl = new URL(request.url);
      const adminPlacesUrl = new URL("/api/admin/places", baseUrl);
      const adminGeocodeUrl = new URL("/api/admin/geocode", baseUrl);
      const created: Array<{ id: string; place_id: string; title: string; image_prompt: string }> = [];
      let failed = 0;

      try {
        const existingResponse = await fetch(adminPlacesUrl, { cache: "no-store" });
        const existingPlaces = existingResponse.ok ? await existingResponse.json() as Array<Record<string, unknown>> : [];

        for (const row of newPlaces) {
          if (!row || typeof row !== "object") {
            failed += 1;
            continue;
          }

          const payload = buildPlaceDraftPayload(row as Record<string, unknown>);

          const matchedExisting = existingPlaces.find((place) => {
            const sameSource = payload.source_url
              && typeof place.source_url === "string"
              && place.source_url === payload.source_url;
            const sameTitleAndStreet = place.title === payload.title && place.street === payload.street;
            return place.status !== "published" && (sameSource || sameTitleAndStreet);
          });

          // Geocode if needed
          if (payload.street && (payload.lat == null || payload.lng == null)) {
            try {
              const geoRes = await fetch(adminGeocodeUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: payload.street, city: payload.city }),
                cache: "no-store",
              });
              if (geoRes.ok) {
                const geo = await geoRes.json() as Record<string, unknown>;
                if (typeof geo.lat === "number") payload.lat = geo.lat;
                if (typeof geo.lng === "number") payload.lng = geo.lng;
                if (typeof geo.district === "string" && (!payload.district || payload.district === "Inne")) payload.district = geo.district;
                if (typeof geo.postcode === "string" && !payload.postcode) payload.postcode = geo.postcode;
                if (typeof geo.city === "string") payload.city = geo.city;
              }
            } catch { /* geocoding is best-effort */ }
          }

          try {
            const response = await fetch(adminPlacesUrl, {
              method: matchedExisting?.id ? "PATCH" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(matchedExisting?.id ? { id: matchedExisting.id, ...payload } : payload),
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
              place_id: payload.place_id ?? "",
              title: payload.title,
              image_prompt: payload.image_prompt ?? "",
            });
          } catch {
            failed += 1;
          }
        }

        resolve(NextResponse.json({
          ok: true,
          output: stdout,
          newPlaces: created,
          failed,
        }));
      } catch (err) {
        resolve(NextResponse.json({ ok: false, error: String(err) }, { status: 500 }));
      }
    });
  });
}
