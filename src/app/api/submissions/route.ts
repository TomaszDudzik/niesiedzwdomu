import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils";

type SubmissionContentType = "event" | "place" | "camp" | "activity";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requiredString(value: unknown, fieldName: string) {
  const normalized = asString(value);
  if (!normalized) {
    throw new Error(`Pole ${fieldName} jest wymagane.`);
  }
  return normalized;
}

function nullableString(value: unknown) {
  const normalized = asString(value);
  return normalized || null;
}

function nullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }
  return false;
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildSlug(title: string) {
  return `${slugify(title) || "wpis"}-${Date.now().toString(36)}`;
}

function normalizeDistrict(value: unknown) {
  return nullableString(value) ?? "Inne";
}

function normalizeEventCategory(value: unknown) {
  const normalized = nullableString(value);
  if (!normalized) return "inne";

  const allowed = new Set(["warsztaty", "spektakl", "muzyka", "sport", "natura", "edukacja", "festyn", "kino", "wystawa", "inne"]);
  return allowed.has(normalized) ? normalized : "inne";
}

function daysBetweenInclusive(dateStart: string, dateEnd: string) {
  const start = new Date(dateStart);
  const end = new Date(dateEnd);
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 1;
  return Math.max(1, Math.round(diffMs / 86400000) + 1);
}

function buildAdminPayload(contentType: SubmissionContentType, payload: Record<string, unknown>) {
  if (contentType === "event") {
    const title = requiredString(payload.title, "tytuł");
    const eventCategory = normalizeEventCategory(payload.category);

    return {
      title,
      slug: buildSlug(title),
      description_short: requiredString(payload.description_short, "krótki opis"),
      description_long: nullableString(payload.description_long) ?? "",
      image_url: nullableString(payload.image_url),
      type_lvl_1_id: nullableString(payload.type_lvl_1_id),
      type_lvl_2_id: nullableString(payload.type_lvl_2_id),
      category_lvl_1: nullableString(payload.category_lvl_1),
      category_lvl_2: nullableString(payload.category_lvl_2) ?? eventCategory,
      category_lvl_3: nullableString(payload.category_lvl_3),
      date_start: requiredString(payload.date_start, "data rozpoczęcia"),
      date_end: nullableString(payload.date_end),
      time_start: nullableString(payload.time_start),
      time_end: nullableString(payload.time_end),
      age_min: nullableNumber(payload.age_min),
      age_max: nullableNumber(payload.age_max),
      price: nullableNumber(payload.price),
      is_free: asBoolean(payload.is_free),
      category: eventCategory,
      district: normalizeDistrict(payload.district),
      venue_name: requiredString(payload.venue_name, "miejsce wydarzenia"),
      venue_address: requiredString(payload.venue_address, "adres wydarzenia"),
      organizer: nullableString(payload.organizer),
      source_url: nullableString(payload.source_url),
      facebook_url: nullableString(payload.facebook_url),
      is_featured: false,
      status: "draft",
    };
  }

  if (contentType === "place") {
    const title = requiredString(payload.title, "nazwa miejsca");

    return {
      title,
      place_type: nullableString(payload.place_type) ?? "inne",
      is_indoor: asBoolean(payload.is_indoor),
      description_short: requiredString(payload.description_short, "krótki opis"),
      description_long: nullableString(payload.description_long) ?? "",
      image_url: nullableString(payload.image_url),
      type_lvl_1_id: nullableString(payload.type_lvl_1_id),
      type_lvl_2_id: nullableString(payload.type_lvl_2_id),
      category_lvl_1: nullableString(payload.category_lvl_1),
      category_lvl_2: nullableString(payload.category_lvl_2),
      category_lvl_3: nullableString(payload.category_lvl_3),
      street: requiredString(payload.street, "ulica"),
      city: nullableString(payload.city) ?? "Kraków",
      district: normalizeDistrict(payload.district),
      age_min: nullableNumber(payload.age_min),
      age_max: nullableNumber(payload.age_max),
      price: nullableNumber(payload.price),
      is_free: asBoolean(payload.is_free),
      amenities: asStringArray(payload.amenities),
      opening_hours: nullableString(payload.opening_hours),
      source_url: nullableString(payload.source_url),
      facebook_url: nullableString(payload.facebook_url),
      is_featured: false,
      status: "draft",
    };
  }

  if (contentType === "camp") {
    const title = requiredString(payload.title, "nazwa kolonii");
    const dateStart = requiredString(payload.date_start, "data rozpoczęcia");
    const dateEnd = requiredString(payload.date_end, "data zakończenia");

    return {
      title,
      description_short: requiredString(payload.description_short, "krótki opis"),
      description_long: nullableString(payload.description_long) ?? "",
      image_url: nullableString(payload.image_url),
      type_lvl_1_id: nullableString(payload.type_lvl_1_id),
      type_lvl_2_id: nullableString(payload.type_lvl_2_id),
      category_lvl_1: nullableString(payload.category_lvl_1),
      category_lvl_2: nullableString(payload.category_lvl_2),
      category_lvl_3: nullableString(payload.category_lvl_3),
      main_category: nullableString(payload.category_lvl_1),
      category: nullableString(payload.category_lvl_2),
      subcategory: nullableString(payload.category_lvl_3),
      date_start: dateStart,
      date_end: dateEnd,
      season: nullableString(payload.season) ?? "lato",
      duration_days: nullableNumber(payload.duration_days) ?? daysBetweenInclusive(dateStart, dateEnd),
      meals_included: asBoolean(payload.meals_included),
      transport_included: asBoolean(payload.transport_included),
      age_min: nullableNumber(payload.age_min),
      age_max: nullableNumber(payload.age_max),
      price_from: nullableNumber(payload.price_from),
      price_to: nullableNumber(payload.price_to),
      is_free: asBoolean(payload.is_free),
      district: normalizeDistrict(payload.district),
      venue_name: requiredString(payload.venue_name, "miejsce"),
      venue_address: requiredString(payload.venue_address, "adres"),
      organizer: requiredString(payload.organizer, "organizator"),
      source_url: nullableString(payload.source_url),
      facebook_url: nullableString(payload.facebook_url),
      is_featured: false,
      status: "draft",
    };
  }

  const title = requiredString(payload.title, "nazwa zajęć");

  return {
    title,
    description_short: requiredString(payload.description_short, "krótki opis"),
    description_long: nullableString(payload.description_long) ?? "",
    image_url: nullableString(payload.image_url),
    type_lvl_1_id: nullableString(payload.type_lvl_1_id),
    type_lvl_2_id: nullableString(payload.type_lvl_2_id),
    category_lvl_1: nullableString(payload.category_lvl_1),
    category_lvl_2: nullableString(payload.category_lvl_2),
    category_lvl_3: nullableString(payload.category_lvl_3),
    main_category: nullableString(payload.category_lvl_1),
    category: nullableString(payload.category_lvl_2),
    subcategory: nullableString(payload.category_lvl_3),
    activity_type: nullableString(payload.activity_type) ?? "inne",
    schedule_summary: nullableString(payload.schedule_summary),
    days_of_week: asStringArray(payload.days_of_week),
    date_start: requiredString(payload.date_start, "data rozpoczęcia"),
    date_end: nullableString(payload.date_end),
    time_start: nullableString(payload.time_start),
    time_end: nullableString(payload.time_end),
    age_min: nullableNumber(payload.age_min),
    age_max: nullableNumber(payload.age_max),
    price_from: nullableNumber(payload.price_from),
    price_to: nullableNumber(payload.price_to),
    is_free: asBoolean(payload.is_free),
    district: normalizeDistrict(payload.district),
    venue_name: requiredString(payload.venue_name, "miejsce"),
    venue_address: requiredString(payload.venue_address, "adres"),
    organizer: requiredString(payload.organizer, "organizator"),
    source_url: nullableString(payload.source_url),
    facebook_url: nullableString(payload.facebook_url),
    is_featured: false,
    status: "draft",
  };
}

