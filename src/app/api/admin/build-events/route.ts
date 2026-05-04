import { NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const NEW_EVENTS_JSON = path.join(process.cwd(), "events_new.json");

export async function POST() {
  const scriptPath = path.join(process.cwd(), "scripts", "build_events_dataframe.py");

  return new Promise<NextResponse>((resolve) => {
    exec(`python "${scriptPath}"`, { cwd: process.cwd(), env: process.env }, (error, stdout, stderr) => {
      if (error) {
        resolve(NextResponse.json({ ok: false, error: stderr || error.message }, { status: 500 }));
        return;
      }

      let newEvents: { event_id: string; title: string; image_prompt: string }[] = [];
      try {
        const raw = fs.readFileSync(NEW_EVENTS_JSON, "utf-8");
        newEvents = JSON.parse(raw);
      } catch { /* JSON missing — return empty list */ }

      resolve(NextResponse.json({ ok: true, output: stdout, newEvents }));
    });
  });
}
