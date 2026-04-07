import Link from "next/link";
import { CalendarDays, MapPin, Tent } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="container-page py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Przegląd platformy</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/admin/wydarzenia" className="bg-card rounded-xl border border-border p-6 hover:shadow-sm hover:border-stone-300 transition-all">
          <div className="w-9 h-9 rounded-lg text-amber-600 bg-amber-50 flex items-center justify-center mb-3">
            <CalendarDays size={18} />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Wydarzenia</h3>
          <p className="text-sm text-muted">Zarządzaj wydarzeniami i źródłami danych</p>
        </Link>
        <Link href="/admin/miejsca" className="bg-card rounded-xl border border-border p-6 hover:shadow-sm hover:border-stone-300 transition-all">
          <div className="w-9 h-9 rounded-lg text-emerald-600 bg-emerald-50 flex items-center justify-center mb-3">
            <MapPin size={18} />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Miejsca</h3>
          <p className="text-sm text-muted">Zarządzaj ciekawymi miejscami</p>
        </Link>
        <Link href="/admin/kolonie" className="bg-card rounded-xl border border-border p-6 hover:shadow-sm hover:border-stone-300 transition-all">
          <div className="w-9 h-9 rounded-lg text-sky-600 bg-sky-50 flex items-center justify-center mb-3">
            <Tent size={18} />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Kolonie</h3>
          <p className="text-sm text-muted">Importuj i zarządzaj ofertami kolonii</p>
        </Link>
      </div>
    </div>
  );
}
