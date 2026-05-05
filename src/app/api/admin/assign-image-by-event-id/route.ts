import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";

function quoteArg(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const eventId = typeof body?.event_id === "string" ? body.event_id.trim() : "";

  if (!id || !eventId) {
    return NextResponse.json({ ok: false, error: "id and event_id are required" }, { status: 400 });
  }

  const scriptPath = path.join(process.cwd(), "scripts", "assign_event_image.py");
  const command = `python ${quoteArg(scriptPath)} --id ${quoteArg(id)} --event-id ${quoteArg(eventId)}`;

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
