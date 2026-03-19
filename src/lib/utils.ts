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

export function formatAgeRange(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Wszystkie grupy wiekowe";
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
