"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Event, EventCategory, ContentStatus, District } from "@/types/database";
import { CATEGORY_LABELS, DISTRICT_LIST } from "@/lib/mock-data";
import { slugify } from "@/lib/utils";

interface AdminEventFormProps {
  event: Event | null;
  onSave: (event: Event) => void;
  onCancel: () => void;
}

const EMPTY_EVENT: Omit<Event, "id" | "created_at" | "updated_at"> = {
  content_type: "event",
  title: "",
  slug: "",
  description_short: "",
  description_long: "",
  image_url: "",
  date_start: new Date().toISOString().split("T")[0],
  date_end: null,
  time_start: "10:00",
  time_end: "12:00",
  age_min: null,
  age_max: null,
  price: null,
  is_free: false,
  category: "inne",
  district: "Stare Miasto",
  venue_name: "",
  venue_address: "",
  lat: null,
  lng: null,
  source_url: null,
  facebook_url: null,
  organizer: null,
  is_featured: false,
  status: "draft",
  likes: 0,
  dislikes: 0,
};

export function AdminEventForm({ event, onSave, onCancel }: AdminEventFormProps) {
  const [form, setForm] = useState(event || { ...EMPTY_EVENT, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Event);

  const update = <K extends keyof Event>(key: K, value: Event[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = {
      ...form,
      slug: form.slug || slugify(form.title),
      updated_at: new Date().toISOString(),
    };
    onSave(saved);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card rounded-2xl border border-border p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          {event ? "Edytuj wydarzenie" : "Nowe wydarzenie"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-muted mb-1.5">
            Tytuł *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => {
              update("title", e.target.value);
              if (!event) update("slug", slugify(e.target.value));
            }}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Nazwa wydarzenia"
          />
        </div>

        {/* Short desc */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-muted mb-1.5">
            Krótki opis *
          </label>
          <textarea
            value={form.description_short}
            onChange={(e) => update("description_short", e.target.value)}
            required
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            placeholder="1-2 zdania"
          />
        </div>

        {/* Long desc */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-muted mb-1.5">
            Pełny opis
          </label>
          <textarea
            value={form.description_long}
            onChange={(e) => update("description_long", e.target.value)}
            rows={5}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            placeholder="Szczegółowy opis..."
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Kategoria
          </label>
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value as EventCategory)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* District */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Dzielnica
          </label>
          <select
            value={form.district}
            onChange={(e) => update("district", e.target.value as District)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {DISTRICT_LIST.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Date start */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Data rozpoczęcia *
          </label>
          <input
            type="date"
            value={form.date_start}
            onChange={(e) => update("date_start", e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Date end */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Data zakończenia
          </label>
          <input
            type="date"
            value={form.date_end || ""}
            onChange={(e) => update("date_end", e.target.value || null)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Time start */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Godzina od
          </label>
          <input
            type="time"
            value={form.time_start || ""}
            onChange={(e) => update("time_start", e.target.value || null)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Time end */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Godzina do
          </label>
          <input
            type="time"
            value={form.time_end || ""}
            onChange={(e) => update("time_end", e.target.value || null)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Age min */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Wiek od
          </label>
          <input
            type="number"
            value={form.age_min ?? ""}
            onChange={(e) =>
              update("age_min", e.target.value ? Number(e.target.value) : null)
            }
            min={0}
            max={18}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="np. 3"
          />
        </div>

        {/* Age max */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Wiek do
          </label>
          <input
            type="number"
            value={form.age_max ?? ""}
            onChange={(e) =>
              update("age_max", e.target.value ? Number(e.target.value) : null)
            }
            min={0}
            max={99}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="np. 10"
          />
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Cena (zł)
          </label>
          <input
            type="number"
            value={form.price ?? ""}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              update("price", val);
              update("is_free", val === null || val === 0);
            }}
            min={0}
            step={0.01}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="0 = bezpłatnie"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value as ContentStatus)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="draft">Szkic</option>
            <option value="published">Opublikowany</option>
            <option value="cancelled">Anulowany</option>
          </select>
        </div>

        {/* Venue name */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Nazwa miejsca *
          </label>
          <input
            type="text"
            value={form.venue_name}
            onChange={(e) => update("venue_name", e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="np. Teatr Groteska"
          />
        </div>

        {/* Venue address */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Adres
          </label>
          <input
            type="text"
            value={form.venue_address}
            onChange={(e) => update("venue_address", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="ul. Skarbowa 2, Kraków"
          />
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            URL zdjęcia
          </label>
          <input
            type="url"
            value={form.image_url || ""}
            onChange={(e) => update("image_url", e.target.value || null)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="https://..."
          />
        </div>

        {/* Source URL */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Link do źródła
          </label>
          <input
            type="url"
            value={form.source_url || ""}
            onChange={(e) => update("source_url", e.target.value || null)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Facebook
          </label>
          <input
            type="url"
            value={form.facebook_url || ""}
            onChange={(e) => update("facebook_url", e.target.value || null)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="https://facebook.com/..."
          />
        </div>

        {/* Organizer */}
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Organizator
          </label>
          <input
            type="text"
            value={form.organizer || ""}
            onChange={(e) => update("organizer", e.target.value || null)}
            className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Nazwa organizatora"
          />
        </div>

        {/* Featured */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_featured"
            checked={form.is_featured}
            onChange={(e) => update("is_featured", e.target.checked)}
            className="rounded border-border"
          />
          <label htmlFor="is_featured" className="text-sm text-foreground">
            Wyróżnione na stronie głównej
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border">
        <button
          type="submit"
          className="px-6 py-2.5 bg-foreground text-white rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          {event ? "Zapisz zmiany" : "Dodaj wydarzenie"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-stone-100 text-foreground rounded-xl text-sm font-medium hover:bg-stone-200 transition-colors"
        >
          Anuluj
        </button>
      </div>
    </form>
  );
}
