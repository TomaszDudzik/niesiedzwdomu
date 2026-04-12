"use client";

import { useState, useEffect, useCallback } from "react";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

let inMemorySessionId: string | null = null;

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `rwt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getSessionId(): string {
  const key = "rwt_session_id";
  if (inMemorySessionId) return inMemorySessionId;

  try {
    const storage = window.localStorage;
    let id = storage.getItem(key);
    if (!id) {
      id = createSessionId();
      storage.setItem(key, id);
    }
    inMemorySessionId = id;
    return id;
  } catch {
    const fallback = createSessionId();
    inMemorySessionId = fallback;
    return fallback;
  }
}

interface FeedbackButtonsProps {
  contentType: "event" | "place" | "camp";
  itemId: string;
  initialLikes: number;
  initialDislikes: number;
  className?: string;
  showLabel?: boolean;
}

export function FeedbackButtons({
  contentType,
  itemId,
  initialLikes,
  initialDislikes,
  className,
  showLabel = true,
}: FeedbackButtonsProps) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [loading, setLoading] = useState(false);

  // Load existing vote from API
  useEffect(() => {
    const sessionId = getSessionId();
    fetch(`/api/feedback?content_type=${contentType}&item_id=${itemId}&session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.vote) setVote(data.vote);
      })
      .catch(() => {});
  }, [contentType, itemId]);

  const handleVote = useCallback(async (type: "up" | "down") => {
    if (loading) return;
    setLoading(true);

    // Optimistic update
    const prevVote = vote;
    const prevLikes = likes;
    const prevDislikes = dislikes;

    const removingSameVote = prevVote === type;

    if (prevVote === "up") setLikes((l) => Math.max(0, l - 1));
    if (prevVote === "down") setDislikes((d) => Math.max(0, d - 1));
    if (!removingSameVote && type === "up") setLikes((l) => l + 1);
    if (!removingSameVote && type === "down") setDislikes((d) => d + 1);
    setVote(removingSameVote ? null : type);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: contentType,
          item_id: itemId,
          is_positive: type === "up",
          session_id: getSessionId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVote(prevVote);
        setLikes(prevLikes);
        setDislikes(prevDislikes);
      } else if (data.ok && data.changed) {
        setLikes(data.likes);
        setDislikes(data.dislikes);
        setVote(data.removed ? null : type);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("rwt:likes-updated", {
            detail: {
              contentType,
              itemId,
              likes: data.likes,
            },
          }));
        }
      }
    } catch {
      // Revert on error
      setVote(prevVote);
      setLikes(prevLikes);
      setDislikes(prevDislikes);
    }
    setLoading(false);
  }, [vote, likes, dislikes, loading, contentType, itemId]);

  return (
    <div className={cn("relative z-10 flex items-center gap-2", className)}>
      {showLabel && <span className="text-[13px] text-muted mr-1">Polecasz?</span>}
      <button
        type="button"
        onClick={() => handleVote("up")}
        disabled={loading}
        className={cn(
          "touch-manipulation min-h-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all duration-200 shadow-[var(--shadow-soft)] active:scale-[0.98]",
          vote === "up"
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted border-border hover:border-primary/30 hover:text-foreground"
        )}
      >
        <ThumbsUp size={13} />
        <span>{likes}</span>
      </button>
    </div>
  );
}
