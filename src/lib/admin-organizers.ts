import type { Organizer } from "@/types/database";

function normalizeOrganizerName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function findOrganizerByName(organizers: Organizer[], organizerName: string | null | undefined) {
  if (!organizerName) return null;

  const normalized = normalizeOrganizerName(organizerName);
  if (!normalized) return null;

  return organizers.find((organizer) => normalizeOrganizerName(organizer.organizer_name) === normalized) ?? null;
}

interface EnsureOrganizerIdOptions {
  organizers: Organizer[];
  organizerId?: string | null;
  organizerName?: string | null;
  city?: string | null;
  onOrganizerCreated?: (organizer: Organizer) => void;
}

export async function ensureOrganizerId({
  organizers,
  organizerId,
  organizerName,
  city,
  onOrganizerCreated,
}: EnsureOrganizerIdOptions) {
  if (organizerId) return organizerId;

  const trimmedName = organizerName?.trim() ?? "";
  if (!trimmedName) return null;

  const matchedOrganizer = findOrganizerByName(organizers, trimmedName);
  if (matchedOrganizer?.id) return matchedOrganizer.id;

  const response = await fetch("/api/admin/organizers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      organizer_name: trimmedName,
      city: city?.trim() || "Kraków",
      status: "draft",
    }),
  });

  const data = await response.json().catch(() => null) as Organizer | { error?: string } | null;
  if (!response.ok || !data || typeof data !== "object" || !("id" in data)) {
    throw new Error(data && "error" in data && typeof data.error === "string" ? data.error : "Nie udało się utworzyć organizatora.");
  }

  onOrganizerCreated?.(data);
  return data.id;
}