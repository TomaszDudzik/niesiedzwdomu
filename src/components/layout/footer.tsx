import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const FOOTER_SECTIONS = [
  {
    title: "Odkrywaj",
    links: [
      { href: "/miejsca", label: "Miejsca" },
      { href: "/wydarzenia", label: "Wydarzenia" },
      { href: "/kolonie", label: "Kolonie" },
      { href: "/zajecia", label: "Zajęcia" },
    ],
  },
  {
    title: "Przewodniki",
    links: [
      { href: "/co-robic-z-dzieckiem-w-krakowie", label: "Odkryj Kraków z dzieckiem" },
      { href: "/wydarzenia-dla-dzieci-krakow", label: "Wydarzenia dla dzieci Kraków" },
      { href: "/polkolonie-krakow", label: "Półkolonie Kraków" },
      { href: "/place-zabaw-krakow", label: "Place zabaw Kraków" },
    ],
  },
  {
    title: "Informacje",
    links: [
      { href: "/o-nas", label: "O nas" },
      { href: "/misja", label: "Misja" },
      { href: "/kontakt", label: "Napisz do Nas" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-10 border-t border-[#d7cfc4] bg-[#E8DFD2]">
      <div className="container-page py-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-[1.2fr_1fr_1fr_0.9fr] md:gap-4">
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" />
            <p className="mt-2 max-w-[220px] text-[11px] leading-5 text-muted">
              Platforma dla rodziców w Krakowie. Wydarzenia, kolonie i miejsca — wszystko w jednym miejscu.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="text-center">
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{section.title}</h3>
              <ul className="flex flex-col items-center gap-1">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="inline-flex items-center gap-1 text-[11px] text-foreground/70 transition-colors duration-200 hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-1.5 border-t border-primary/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted">
            © {new Date().getFullYear()} niesiedzwdomu. Wszystkie prawa zastrzeżone.
          </p>
          <div className="flex items-center gap-3 text-[11px] text-muted">
            <Link href="/regulamin" className="transition-colors duration-200 hover:text-primary">Regulamin</Link>
            <Link href="/prywatnosc" className="transition-colors duration-200 hover:text-primary">Prywatność</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