function getAdminPath(contentType: SubmissionContentType) {
  if (contentType === "event") return "/api/admin/events";
  if (contentType === "place") return "/api/admin/places";
  if (contentType === "camp") return "/api/admin/camps";
  return "/api/admin/activities";
}

function buildContactInsert(contentType: SubmissionContentType, itemId: string, contact: Record<string, unknown>) {
  return {
    content_type: contentType,
    event_id: contentType === "event" ? itemId : null,
    place_id: contentType === "place" ? itemId : null,
    camp_id: contentType === "camp" ? itemId : null,
    activity_id: contentType === "activity" ? itemId : null,
    submitter_name: nullableString(contact.submitter_name) ?? "Nie podano",
    submitter_email: requiredString(contact.submitter_email, "email"),
    submitter_phone: nullableString(contact.submitter_phone),
    organization_name: nullableString(contact.organization_name),
    notes: nullableString(contact.notes),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = asRecord(await request.json());
    const contentType = body.contentType;
    if (!contentType || !["event", "place", "camp", "activity"].includes(String(contentType))) {
      return NextResponse.json({ error: "Nieprawidłowy typ zgłoszenia." }, { status: 400 });
    }

    const payload = buildAdminPayload(contentType as SubmissionContentType, asRecord(body.payload));
    const adminUrl = new URL(getAdminPath(contentType as SubmissionContentType), request.url);

    const adminResponse = await fetch(adminUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const adminJson = await adminResponse.json();
    if (!adminResponse.ok) {
      return NextResponse.json({ error: adminJson?.error ?? "Nie udało się zapisać zgłoszenia." }, { status: adminResponse.status });
    }

    const itemId = typeof adminJson?.id === "string" ? adminJson.id : null;
    let contactSaved = false;

    if (itemId) {
      const db = getDb();
      const { error: contactError } = await db.from("submission_contacts").insert(buildContactInsert(contentType as SubmissionContentType, itemId, asRecord(body.contact)));
      contactSaved = !contactError;
    }

    return NextResponse.json({
      ok: true,
      contactSaved,
      item: adminJson,
      message: "Zgłoszenie zostało zapisane jako szkic i czeka na weryfikację.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się wysłać formularza.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
