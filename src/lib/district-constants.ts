import type { District } from "@/types/database";

export const DISTRICT_ICONS: Partial<Record<District, string>> = {
  "Stare Miasto": "🏰",
  "Kazimierz": "🕍",
  "Podgórze": "🌉",
  "Nowa Huta": "🏭",
  "Krowodrza": "🌿",
  "Bronowice": "🌾",
  "Zwierzyniec": "🦬",
  "Dębniki": "🌊",
  "Prądnik Czerwony": "🌳",
  "Prądnik Biały": "🍃",
  "Czyżyny": "✈️",
  "Bieżanów-Prokocim": "🚋",
};

export const KRAKOW_CENTER: [number, number] = [50.0614, 19.9372];

export const DISTRICT_COORDS: Partial<Record<District, [number, number]>> = {
  "Stare Miasto": [50.0614, 19.9372],
  "Kazimierz": [50.05, 19.946],
  "Podgórze": [50.042, 19.951],
  "Nowa Huta": [50.072, 20.037],
  "Krowodrza": [50.077, 19.913],
  "Bronowice": [50.081, 19.89],
  "Zwierzyniec": [50.056, 19.89],
  "Dębniki": [50.043, 19.92],
  "Prądnik Czerwony": [50.087, 19.955],
  "Prądnik Biały": [50.095, 19.92],
  "Czyżyny": [50.072, 20.005],
  "Bieżanów-Prokocim": [50.015, 20.005],
};
