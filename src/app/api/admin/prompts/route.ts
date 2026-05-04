import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PROMPTS_PATH = path.join(process.cwd(), "src", "lib", "prompts.json");

export async function GET() {
  const raw = fs.readFileSync(PROMPTS_PATH, "utf-8");
  return NextResponse.json(JSON.parse(raw));
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!Array.isArray(body) || !body.every((p) => typeof p.label === "string" && typeof p.content === "string")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  fs.writeFileSync(PROMPTS_PATH, JSON.stringify(body, null, 4), "utf-8");
  return NextResponse.json({ ok: true });
}
