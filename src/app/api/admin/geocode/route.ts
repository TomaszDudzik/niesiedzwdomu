import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const DISTRICT_MAP: Record<string, string> = {
  // Main districts (official 18 dzielnic Krakowa)
  "stare miasto": "Stare Miasto",
  "grzegórzki": "Grzegórzki",
  "prądnik czerwony": "Prądnik Czerwony",
  "prądnik biały": "Prądnik Biały",
  "krowodrza": "Krowodrza",
  "bronowice": "Bronowice",
  "zwierzyniec": "Zwierzyniec",
  "dębniki": "Dębniki",
  "łagiewniki-borek fałęcki": "Łagiewniki-Borek Fałęcki",
  "swoszowice": "Swoszowice",
  "podgórze": "Podgórze",
  "bieżanów-prokocim": "Bieżanów-Prokocim",
  "czyżyny": "Czyżyny",
  "mistrzejowice": "Mistrzejowice",
  "wzgórza krzesławickie": "Wzgórza Krzesławickie",
  "nowa huta": "Nowa Huta",
  "kazimierz": "Kazimierz",
  // Sub-areas → parent district
  "bronowice wielkie": "Bronowice",
  "bronowice małe": "Bronowice",
  "podgórze duchackie": "Podgórze",
  "bieżanów": "Bieżanów-Prokocim",
  "prokocim": "Bieżanów-Prokocim",
  "łagiewniki": "Łagiewniki-Borek Fałęcki",
  "borek fałęcki": "Łagiewniki-Borek Fałęcki",
  "bieńczyce": "Nowa Huta",
  "dąbie": "Grzegórzki",
  "olsza": "Prądnik Czerwony",
  "prądnik": "Prądnik Biały",
  "salwator": "Zwierzyniec",
  "wola justowska": "Zwierzyniec",
  "ruczaj": "Dębniki",
  "zabłocie": "Podgórze",
  "płaszów": "Podgórze",
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
