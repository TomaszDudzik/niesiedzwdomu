import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

function quoteArg(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function resolvePythonExecutable() {
  const candidates = [
    path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
    path.join(process.cwd(), "..", ".venv", "Scripts", "python.exe"),
  ];

  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  return executable ? quoteArg(executable) : "python";
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const campId = typeof body?.camp_id === "string" ? body.camp_id.trim() : "";

  if (!id || !campId) {
    return NextResponse.json({ ok: false, error: "id and camp_id are required" }, { status: 400 });
  }

  const scriptPath = path.join(process.cwd(), "scripts", "assign_camp_image.py");
  const pythonExecutable = resolvePythonExecutable();
  const command = `${pythonExecutable} ${quoteArg(scriptPath)} --id ${quoteArg(id)} --camp-id ${quoteArg(campId)}`;

  return new Promise<NextResponse>((resolve) => {
    exec(command, { cwd: process.cwd(), env: process.env }, (error, stdout, stderr) => {
      if (error) {
        resolve(NextResponse.json({ ok: false, error: stderr || error.message }, { status: 500 }));
        return;
      }

      try {
        const payload = JSON.parse(stdout);
        resolve(NextResponse.json(payload));
      } catch {
        resolve(NextResponse.json({ ok: true, output: stdout }));
      }
    });
  });
}