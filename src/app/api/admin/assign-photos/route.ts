import { NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

function resolvePythonExecutable() {
  const candidates = [
    path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
    path.join(process.cwd(), "..", ".venv", "Scripts", "python.exe"),
  ];

  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  return executable ? `"${executable}"` : "python";
}

export async function POST() {
  const scriptPath = path.join(process.cwd(), "scripts", "assign_photos.py");
  const pythonExecutable = resolvePythonExecutable();

  return new Promise<NextResponse>((resolve) => {
    exec(`${pythonExecutable} "${scriptPath}"`, { cwd: process.cwd(), env: process.env }, (error, stdout, stderr) => {
      if (error) {
        resolve(NextResponse.json({ ok: false, error: stderr || error.message }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ ok: true, output: stdout }));
      }
    });
  });
}
