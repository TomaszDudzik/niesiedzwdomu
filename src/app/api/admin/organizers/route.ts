import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const ALLOWED_FIELDS = new Set([
  "organizer_name",
  "company_name",
  "email",
  "phone",
  "street",
  "postcode",
  "city",
  "note",
  "status",
]);

function pickFields(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([k, v]) => ALLOWED_FIELDS.has(k) && v !== undefined)
  );
}

function validateEmail(email: string | undefined | null): boolean {
  if (!email) return true;
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
}

function validatePhone(phone: string | undefined | null): boolean {
  if (!phone) return true;
  const phoneRegex = /^\+48[0-9]{9}$/;
  return phoneRegex.test(phone);
}

function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return phone;
  // Usunąć spacje i znaki specjalne z wyjątkiem +
  let cleaned = phone.replace(/[\s\-().]/g, "");
  // Jeśli zaczyna się od 0, zamień na +48
  if (cleaned.startsWith("0")) {
    cleaned = "+48" + cleaned.substring(1);
  }
  // Jeśli nie zaczyna się od +48, dodaj
  if (!cleaned.startsWith("+48")) {
    cleaned = "+48" + cleaned;
  }
  return cleaned;
}

export async function GET(request: NextRequest) {
  const db = getDb();
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  
  let query = db.from("organizers").select("*");
  
  if (status === "published") {
    query = query.eq("status", "published");
  }
  
  const { data, error } = await query.order("organizer_name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const payload = pickFields(body);
  
  if (!payload.organizer_name || String(payload.organizer_name).trim().length === 0) {
    return NextResponse.json({ error: "organizer_name required" }, { status: 400 });
  }
  
  if (payload.email && !validateEmail(payload.email as string)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }
  
  if (payload.phone) {
    const phone = payload.phone as string;
    if (!validatePhone(phone)) {
      return NextResponse.json({ error: "Phone must be in format +48XXXXXXXXX" }, { status: 400 });
    }
    payload.phone = normalizePhone(phone);
  }
  
  if (!payload.status) payload.status = "draft";
  if (!payload.city) payload.city = "Kraków";

  const { data, error } = await db
    .from("organizers")
    .insert(payload)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/admin/organizatorzy");
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const db = getDb();
  const body = (await request.json()) as Record<string, unknown>;
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch = pickFields(updates);
  
  if ("organizer_name" in patch && (!patch.organizer_name || String(patch.organizer_name).trim().length === 0)) {
    return NextResponse.json({ error: "organizer_name required" }, { status: 400 });
  }
  
  if (patch.email && !validateEmail(patch.email as string)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }
  
  if (patch.phone) {
    const phone = patch.phone as string;
    if (!validatePhone(phone)) {
      return NextResponse.json({ error: "Phone must be in format +48XXXXXXXXX" }, { status: 400 });
    }
    patch.phone = normalizePhone(phone);
  }
  
  const { data, error } = await db
    .from("organizers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/organizatorzy");
  return NextResponse.json({ ok: true, updated: data });
}

export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await db.from("organizers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/admin/organizatorzy");
  return NextResponse.json({ ok: true });
}
