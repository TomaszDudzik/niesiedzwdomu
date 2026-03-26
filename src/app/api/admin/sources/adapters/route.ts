import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// GET /api/admin/sources/adapters — list registered adapter names
export async function GET() {
  try {
    const { stdout } = await execFileAsync(
      "python",
      ["-c", "from backend.ingest.registry import load_adapters, list_adapters; load_adapters(); print(','.join(list_adapters()))"],
      {
        cwd: process.cwd(),
        timeout: 15000,
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      },
    );

    const names = stdout.trim().split(",").filter(Boolean);
    return NextResponse.json({ adapters: names });
  } catch {
    // Fallback: return hardcoded list if Python fails
    return NextResponse.json({ adapters: ["biletyna", "ck_podgorza"] });
  }
}
