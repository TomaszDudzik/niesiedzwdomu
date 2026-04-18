import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { slugify } from "@/lib/utils";

type SubmissionContentType = "event" | "place" | "camp" | "activity";

const DEFAULT_SUBMISSIONS_FROM_EMAIL = "dudziktomasz@googlemail.com";

const SUBMISSION_LABELS: Record<SubmissionContentType, string> = {
  event: "wydarzenie",
  place: "miejsce",
  camp: "kolonię lub półkolonię",
  activity: "zajęcia",
};

function getDb() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !serviceRoleKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY lub SUPABASE_SERVICE_ROLE");
    throw new Error(`Brak konfiguracji Supabase: ustaw ${missing.join(", ")}.`);
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { persistSession: false } },
  );
}

function getSubmissionMailer() {
  const host = process.env.SUBMISSIONS_SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SUBMISSIONS_SMTP_PORT ?? "465");
  const secure = (process.env.SUBMISSIONS_SMTP_SECURE ?? "true").toLowerCase() !== "false";
  const user = process.env.SUBMISSIONS_SMTP_USER ?? DEFAULT_SUBMISSIONS_FROM_EMAIL;
  const pass = process.env.SUBMISSIONS_SMTP_PASS;

  if (!pass) {
    return null;
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    }),
    fromEmail: process.env.SUBMISSIONS_FROM_EMAIL ?? user,
    replyTo: process.env.SUBMISSIONS_REPLY_TO ?? user,
  };
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

function nullableUuid(value: unknown) {
  const normalized = nullableString(value);
  if (!normalized) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized
    : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

    return {
      title,
      slug: buildSlug(title),
      description_short: requiredString(payload.description_short, "krótki opis"),
      description_long: nullableString(payload.description_long) ?? "",
      type_lvl_1_id: nullableUuid(payload.type_lvl_1_id),
      type_lvl_2_id: nullableUuid(payload.type_lvl_2_id),
      category_lvl_1: nullableString(payload.category_lvl_1),
      category_lvl_2: nullableString(payload.category_lvl_2),
      category_lvl_3: nullableString(payload.category_lvl_3),
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
      street: requiredString(payload.street, "ulica wydarzenia"),
      postcode: nullableString(payload.postcode),
      city: nullableString(payload.city) ?? "Kraków",
      note: nullableString(payload.note),
      organizer_id: nullableUuid(payload.organizer_id),
      source_url: nullableString(payload.source_url),
      facebook_url: nullableString(payload.facebook_url),
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
      type_lvl_1_id: nullableUuid(payload.type_lvl_1_id),
      type_lvl_2_id: nullableUuid(payload.type_lvl_2_id),
      category_lvl_1: nullableString(payload.category_lvl_1),
      category_lvl_2: nullableString(payload.category_lvl_2),
      category_lvl_3: nullableString(payload.category_lvl_3),
      street: requiredString(payload.street, "ulica"),
      city: nullableString(payload.city) ?? "Kraków",
      district: normalizeDistrict(payload.district),
      age_min: nullableNumber(payload.age_min),
      age_max: nullableNumber(payload.age_max),
      note: nullableString(payload.note),
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
      type_lvl_1_id: nullableUuid(payload.type_lvl_1_id),
      type_lvl_2_id: nullableUuid(payload.type_lvl_2_id),
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
      district: normalizeDistrict(payload.district),
      street: requiredString(payload.street, "ulica"),
      postcode: nullableString(payload.postcode),
      city: nullableString(payload.city) ?? "Kraków",
      note: nullableString(payload.note),
      organizer_id: nullableUuid(payload.organizer_id),
      source_url: nullableString(payload.source_url),
      facebook_url: nullableString(payload.facebook_url),
      status: "draft",
    };
  }

  const title = requiredString(payload.title, "nazwa zajęć");

  return {
    title,
    description_short: requiredString(payload.description_short, "krótki opis"),
    description_long: nullableString(payload.description_long) ?? "",
    image_url: nullableString(payload.image_url),
    type_lvl_1_id: nullableUuid(payload.type_lvl_1_id),
    type_lvl_2_id: nullableUuid(payload.type_lvl_2_id),
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
    district: normalizeDistrict(payload.district),
    street: requiredString(payload.street, "ulica"),
    postcode: nullableString(payload.postcode),
    city: nullableString(payload.city) ?? "Kraków",
    note: nullableString(payload.note),
    organizer_id: nullableUuid(payload.organizer_id),
    source_url: nullableString(payload.source_url),
    facebook_url: nullableString(payload.facebook_url),
    status: "draft",
  };
}

