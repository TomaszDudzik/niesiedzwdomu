"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackButtonsProps {
  eventId: string;
  initialLikes: number;
  initialDislikes: number;
}

export function FeedbackButtons({
  eventId,
  initialLikes,
  initialDislikes,
}: FeedbackButtonsProps) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);

  useEffect(() => {
    const stored = localStorage.getItem(`rwt_vote_${eventId}`);
    if (stored === "up" || stored === "down") setVote(stored);
  }, [eventId]);

  const handleVote = (type: "up" | "down") => {
    if (vote === type) return;
    if (vote === "up") setLikes((l) => l - 1);
    if (vote === "down") setDislikes((d) => d - 1);
    if (type === "up") setLikes((l) => l + 1);
    if (type === "down") setDislikes((d) => d + 1);
    setVote(type);
    localStorage.setItem(`rwt_vote_${eventId}`, type);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] text-muted mr-1">Polecasz?</span>
      <button
        onClick={() => handleVote("up")}
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
        onClick={() => handleVote("down")}
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
