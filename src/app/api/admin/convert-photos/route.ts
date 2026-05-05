import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

export async function POST() {
  const scriptPath = path.join(process.cwd(), "scripts", "upload_images.py");

  return new Promise<NextResponse>((resolve) => {
    exec(`py "${scriptPath}"`, { cwd: process.cwd(), env: process.env }, (error, stdout, stderr) => {
      if (error) {
        resolve(NextResponse.json({ ok: false, error: stderr || error.message }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ ok: true, output: stdout }));
      }
    });
  });
}
