import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — niesiedzwdomu",
  robots: "noindex, nofollow",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[60vh]">
      <div className="bg-stone-900 text-white">
        <div className="container-page py-3 flex items-center justify-between">
          <span className="text-sm font-medium">Panel administracyjny</span>
          <div className="flex gap-4 text-xs text-stone-400">
            <a href="/admin/miejsca" className="hover:text-white transition-colors">Miejsca</a>
            <a href="/admin/wydarzenia" className="hover:text-white transition-colors">Wydarzenia</a>
            <a href="/admin/kolonie" className="hover:text-white transition-colors">Kolonie</a>
            <a href="/admin/zajecia" className="hover:text-white transition-colors">Zajęcia</a>
            <a href="/admin/organizatorzy" className="hover:text-white transition-colors">Organizatorzy</a>
            <a href="/" className="hover:text-white transition-colors">← Wróć</a>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
