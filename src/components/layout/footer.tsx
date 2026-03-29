import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const FOOTER_SECTIONS = [
  {
    title: "Odkrywaj",
    links: [
      { href: "/wydarzenia", label: "Wydarzenia" },
      { href: "/kolonie", label: "Kolonie", comingSoon: true },
      { href: "/miejsca", label: "Miejsca", comingSoon: true },
      { href: "/zajecia", label: "Zajęcia", comingSoon: true },
      { href: "/kalendarz", label: "Kalendarz" },
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
      { href: "/kontakt", label: "Kontakt" },
      { href: "/kontakt", label: "Napisz do nas" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border mt-24 bg-accent/50">
      <div className="container-page py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" />
            <p className="text-[13px] text-muted mt-2 leading-relaxed max-w-[220px]">
              Platforma dla rodziców w Krakowie. Wydarzenia, kolonie i miejsca — wszystko w jednym miejscu.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wide mb-3">{section.title}</h3>
              <ul className="flex flex-col gap-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-primary transition-colors duration-200">
                      {link.label}
                      {"comingSoon" in link && link.comingSoon && (
                        <span className="text-[10px] text-muted-foreground/50">·&nbsp;wkrótce</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} nie siedź w domu. Wszystkie prawa zastrzeżone.
          </p>
          <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
            <Link href="/regulamin" className="hover:text-primary transition-colors duration-200">Regulamin</Link>
            <Link href="/prywatnosc" className="hover:text-primary transition-colors duration-200">Prywatność</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
