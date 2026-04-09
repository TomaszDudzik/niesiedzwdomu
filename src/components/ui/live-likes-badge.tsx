"use client";

import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";

interface LiveLikesBadgeProps {
  contentType: "event" | "place";
  itemId: string;
  initialLikes: number;
  className?: string;
}

type LikesUpdatedDetail = {
  contentType: "event" | "place";
  itemId: string;
  likes: number;
};

export function LiveLikesBadge({ contentType, itemId, initialLikes, className }: LiveLikesBadgeProps) {
  const [likes, setLikes] = useState(initialLikes);

  useEffect(() => {
    setLikes(initialLikes);
  }, [initialLikes]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<LikesUpdatedDetail>;
      if (!customEvent.detail) return;
      if (customEvent.detail.contentType !== contentType) return;
      if (customEvent.detail.itemId !== itemId) return;
      setLikes(customEvent.detail.likes);
    };

    window.addEventListener("rwt:likes-updated", onUpdated as EventListener);
    return () => window.removeEventListener("rwt:likes-updated", onUpdated as EventListener);
  }, [contentType, itemId]);

  return (
    <span className={className || "absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-[var(--shadow-soft)] border border-border/70"}>
      <ThumbsUp size={13} className="text-primary" />
      {likes}
    </span>
  );
}
