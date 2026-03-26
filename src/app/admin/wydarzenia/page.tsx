"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Star, RefreshCw, ImagePlus, Loader2 } from "lucide-react";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/mock-data";
import { formatDateShort, formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Event } from "@/types/database";
import { AdminEventForm } from "@/components/admin/event-form";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/events");
    const data = await res.json();
    setEvents(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleSave = async (event: Event) => {
    // Strip client-only fields before sending to API
    const { content_type, ...dbFields } = event as Event & { content_type?: string };

    if (editingEvent) {
      // Update existing event
      const { id, created_at, updated_at, likes, dislikes, ...updates } = dbFields;
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Błąd: ${data.error}`);
        return;
      }
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? event : e))
      );
    } else {
      // Create new event — remove id so Supabase generates one
      const { id, created_at, updated_at, likes, dislikes, ...insertData } = dbFields;
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(insertData),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Błąd: ${data.error}`);
        return;
      }
      // Refresh the full list to get the server-generated id
      await fetchEvents();
    }
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Na pewno chcesz usunąć to wydarzenie?")) {
      await fetch("/api/admin/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const toggleStatus = async (id: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;
    const newStatus = event.status === "published" ? "draft" : "published";
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(`Błąd: ${data.error}`);
      return;
    }
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: newStatus } : e
      )
    );
  };

  const toggleFeatured = async (id: string) => {
    const event = events.find((e) => e.id === id);
    if (!event) return;
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_featured: !event.is_featured }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(`Błąd: ${data.error}`);
      return;
    }
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, is_featured: !e.is_featured } : e
      )
    );
  };

  const generateImage = async (event: Event) => {
    setGeneratingImage(event.id);
    try {
      const res = await fetch("/api/admin/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: event.id,
          title: event.title,
          description: event.description_short,
          category: event.category,
        }),
      });
      const data = await res.json();
      if (data.image_url) {
        const bustUrl = `${data.image_url.split("?")[0]}?t=${Date.now()}`;
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id ? { ...e, image_url: bustUrl } : e
          )
        );
      } else {
        alert(`Błąd: ${data.error || "Nie udało się wygenerować obrazka"}`);
      }
    } catch {
      alert("Błąd połączenia z serwerem");
    }
    setGeneratingImage(null);
  };

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wydarzenia</h1>
          <p className="text-sm text-muted mt-1">
            {loading ? "Ładowanie..." : `${events.length} wydarzeń w bazie`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchEvents}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-muted border border-border rounded-xl hover:border-[#CCC] transition-colors"
          >
            <RefreshCw size={14} /> Odśwież
          </button>
          <button
            onClick={() => {
              setEditingEvent(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-white rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            <Plus size={16} />
            Dodaj wydarzenie
          </button>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="mb-8">
          <AdminEventForm
            event={editingEvent}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingEvent(null);
            }}
          />
        </div>
      )}

      {/* Events table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-stone-50/50">
                <th className="text-left px-5 py-3 font-medium text-muted">
                  Wydarzenie
                </th>
                <th className="text-left px-5 py-3 font-medium text-muted hidden md:table-cell">
                  Data
                </th>
                <th className="text-left px-5 py-3 font-medium text-muted hidden lg:table-cell">
                  Cena
                </th>
                <th className="text-left px-5 py-3 font-medium text-muted hidden md:table-cell">
                  Status
                </th>
                <th className="text-right px-5 py-3 font-medium text-muted">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="border-b border-border/50 last:border-0 hover:bg-stone-50/50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail or placeholder */}
                      {event.image_url ? (
                        <img
                          src={event.image_url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <span className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-lg shrink-0">
                          {CATEGORY_ICONS[event.category]}
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-foreground line-clamp-1">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          {CATEGORY_LABELS[event.category]} · {event.district}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-muted">
                    {formatDateShort(event.date_start)}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-muted">
                    {formatPrice(event.price)}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span
                      className={cn(
                        "inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium",
                        event.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : event.status === "draft"
                            ? "bg-stone-100 text-stone-600"
                            : "bg-red-50 text-red-700"
                      )}
                    >
                      {event.status === "published"
                        ? "Opublikowane"
                        : event.status === "draft"
                          ? "Szkic"
                          : "Anulowane"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {/* Generate image button */}
                      <button
                        onClick={() => generateImage(event)}
                        disabled={generatingImage === event.id}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          event.image_url
                            ? "text-muted-foreground hover:bg-stone-100"
                            : "text-blue-500 hover:bg-blue-50"
                        )}
                        title={event.image_url ? "Wygeneruj nowy obrazek" : "Wygeneruj obrazek"}
                      >
                        {generatingImage === event.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <ImagePlus size={15} />
                        )}
                      </button>
                      <button
                        onClick={() => toggleFeatured(event.id)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          event.is_featured
                            ? "text-amber-500 hover:bg-amber-50"
                            : "text-muted-foreground hover:bg-stone-100"
                        )}
                        title="Wyróżnij"
                      >
                        <Star
                          size={15}
                          fill={event.is_featured ? "currentColor" : "none"}
                        />
                      </button>
                      <button
                        onClick={() => toggleStatus(event.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-stone-100 transition-colors"
                        title={
                          event.status === "published"
                            ? "Ukryj"
                            : "Opublikuj"
                        }
                      >
                        {event.status === "published" ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingEvent(event);
                          setShowForm(true);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-stone-100 transition-colors"
                        title="Edytuj"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Usuń"
                      >
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
