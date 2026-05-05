"use client";

type TableName = "camps" | "events" | "activities" | "places";

interface ImageSectionProps {
  imageUrl: string | null;
  imageCover?: string | null;
  imageThumb?: string | null;
  table?: TableName;
  itemId?: string;
}

export function ImageSection({
  imageUrl,
  imageCover,
  imageThumb,
}: ImageSectionProps) {
  const coverSrc = imageCover || imageUrl || "";
  const thumbSrc = imageThumb || coverSrc.replace("-cover.webp", "-thumb.webp") || "";
  const hasThumb = imageThumb || coverSrc.includes("-cover.webp");

  return (
    <div className="rounded-lg border border-border/50 p-3 space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Obrazek</p>

      <div className="grid grid-cols-2 gap-3">
        {/* Cover */}
        <div className="space-y-1">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Cover</p>
          {coverSrc ? (
            <img src={coverSrc} alt="" className="w-full aspect-[3/2] rounded-lg object-cover border border-border" />
          ) : (
            <div className="w-full aspect-[3/2] rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground/30 text-xs">Brak</div>
          )}
        </div>

        {/* Thumb */}
        <div className="space-y-1">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Thumb</p>
          {hasThumb ? (
            <img src={thumbSrc} alt="" className="w-full aspect-[3/2] rounded-lg object-cover border border-border" />
          ) : (
            <div className="w-full aspect-[3/2] rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground/30 text-xs">Brak</div>
          )}
        </div>
      </div>
    </div>
  );
}
