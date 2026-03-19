"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { mockEvents, CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/mock-data";
import { formatDateShort, formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Event } from "@/types/database";
import { AdminEventForm } from "@/components/admin/event-form";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSave = (event: Event) => {
    if (editingEvent) {
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? event : e))
      );
    } else {
      setEvents((prev) => [event, ...prev]);
    }
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Na pewno chcesz usunąć to wydarzenie?")) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const toggleStatus = (id: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, status: e.status === "published" ? "draft" : "published" }
          : e
      )
    );
  };

  const toggleFeatured = (id: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, is_featured: !e.is_featured } : e
      )
    );
  };

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wydarzenia</h1>
          <p className="text-sm text-muted mt-1">
            {events.length} wydarzeń łącznie
          </p>
        </div>
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
                      <span className="text-lg">
                        {CATEGORY_ICONS[event.category]}
                      </span>
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
