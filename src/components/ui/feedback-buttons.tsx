"use client";

import { useState, useEffect, useCallback } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

function getSessionId(): string {
  const key = "rwt_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

interface FeedbackButtonsProps {
  contentType: "event" | "place";
  itemId: string;
  initialLikes: number;
  initialDislikes: number;
}

export function FeedbackButtons({
  contentType,
  itemId,
  initialLikes,
  initialDislikes,
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
    if (vote === type || loading) return;
    setLoading(true);

    // Optimistic update
    const prevVote = vote;
    const prevLikes = likes;
    const prevDislikes = dislikes;

    if (prevVote === "up") setLikes((l) => l - 1);
    if (prevVote === "down") setDislikes((d) => d - 1);
    if (type === "up") setLikes((l) => l + 1);
    if (type === "down") setDislikes((d) => d + 1);
    setVote(type);

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
      if (data.ok && data.changed) {
        setLikes(data.likes);
        setDislikes(data.dislikes);
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
    <div className="flex items-center gap-2">
      <span className="text-[13px] text-muted mr-1">Polecasz?</span>
      <button
        onClick={(e) => { e.preventDefault(); handleVote("up"); }}
        disabled={loading}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-medium border transition-all duration-200",
          vote === "up"
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted border-border hover:border-primary/30 hover:text-foreground"
        )}
      >
        <ThumbsUp size={13} />
        <span>{likes}</span>
      </button>
      <button
        onClick={(e) => { e.preventDefault(); handleVote("down"); }}
        disabled={loading}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-medium border transition-all duration-200",
          vote === "down"
            ? "bg-danger text-white border-danger"
            : "bg-card text-muted border-border hover:border-border hover:text-foreground"
        )}
      >
        <ThumbsDown size={13} />
        <span>{dislikes}</span>
      </button>
    </div>
  );
}
