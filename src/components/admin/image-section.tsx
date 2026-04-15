"use client";

import { useState } from "react";
import { ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

const inputClass = "w-full px-2 py-1.5 rounded-md border border-border text-[12px] bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30";
const btnClass = "inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded hover:text-foreground hover:border-primary/30 transition-colors";

type TableName = "camps" | "events" | "activities" | "places";

interface ImageSectionProps {
  imageUrl: string | null;
  imageThumb?: string | null;
  pendingPreview: string | null;
  onFileSelect: (file: File) => void;
  onClearPending: () => void;
  table: TableName;
  itemId: string;
  typeLvl1Id?: string | null;
  typeLvl2Id?: string | null;
  categoryLvl1: string | null;
  categoryLvl2: string | null;
  categoryLvl3: string | null;
  onRandomPhoto: (imageUrl: string, thumbUrl: string | null) => void;
}

export function ImageSection({
  imageUrl,
  imageThumb,
  pendingPreview,
  onFileSelect,
  onClearPending,
  table,
  itemId,
  typeLvl1Id,
  typeLvl2Id,
  categoryLvl1,
  categoryLvl2,
  categoryLvl3,
  onRandomPhoto,
}: ImageSectionProps) {
  const [pendingThumbFile, setPendingThumbFile] = useState<File | null>(null);
  const [pendingThumbPreview, setPendingThumbPreview] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const hasThumb = pendingThumbPreview || imageThumb || imageUrl?.includes("-cover.webp");
  const thumbSrc = pendingThumbPreview || imageThumb || imageUrl?.replace("-cover.webp", "-thumb.webp") || "";

  const handleThumbSelect = (file: File) => {
    if (pendingThumbPreview) URL.revokeObjectURL(pendingThumbPreview);
    setPendingThumbFile(file);
    setPendingThumbPreview(URL.createObjectURL(file));
  };

  const clearThumb = () => {
    if (pendingThumbPreview) URL.revokeObjectURL(pendingThumbPreview);
    setPendingThumbFile(null);
    setPendingThumbPreview(null);
  };

  const uploadThumb = async () => {
    if (!pendingThumbFile) return;
    setUploadingThumb(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingThumbFile);
      formData.append("id", itemId);
      formData.append("target", table);
      formData.append("variant", "thumb");
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (data.image_url) {
        onRandomPhoto(imageUrl || "", data.image_url);
        clearThumb();
      } else {
        alert(data.error || "Błąd wgrywania thumb");
      }
    } catch {
      alert("Błąd połączenia");
    }
    setUploadingThumb(false);
  };

  const handleRandomPhoto = async () => {
    if (!categoryLvl1) {
      alert("Ustaw category lvl 1");
      return;
    }
    try {
      const res = await fetch("/api/admin/random-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: itemId,
          type_lvl_1_id: typeLvl1Id,
          type_lvl_2_id: typeLvl2Id,
          category_lvl_1: categoryLvl1,
          category_lvl_2: categoryLvl2,
          category_lvl_3: categoryLvl3,
          table,
        }),
      });
      const data = await res.json();
      if (data.image_url) {
        onRandomPhoto(data.image_url, data.thumb_url);
      } else {
        alert(data.error || "Brak zdjęć w tej kategorii");
      }
    } catch {
      alert("Błąd połączenia");
    }
  };

  return (
    <div className="rounded-lg border border-border/50 p-3 space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Obrazek</p>

      <div className="grid grid-cols-2 gap-3">
        {/* Cover */}
        <div className="space-y-2">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Cover</p>
          {(pendingPreview || imageUrl) ? (
            <div className="relative">
              <img
                src={pendingPreview || imageUrl || ""}
                alt=""
                className={cn("w-full aspect-[3/2] rounded-lg object-cover border border-border", pendingPreview && "ring-2 ring-primary/40")}
              />
              {pendingPreview && (
                <button onClick={onClearPending} className="absolute top-1.5 right-1.5 bg-white rounded-full shadow-sm border border-border p-0.5 hover:bg-red-50 transition-colors" title="Usuń">
                  <X size={12} className="text-red-500" />
                </button>
              )}
            </div>
          ) : (
            <div className="w-full aspect-[3/2] rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground/30 text-xs">Brak</div>
          )}
          <label className={cn(btnClass, "cursor-pointer")}>
            <ImagePlus size={11} />
            {pendingPreview ? "Zmień" : "Wgraj cover"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = ""; }} />
          </label>
          {pendingPreview && <p className="text-[10px] text-primary font-medium">Zapisz aby wgrać</p>}
        </div>

        {/* Thumb */}
        <div className="space-y-2">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Thumb</p>
          {(pendingThumbPreview || hasThumb) ? (
            <div className="relative">
              <img
                src={pendingThumbPreview || thumbSrc}
                alt=""
                className={cn("w-full aspect-[3/2] rounded-lg object-cover border border-border", pendingThumbPreview && "ring-2 ring-primary/40")}
              />
              {pendingThumbPreview && (
                <button onClick={clearThumb} className="absolute top-1.5 right-1.5 bg-white rounded-full shadow-sm border border-border p-0.5 hover:bg-red-50 transition-colors" title="Usuń">
                  <X size={12} className="text-red-500" />
                </button>
              )}
            </div>
          ) : (
            <div className="w-full aspect-[3/2] rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground/30 text-xs">Brak</div>
          )}
          <div className="flex gap-1.5">
            <label className={cn(btnClass, "cursor-pointer")}>
              <ImagePlus size={11} />
              {pendingThumbPreview ? "Zmień" : "Wgraj thumb"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbSelect(f); e.target.value = ""; }} />
            </label>
            {pendingThumbPreview && (
              <button onClick={uploadThumb} disabled={uploadingThumb} className={cn(btnClass, "bg-foreground text-white hover:bg-[#333]")}>
                {uploadingThumb ? <Loader2 size={11} className="animate-spin" /> : "Zapisz thumb"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Random photo */}
      <button onClick={handleRandomPhoto} className={btnClass}>
        <RefreshCw size={11} />
        Random foto (cover + thumb)
      </button>

    </div>
  );
}