function getAdminPath(contentType: SubmissionContentType) {
  if (contentType === "event") return "/api/admin/events";
  if (contentType === "place") return "/api/admin/places";
  if (contentType === "camp") return "/api/admin/camps";
  return "/api/admin/activities";
}

async function findTaxonomyIdByName(
  db: ReturnType<typeof getDb>,
  table: "type_lvl_1" | "type_lvl_2",
  name: string,
) {
  const { data, error } = await db
    .from(table)
    .select("id, name")
    .ilike("name", name)
    .limit(1);

  if (error) {
    return null;
  }

  const first = Array.isArray(data) ? data[0] as { id?: unknown } | undefined : undefined;
  return isUuid(first?.id) ? first.id : null;
}

async function applyDefaultTypeIds(
  db: ReturnType<typeof getDb>,
  contentType: SubmissionContentType,
  payload: Record<string, unknown>,
) {
  const currentTypeLevel1 = nullableUuid(payload.type_lvl_1_id);
  const currentTypeLevel2 = nullableUuid(payload.type_lvl_2_id);

  if (currentTypeLevel1 && currentTypeLevel2) {
    return payload;
  }

  const typeLevel1Name = "Dzieci";
  const typeLevel2NameByContentType: Record<SubmissionContentType, string> = {
    place: "Miejsca",
    event: "Wydarzenia",
    camp: "Kolonie",
    activity: "Zajęcia",
  };

  const [defaultTypeLevel1Id, defaultTypeLevel2Id] = await Promise.all([
    currentTypeLevel1 ? Promise.resolve(currentTypeLevel1) : findTaxonomyIdByName(db, "type_lvl_1", typeLevel1Name),
    currentTypeLevel2 ? Promise.resolve(currentTypeLevel2) : findTaxonomyIdByName(db, "type_lvl_2", typeLevel2NameByContentType[contentType]),
  ]);

  return {
    ...payload,
    type_lvl_1_id: defaultTypeLevel1Id,
    type_lvl_2_id: defaultTypeLevel2Id,
  };
}

