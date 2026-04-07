import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const DISTRICT_MAP: Record<string, string> = {
  "stare miasto": "Stare Miasto",
  "kazimierz": "Kazimierz",
  "podgórze": "Podgórze",
  "nowa huta": "Nowa Huta",
  "krowodrza": "Krowodrza",
  "bronowice": "Bronowice",
  "zwierzyniec": "Zwierzyniec",
  "dębniki": "Dębniki",
  "prądnik czerwony": "Prądnik Czerwony",
  "prądnik biały": "Prądnik Biały",
  "czyżyny": "Czyżyny",
  "bieżanów": "Bieżanów",
  // Common sub-areas mapping
  "bronowice wielkie": "Bronowice",
  "bronowice małe": "Bronowice",
  "podgórze duchackie": "Podgórze",
  "bieżanów-prokocim": "Bieżanów",
  "prokocim": "Bieżanów",
  "łagiewniki": "Dębniki",
  "łagiewniki-borek fałęcki": "Dębniki",
  "borek fałęcki": "Dębniki",
  "swoszowice": "Podgórze",
  "wzgórza krzesławickie": "Nowa Huta",
  "bieńczyce": "Nowa Huta",
  "mistrzejowice": "Nowa Huta",
  "prądnik": "Prądnik Biały",
};

function matchDistrict(address: Record<string, string>): string | null {
  const candidates = [
    address.city_district,
    address.suburb,
    address.quarter,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (DISTRICT_MAP[key]) return DISTRICT_MAP[key];
  }

  // Partial match
  for (const candidate of candidates) {
    const lower = candidate.toLowerCase();
    for (const [key, value] of Object.entries(DISTRICT_MAP)) {
      if (lower.includes(key) || key.includes(lower)) return value;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const { address, city } = await request.json();

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const cleaned = address.replace(/^(ul\.|al\.|pl\.|os\.)\s*/i, "").trim();
  const searchCity = city || "Kraków";

  const attempts = [
    new URLSearchParams({ street: cleaned, city: searchCity, format: "json", limit: "1", countrycodes: "pl", addressdetails: "1" }),
    new URLSearchParams({ q: `${cleaned}, ${searchCity}`, format: "json", limit: "1", countrycodes: "pl", addressdetails: "1" }),
    new URLSearchParams({ q: address, format: "json", limit: "1", countrycodes: "pl", addressdetails: "1" }),
  ];

  try {
    for (const params of attempts) {
      const res = await fetch(`${NOMINATIM_URL}?${params}`, {
        headers: { "User-Agent": "niesiedzwdomu/1.0" },
      });
      const results = await res.json();

      if (results && results.length > 0) {
        const result = results[0];
        const addr = result.address || {};
        const district = matchDistrict(addr);

        return NextResponse.json({
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          display_name: result.display_name,
          district: district || null,
          city: addr.city || addr.town || null,
        });
      }
    }

    return NextResponse.json({ error: "Nie znaleziono lokalizacji" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Błąd geocodingu" }, { status: 500 });
  }
}
