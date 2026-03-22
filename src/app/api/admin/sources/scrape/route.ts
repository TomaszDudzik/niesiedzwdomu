import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// POST /api/admin/sources/scrape — trigger scraper for a specific source
// Runs the Python pipeline and waits for result (with timeout)
export async function POST(request: NextRequest) {
  const { id, name } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "source id required" }, { status: 400 });
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      "python",
      ["-m", "backend.jobs.run_single_source", id, "--force"],
      {
        cwd: process.cwd(),
        timeout: 300000, // 5 min max
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      },
    );

    const output = (stdout + "\n" + stderr).trim();
    const lines = output.split("\n").filter(Boolean);
    const lastLines = lines.slice(-10).join("\n");

    return NextResponse.json({
      ok: true,
      message: `Scraper zakończony dla: ${name || id}`,
      output: lastLines,
    });
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    const output = ((error.stdout || "") + "\n" + (error.stderr || "")).trim();
    return NextResponse.json({
      error: `Scraper failed: ${error.message || "Unknown error"}`,
      output: output.split("\n").slice(-15).join("\n"),
    }, { status: 500 });
  }
}
