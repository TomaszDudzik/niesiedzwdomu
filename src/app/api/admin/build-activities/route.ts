import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const NEW_ACTIVITIES_JSON = path.join(process.cwd(), "activities_new.json");

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


function firstString(raw: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = asNullableString(raw[key]);
    if (val != null) return val;
  }
  return null;
}

function buildActivityDraftPayload(raw: Record<string, unknown>) {
  const title = firstString(raw, "title", "tytul", "tytuł", "nazwa") ?? "Nowe zajęcia";
  const activityId = asNullableString(raw.activity_id);
  const dateStart = firstString(raw, "date_start", "termin_od", "data_od") ?? new Date().toISOString().slice(0, 10);
  const city = firstString(raw, "city", "miasto") ?? "Kraków";

  return {
    activity_id: activityId,
    title,
    description_short: firstString(raw, "description_short", "tematyka", "temat", "program", "description_long") ?? `Zajęcia: ${title}`,
    description_long: asNullableString(raw.description_long) ?? "",
    date_start: dateStart,
    date_end: firstString(raw, "date_end", "termin_do", "data_do"),
    time_start: firstString(raw, "time_start", "godzina_od", "godzina od"),
    time_end: firstString(raw, "time_end", "godzina_do", "godzina do"),
    days_of_week: Array.isArray(raw.days_of_week) ? raw.days_of_week.map(String) : [],
    age_min: asNullableNumber(raw.age_min) ?? asNullableNumber(raw.wiek_od),
    age_max: asNullableNumber(raw.age_max) ?? asNullableNumber(raw.wiek_do),
    price_from: asNullableNumber(raw.price_from) ?? asNullableNumber(raw.price) ?? asNullableNumber(raw.cena),
    price_to: asNullableNumber(raw.price_to) ?? asNullableNumber(raw.cena_do),
    district: firstString(raw, "district", "dzielnica") ?? "Inne",
    street: firstString(raw, "street", "ulica", "adres", "address") ?? "",
    city,
    postcode: firstString(raw, "postcode", "kod", "kod_pocztowy"),
    lat: asNullableNumber(raw.lat),
    lng: asNullableNumber(raw.lng),
    source_url: firstString(raw, "source_url", "url", "link", "link_zrodlowy"),
    facebook_url: firstString(raw, "facebook_url", "facebook", "fb"),
    organizer: firstString(raw, "organizer", "organizator"),
    type_lvl_1: firstString(raw, "type_lvl_1", "grupa"),
    type_lvl_2: firstString(raw, "type_lvl_2", "podgrupa"),
    category_lvl_1: firstString(raw, "category_lvl_1", "main_category", "typ", "rodzaj", "type"),
    category_lvl_2: firstString(raw, "category_lvl_2", "category", "kategoria", "podtyp"),
    category_lvl_3: firstString(raw, "category_lvl_3", "subcategory", "podkategoria", "dyscyplina"),
    list_of_activities: firstString(raw, "list_of_activities", "lista_aktywnosci"),
    image_prompt: asNullableString(raw.image_prompt),
    status: "draft",
  };
}

export async function POST(request: NextRequest) {
  const scriptPath = path.join(process.cwd(), "scripts", "build_activities_dataframe.py");
  const pythonExecutable = resolvePythonExecutable();

  return new Promise<NextResponse>((resolve) => {
    exec(`${pythonExecutable} "${scriptPath}"`, { cwd: process.cwd(), env: process.env }, (error, stdout, stderr) => {
      if (error) {
        resolve(NextResponse.json({ ok: false, error: stderr || error.message }, { status: 500 }));
        return;
      }

      let newActivities: Array<Record<string, unknown>> = [];
      try {
        const raw = fs.readFileSync(NEW_ACTIVITIES_JSON, "utf-8");
        newActivities = JSON.parse(raw);
      } catch { /* JSON missing — return empty list */ }

      if (!Array.isArray(newActivities) || newActivities.length === 0) {
        resolve(NextResponse.json({ ok: true, output: stdout, newActivities: [] }));
        return;
      }

      const baseUrl = new URL(request.url);
      const adminActivitiesUrl = new URL("/api/admin/activities", baseUrl);
      const adminGeocodeUrl = new URL("/api/admin/geocode", baseUrl);
      const created: Array<{ id: string; activity_id: string; title: string; image_prompt: string }> = [];
      let failed = 0;

      const run = async () => {
        const existingResponse = await fetch(adminActivitiesUrl, { cache: "no-store" });
        const existingActivities = existingResponse.ok ? await existingResponse.json() as Array<Record<string, unknown>> : [];

        for (const row of newActivities) {
          if (!row || typeof row !== "object") {
            failed += 1;
            continue;
          }

          const payload = buildActivityDraftPayload(row as Record<string, unknown>);

          const matchedExisting = existingActivities.find((activity) => {
            const sameSource = payload.source_url
              && typeof activity.source_url === "string"
              && activity.source_url === payload.source_url;
            const sameTitleAndDate = activity.title === payload.title && activity.date_start === payload.date_start;
            return activity.status !== "published" && (sameSource || sameTitleAndDate);
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
            const response = await fetch(adminActivitiesUrl, {
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
              activity_id: payload.activity_id ?? "",
              title: payload.title,
              image_prompt: payload.image_prompt ?? "",
            });
          } catch {
            failed += 1;
          }
        }

        resolve(NextResponse.json({ ok: true, output: stdout, newActivities: created, failed }));
      };

      run().catch((runError) => {
        resolve(NextResponse.json({ ok: false, error: String(runError) }, { status: 500 }));
      });
    });
  });
}
