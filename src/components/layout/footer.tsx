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
      { href: "/wydarzenia-dla-dzieci-krakow", label: "Wydarzenia dla dzieci" },
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
    <footer className="mt-16" style={{ background: "oklch(14% 0.018 75)" }}>
      <div className="container-page py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" variant="light" />
            <p
              className="text-[13px] mt-3 leading-relaxed max-w-[220px]"
              style={{ color: "oklch(58% 0.012 75)" }}
            >
              Platforma dla rodziców w Krakowie. Wydarzenia, kolonie i miejsca — wszystko w jednym miejscu.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3
                className="text-[10px] font-bold uppercase tracking-widest mb-4"
                style={{ color: "oklch(50% 0.012 75)" }}
              >
                {section.title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] transition-colors duration-200 hover:text-white"
                      style={{ color: "oklch(68% 0.012 75)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
          style={{ borderTop: "1px solid oklch(24% 0.015 75)" }}
        >
          <p className="text-[12px]" style={{ color: "oklch(42% 0.012 75)" }}>
            © {new Date().getFullYear()} niesiedzwdomu. Wszystkie prawa zastrzeżone.
          </p>
          <div className="flex items-center gap-4 text-[12px]">
            <Link
              href="/regulamin"
              className="transition-colors duration-200 hover:text-white"
              style={{ color: "oklch(42% 0.012 75)" }}
            >
              Regulamin
            </Link>
            <Link
              href="/prywatnosc"
              className="transition-colors duration-200 hover:text-white"
              style={{ color: "oklch(42% 0.012 75)" }}
            >
              Prywatność
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
