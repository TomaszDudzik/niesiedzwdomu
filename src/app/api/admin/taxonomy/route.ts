import { NextResponse } from "next/server";
import { loadAdminTaxonomy } from "@/lib/admin-taxonomy-server";

export async function GET() {
  const taxonomy = await loadAdminTaxonomy();
  return NextResponse.json(taxonomy);
}