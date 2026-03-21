import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

const SCENE_SYSTEM_PROMPT = `You are a visual scene designer for a family events website in Kraków, Poland.

Given an event title and description, create a short (2-3 sentences) visual scene description for an illustrator. Focus on:
- What specific activity or moment to depict (derived from the event content)
- The setting/environment (indoor/outdoor, what kind of space)
- The mood and atmosphere

Rules:
- Be SPECIFIC to this particular event — no generic scenes
- Focus on the unique aspect that makes this event different from others
- Include Kraków elements if relevant (architecture, parks, landmarks)
- Describe people doing the activity, not standing around
- No text, logos, or branding in the scene
- Suitable for families — warm, inviting, not childish`;

const DALLE_STYLE =
  "Modern editorial illustration style, slightly textured, warm color palette. " +
  "No text or letters anywhere in the image. " +
  "Clean composition suitable for a website card thumbnail. " +
  "16:9 aspect ratio. Soft natural lighting.";

// POST /api/admin/generate-image
// Body: { id, title, description, category }
export async function POST(request: NextRequest) {
  const db = getDb();
  const { id, title, description, category } = await request.json();

  if (!id || !title) {
    return NextResponse.json({ error: "id and title required" }, { status: 400 });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    // Step 1: GPT creates a specific scene from event data
    const sceneInput = `Event: ${title}\nCategory: ${category || "inne"}${description ? `\nDescription: ${description.slice(0, 300)}` : ""}`;

    const sceneResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SCENE_SYSTEM_PROMPT },
        { role: "user", content: sceneInput },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const scene = sceneResponse.choices[0].message.content || `A family event: ${title}`;

    // Step 2: DALL-E generates from the specific scene
    const dallePrompt = `${scene}\n\nStyle: ${DALLE_STYLE}`;

    const generation = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1792x1024",
      quality: "standard",
    });

    const tempUrl = generation.data?.[0]?.url;
    if (!tempUrl) {
      return NextResponse.json({ error: "No image URL returned" }, { status: 500 });
    }

    // Step 3: Download the image
    const imageResp = await fetch(tempUrl);
    if (!imageResp.ok) {
      return NextResponse.json({ error: "Failed to download generated image" }, { status: 500 });
    }
    const imageBuffer = Buffer.from(await imageResp.arrayBuffer());
    const contentType = imageResp.headers.get("content-type") || "image/png";
    const ext = contentType.includes("jpeg") ? "jpg" : "png";
    const filePath = `events/${id}.${ext}`;

    // Step 4: Upload to Supabase Storage
    await db.storage.from("event-images").remove([`events/${id}.png`, `events/${id}.jpg`]);

    const { error: uploadErr } = await db.storage
      .from("event-images")
      .upload(filePath, imageBuffer, { contentType, upsert: true });

    if (uploadErr) {
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    // Step 5: Get public URL and update event
    const { data: urlData } = db.storage.from("event-images").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    const { error: updateErr } = await db
      .from("events")
      .update({ image_url: publicUrl })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: `DB update failed: ${updateErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, image_url: publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
