import Link from "next/link";
import { CalendarDays, FileText, ThumbsUp, MapPin, Tent } from "lucide-react";
import { mockEvents, mockCamps, mockPlaces } from "@/lib/mock-data";

export default function AdminDashboard() {
  const stats = [
    { label: "Wydarzenia", value: mockEvents.length, icon: CalendarDays, color: "text-amber-600 bg-amber-50", href: "/admin/wydarzenia" },
    { label: "Kolonie", value: mockCamps.length, icon: Tent, color: "text-blue-600 bg-blue-50", href: "/admin/kolonie" },
    { label: "Miejsca", value: mockPlaces.length, icon: MapPin, color: "text-emerald-600 bg-emerald-50", href: "/admin/miejsca" },
    { label: "Polecenia", value: [...mockEvents, ...mockCamps, ...mockPlaces].reduce((s, i) => s + i.likes, 0), icon: ThumbsUp, color: "text-purple-600 bg-purple-50", href: "/admin" },
  ];

  return (
    <div className="container-page py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Przegląd platformy</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-all">
            <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/admin/wydarzenia" className="bg-card rounded-xl border border-border p-6 hover:shadow-sm hover:border-stone-300 transition-all">
          <h3 className="font-semibold text-foreground mb-1">Wydarzenia</h3>
          <p className="text-sm text-muted">Zarządzaj wydarzeniami</p>
        </Link>
        <Link href="/admin/kolonie" className="bg-card rounded-xl border border-border p-6 hover:shadow-sm hover:border-stone-300 transition-all">
          <h3 className="font-semibold text-foreground mb-1">Kolonie</h3>
          <p className="text-sm text-muted">Zarządzaj koloniami</p>
        </Link>
        <Link href="/admin/miejsca" className="bg-card rounded-xl border border-border p-6 hover:shadow-sm hover:border-stone-300 transition-all">
          <h3 className="font-semibold text-foreground mb-1">Miejsca</h3>
          <p className="text-sm text-muted">Zarządzaj miejscami</p>
        </Link>
      </div>
    </div>
  );
}
