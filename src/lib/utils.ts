import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPrice(price: number | null): string {
  if (price === null || price === 0) return "Bezpłatnie";
  return `${price} zł`;
}

export function formatPriceRange(priceFrom: number | null, priceTo: number | null, isFree = false): string {
  if (isFree || ((priceFrom === null || priceFrom === 0) && (priceTo === null || priceTo === 0))) {
    return "Bezpłatnie";
  }
  if (priceFrom !== null && priceTo !== null) {
    if (priceFrom === priceTo) {
      return `${priceFrom} zł`;
    }
    return `${priceFrom}-${priceTo} zł`;
  }
  if (priceFrom !== null) {
    return `od ${priceFrom} zł`;
  }
  if (priceTo !== null) {
    return `do ${priceTo} zł`;
  }
  return "Cena do sprawdzenia";
}

export function getRangeFreeFlag(priceFrom: number | null, priceTo: number | null): boolean {
  return (priceFrom !== null && priceFrom === 0) || (priceTo !== null && priceTo === 0);
}

export function formatAgeRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Wszyscy";
  if (min !== null && max !== null) return `${min}–${max} lat`;
  if (min !== null) return `od ${min} lat`;
  return `do ${max} lat`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ąà]/g, "a")
    .replace(/[ćč]/g, "c")
    .replace(/[ęè]/g, "e")
    .replace(/[łl]/g, "l")
    .replace(/[ńñ]/g, "n")
    .replace(/[óò]/g, "o")
    .replace(/[śš]/g, "s")
    .replace(/[źżž]/g, "z")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function getNextWeekend(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + (day === 6 ? 0 : daysUntilSaturday));
  saturday.setHours(0, 0, 0, 0);
  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);
  sunday.setHours(23, 59, 59, 999);
  return { start: saturday, end: sunday };
}

/** Get the thumbnail image URL. Prefers image_thumb, falls back to deriving from image_url. */
export function thumbUrl(imageThumb: string | null | undefined, imageUrl: string | null | undefined): string | null {
  if (imageThumb) return imageThumb;
  if (imageUrl?.includes("-cover.webp")) return imageUrl.replace("-cover.webp", "-thumb.webp");
  return imageUrl || null;
}

export function withCacheBust(url: string | null | undefined): string | null {
  if (!url) return null;

  const [path, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set("t", Date.now().toString());

  return `${path}?${params.toString()}`;
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
