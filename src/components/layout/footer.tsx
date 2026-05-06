import Link from "next/link";

const FOOTER_SECTIONS = [
  {
    title: "Odkrywaj",
    links: [
      { href: "/miejsca",    label: "Miejsca" },
      { href: "/wydarzenia", label: "Wydarzenia" },
      { href: "/kolonie",    label: "Kolonie" },
      { href: "/zajecia",    label: "Zajęcia" },
    ],
  },
  {
    title: "Przewodniki",
    links: [
      { href: "/co-robic-z-dzieckiem-w-krakowie", label: "Odkryj Kraków z dzieckiem" },
      { href: "/wydarzenia-dla-dzieci-krakow",    label: "Wydarzenia dla dzieci" },
      { href: "/polkolonie-krakow",               label: "Półkolonie Kraków" },
      { href: "/place-zabaw-krakow",              label: "Place zabaw Kraków" },
    ],
  },
  {
    title: "Informacje",
    links: [
      { href: "/o-nas",   label: "O nas" },
      { href: "/misja",   label: "Misja" },
      { href: "/kontakt", label: "Napisz do nas" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 bg-[oklch(13%_0.018_255)]">
      <div className="container-page py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label="NieSiedzWDomu">
              <span style={{ fontFamily: "var(--font-pacifico)", fontSize: "22px", letterSpacing: "-0.01em" }}>
                <span style={{ color: "#3A8C3F" }}>Nie</span><span style={{ color: "#F5C200" }}>Siedź</span><span style={{ color: "#e60100" }}>W</span><span style={{ color: "#8B5CF6" }}>Domu</span>
              </span>
            </Link>

            <p className="mt-4 text-[13px] leading-relaxed max-w-[220px] text-white/70">
              Platforma dla rodziców w Krakowie. Wydarzenia, kolonie i miejsca — wszystko w jednym miejscu.
            </p>
            {false && (
            <Link
              href="/dodaj"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[oklch(30%_0.020_29)] bg-[oklch(62%_0.245_29)] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[oklch(56%_0.245_29)]"
            >
              Dodaj swój event
            </Link>
            )}
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-white">
                {section.title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-white/80 transition-colors duration-200 hover:text-white"
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
          className="mt-10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-[oklch(22%_0.015_255)]"
        >
          <p className="text-[12px] text-white/50">
            © {new Date().getFullYear()} niesiedzwdomu. Wszystkie prawa zastrzeżone.
          </p>
          <div className="flex items-center gap-4 text-[12px]">
            <Link href="/regulamin"   className="text-white/50 transition-colors hover:text-white">Regulamin</Link>
            <Link href="/prywatnosc"  className="text-white/50 transition-colors hover:text-white">Prywatność</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
