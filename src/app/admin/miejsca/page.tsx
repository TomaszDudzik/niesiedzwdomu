"use client";

import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { mockPlaces, PLACE_TYPE_LABELS, PLACE_TYPE_ICONS } from "@/lib/mock-data";
import { formatPrice, cn } from "@/lib/utils";
import type { Place } from "@/types/database";

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<Place[]>(mockPlaces);

  const handleDelete = (id: string) => {
    if (confirm("Na pewno chcesz usunąć?")) setPlaces((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleStatus = (id: string) => {
    setPlaces((prev) => prev.map((p) => p.id === id ? { ...p, status: p.status === "published" ? "draft" : "published" } : p));
  };

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Miejsca</h1>
          <p className="text-sm text-muted mt-1">{places.length} miejsc</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-white rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors">
          <Plus size={16} /> Dodaj
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-stone-50/50">
                <th className="text-left px-5 py-3 font-medium text-muted">Nazwa</th>
                <th className="text-left px-5 py-3 font-medium text-muted hidden md:table-cell">Typ</th>
                <th className="text-left px-5 py-3 font-medium text-muted hidden lg:table-cell">Cena</th>
                <th className="text-left px-5 py-3 font-medium text-muted hidden md:table-cell">Status</th>
                <th className="text-right px-5 py-3 font-medium text-muted">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {places.map((place) => (
                <tr key={place.id} className="border-b border-border/50 last:border-0 hover:bg-stone-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{PLACE_TYPE_ICONS[place.place_type]}</span>
                      <div>
                        <p className="font-medium text-foreground line-clamp-1">{place.title}</p>
                        <p className="text-xs text-muted mt-0.5">{place.district} · {place.is_indoor ? "Wewnątrz" : "Na zewnątrz"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-muted">{PLACE_TYPE_LABELS[place.place_type]}</td>
                  <td className="px-5 py-4 hidden lg:table-cell text-muted">{formatPrice(place.price)}</td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium",
                      place.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600")}>
                      {place.status === "published" ? "Opublikowane" : "Szkic"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => toggleStatus(place.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-stone-100 transition-colors">
                        {place.status === "published" ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button onClick={() => handleDelete(place.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
