import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// POST /api/admin/generate-image
// Body: { id, title, description?, category?, target? }
// Delegates to Python backend for prompt logic + DALL-E generation + upload
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.id || !body.title) {
    return NextResponse.json({ error: "id and title required" }, { status: 400 });
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      "python",
      ["-m", "backend.jobs.generate_image", JSON.stringify(body)],
      {
        cwd: process.cwd(),
        timeout: 300000, // 5 min max (gpt-image-1 can take ~2 min)
        maxBuffer: 10 * 1024 * 1024, // 10 MB (base64 images are ~3 MB)
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      },
    );

    if (stderr) {
      console.log("[generate-image] Python logs:", stderr.slice(-500));
    }

    const result = JSON.parse(stdout.trim());
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    const logs = ((error.stdout || "") + "\n" + (error.stderr || "")).trim();
    console.error("[generate-image] Error:", error.message, "\n", logs.slice(-500));
    return NextResponse.json(
      { error: `Image generation failed: ${error.message || "Unknown error"}` },
      { status: 500 },
    );
  }
}
