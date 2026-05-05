import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const NEW_CAMPS_JSON = path.join(process.cwd(), "camps_new.json");

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

function firstString(raw: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = asNullableString(raw[key]);
    if (val != null) return val;
  }
  return null;
}

function buildCampDraftPayload(raw: Record<string, unknown>) {
  const title = firstString(raw, "title", "tytul", "tytuł", "nazwa") ?? "Nowa kolonia";
  const campId = asNullableString(raw.camp_id);
  const dateStart = firstString(raw, "date_start", "termin_od") ?? new Date().toISOString().slice(0, 10);
  const dateEnd = firstString(raw, "date_end", "termin_do") ?? dateStart;
  const city = firstString(raw, "city", "miasto") ?? "Kraków";

  return {
    camp_id: campId,
    title,
    description_short: firstString(raw, "description_short", "tematyka", "temat", "program", "description_long") ?? `Kolonia: ${title}`,
    description_long: asNullableString(raw.description_long) ?? "",
    type_lvl_1: firstString(raw, "type_lvl_1", "type_id", "type level 1", "type lvl1", "type lvl 1", "typ poziom 1", "typ lvl1", "typ lvl 1"),
    type_lvl_2: firstString(raw, "type_lvl_2", "subtype_id", "type level 2", "type lvl2", "type lvl 2", "typ poziom 2", "typ lvl2", "typ lvl 2"),
    date_start: dateStart,
    date_end: dateEnd,
    age_min: asNullableNumber(raw.age_min) ?? asNullableNumber(raw.wiek_od),
    age_max: asNullableNumber(raw.age_max) ?? asNullableNumber(raw.wiek_do),
    price_from: asNullableNumber(raw.price_from) ?? asNullableNumber(raw.price) ?? asNullableNumber(raw.cena),
    price_to: asNullableNumber(raw.price_to) ?? asNullableNumber(raw.cena_do),
    meals_included: asBoolean(raw.meals_included ?? raw.wyzywienie),
    transport_included: asBoolean(raw.transport_included ?? raw.transport ?? raw.dojazd),
    district: firstString(raw, "district", "dzielnica") ?? "Inne",
    street: firstString(raw, "street", "ulica", "adres", "address") ?? "",
    city,
    postcode: firstString(raw, "postcode", "kod", "kod_pocztowy"),
    lat: asNullableNumber(raw.lat),
    lng: asNullableNumber(raw.lng),
    source_url: firstString(raw, "source_url", "url", "link", "link_zrodlowy"),
    facebook_url: firstString(raw, "facebook_url", "facebook", "fb"),
    organizer: firstString(raw, "organizer", "organizator"),
    category_lvl_1: firstString(raw, "category_lvl_1", "main_category", "camp_type", "typ", "rodzaj", "type"),
    category_lvl_2: firstString(raw, "category_lvl_2", "category", "kategoria", "kategoria_obozu", "podtyp"),
    category_lvl_3: firstString(raw, "category_lvl_3", "subcategory", "podkategoria", "dyscyplina"),
    image_prompt: asNullableString(raw.image_prompt),
    status: "draft",
  };
}

export async function POST(request: NextRequest) {
  const scriptPath = path.join(process.cwd(), "scripts", "build_camps_dataframe.py");
  const pythonExecutable = resolvePythonExecutable();

  return new Promise<NextResponse>((resolve) => {
    exec(`${pythonExecutable} "${scriptPath}"`, { cwd: process.cwd(), env: process.env }, (error, stdout, stderr) => {
      if (error) {
        resolve(NextResponse.json({ ok: false, error: stderr || error.message }, { status: 500 }));
        return;
      }

      let newCamps: Array<Record<string, unknown>> = [];
      try {
        const raw = fs.readFileSync(NEW_CAMPS_JSON, "utf-8");
        newCamps = JSON.parse(raw);
      } catch { /* JSON missing — return empty list */ }

      if (!Array.isArray(newCamps) || newCamps.length === 0) {
        resolve(NextResponse.json({ ok: true, output: stdout, newCamps: [] }));
        return;
      }

      const baseUrl = new URL(request.url);
      const adminCampsUrl = new URL("/api/admin/camps", baseUrl);
      const adminGeocodeUrl = new URL("/api/admin/geocode", baseUrl);
      const created: Array<{ id: string; camp_id: string; title: string; image_prompt: string }> = [];
      let failed = 0;

      const run = async () => {
        const existingResponse = await fetch(adminCampsUrl, { cache: "no-store" });
        const existingCamps = existingResponse.ok ? await existingResponse.json() as Array<Record<string, unknown>> : [];

        for (const row of newCamps) {
          if (!row || typeof row !== "object") {
            failed += 1;
            continue;
          }

          const payload = buildCampDraftPayload(row as Record<string, unknown>);

          const matchedExisting = existingCamps.find((camp) => {
            const sameSource = payload.source_url
              && typeof camp.source_url === "string"
              && camp.source_url === payload.source_url;
            const sameTitleAndDate = camp.title === payload.title && camp.date_start === payload.date_start;
            return camp.status !== "published" && (sameSource || sameTitleAndDate);
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
            const response = await fetch(adminCampsUrl, {
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
              camp_id: payload.camp_id ?? "",
              title: payload.title,
              image_prompt: payload.image_prompt ?? "",
            });
          } catch {
            failed += 1;
          }
        }

        resolve(NextResponse.json({ ok: true, output: stdout, newCamps: created, failed }));
      };

      run().catch((runError) => {
        resolve(NextResponse.json({ ok: false, error: String(runError) }, { status: 500 }));
      });
    });
  });
}