async function sendSubmissionThankYouEmail(
  contentType: SubmissionContentType,
  payload: Record<string, unknown>,
  contact: Record<string, unknown>,
) {
  const mailer = getSubmissionMailer();
  if (!mailer) {
    return false;
  }

  const recipientEmail = nullableString(contact.submitter_email);
  if (!recipientEmail) {
    return false;
  }

  const submitterName = [nullableString(contact.submitter_first_name), nullableString(contact.submitter_last_name)]
    .filter(Boolean)
    .join(" ") || "Dziękujemy";
  const title = nullableString(payload.title) ?? "Twoje zgłoszenie";
  const submissionLabel = SUBMISSION_LABELS[contentType];
  const organizationName = nullableString(contact.organization_name);

  const subject = `Dziękujemy za zgłoszenie: ${title}`;
  const text = [
    `Cześć ${submitterName},`,
    "",
    `dziękujemy za przesłanie zgłoszenia przez NieSiedzWDomu. Otrzymaliśmy ${submissionLabel} "${title}" i dodaliśmy je do weryfikacji.`,
    "",
    "Teraz sprawdzimy kompletność danych i jeśli wszystko będzie się zgadzało, opublikujemy wpis w serwisie.",
    organizationName ? `Zgłoszona organizacja / marka: ${organizationName}` : null,
    "",
    "Dziękujemy, że pomagasz rozwijać bazę wartościowych miejsc i aktywności dla rodzin.",
    "",
    "Pozdrawiamy,",
    "Zespół NieSiedzWDomu",
  ].filter(Boolean).join("\n");

  const html = `
    <div style="margin:0;padding:32px 16px;background:#f6efe5;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #eadbc8;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px -40px rgba(15,23,42,0.45);">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#0f4c6b 0%,#12708c 55%,#f2b84b 100%);color:#ffffff;">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.16);font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Dziękujemy za zgłoszenie</div>
          <h1 style="margin:16px 0 10px;font-size:30px;line-height:1.15;">Super, mamy to.</h1>
          <p style="margin:0;font-size:16px;line-height:1.6;color:rgba(255,255,255,0.92);">Twoje zgłoszenie trafiło już do kolejki weryfikacji i czeka na nasz przegląd.</p>
        </div>
        <div style="padding:28px 32px;">
          <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Cześć ${submitterName},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;">dziękujemy za przesłanie ${submissionLabel} <strong>${title}</strong> przez formularz NieSiedzWDomu.</p>
          <div style="margin:0 0 18px;padding:18px;border-radius:18px;background:#fff7ed;border:1px solid #fed7aa;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9a3412;">Co dalej</p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#7c2d12;">Sprawdzimy kompletność danych, zweryfikujemy wpis i jeśli wszystko będzie grało, opublikujemy go w serwisie.</p>
          </div>
          ${organizationName ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#475569;"><strong>Organizacja / marka:</strong> ${organizationName}</p>` : ""}
          <p style="margin:0;font-size:15px;line-height:1.7;color:#475569;">Dziękujemy, że pomagasz rozwijać bazę wartościowych miejsc i aktywności dla rodzin.</p>
        </div>
        <div style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.6;color:#64748b;">
          Pozdrawiamy,<br />Zespół NieSiedzWDomu
        </div>
      </div>
    </div>
  `;

  await mailer.transporter.sendMail({
    from: `NieSiedzWDomu <${mailer.fromEmail}>`,
    to: recipientEmail,
    replyTo: mailer.replyTo,
    subject,
    text,
    html,
  });

  return true;
}

async function upsertOrganizerForSubmission(db: ReturnType<typeof getDb>, contact: Record<string, unknown>) {
  const organizerName = requiredString(contact.organization_name, "organizacja / marka");
  const contactFirstName = nullableString(contact.submitter_first_name);
  const contactLastName = nullableString(contact.submitter_last_name);
  const email = nullableString(contact.submitter_email);
  const phone = nullableString(contact.submitter_phone);
  const organizerNote = nullableString(contact.notes);

  const { data: existingOrganizers, error: fetchError } = await db
    .from("organizers")
    .select("id")
    .ilike("organizer_name", organizerName)
    .limit(1);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const existingOrganizer = Array.isArray(existingOrganizers) ? existingOrganizers[0] : null;

  if (existingOrganizer?.id) {
    const patch = {
      contact_first_name: contactFirstName,
      contact_last_name: contactLastName,
      email,
      phone,
      organizer_note: organizerNote,
    };

    const { data: updatedOrganizer, error: updateError } = await db
      .from("organizers")
      .update(patch)
      .eq("id", existingOrganizer.id)
      .select("id")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updatedOrganizer.id as string;
  }

  const { data: newOrganizer, error: insertError } = await db
    .from("organizers")
    .insert({
      organizer_name: organizerName,
      contact_first_name: contactFirstName,
      contact_last_name: contactLastName,
      email,
      phone,
      organizer_note: organizerNote,
      status: "draft",
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return newOrganizer.id as string;
}

export async function POST(request: NextRequest) {
  try {
    const body = asRecord(await request.json());
    const contentType = body.contentType;
    if (!contentType || !["event", "place", "camp", "activity"].includes(String(contentType))) {
      return NextResponse.json({ error: "Nieprawidłowy typ zgłoszenia." }, { status: 400 });
    }

    const db = getDb();
    const basePayload = buildAdminPayload(contentType as SubmissionContentType, asRecord(body.payload)) as Record<string, unknown>;
    const payload = await applyDefaultTypeIds(db, contentType as SubmissionContentType, basePayload);
    const organizerId = await upsertOrganizerForSubmission(db, asRecord(body.contact));
    if (organizerId) {
      payload.organizer_id = organizerId;
    }
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

    const contactSaved = Boolean(organizerId);
    let emailSent = false;

    try {
      emailSent = await sendSubmissionThankYouEmail(contentType as SubmissionContentType, payload, asRecord(body.contact));
    } catch (emailError) {
      console.error("Failed to send submission thank-you email", emailError);
    }

    return NextResponse.json({
      ok: true,
      contactSaved,
      emailSent,
      item: adminJson,
      message: emailSent
        ? "Super, dziękujemy. Zgłoszenie zapisaliśmy do weryfikacji i wysłaliśmy potwierdzenie mailem."
        : "Super, dziękujemy. Zgłoszenie zapisaliśmy do weryfikacji i damy mu zielone światło po sprawdzeniu.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się wysłać formularza.";
    const status = error instanceof Error && error.message.startsWith("Brak konfiguracji Supabase") ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
