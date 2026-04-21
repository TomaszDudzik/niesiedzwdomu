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
    <footer className="mt-16 border-t border-[#dad0c0] bg-[linear-gradient(180deg,#e8dfd2_0%,#ddd1c0_100%)]">
      <div className="container-page py-12">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-[1.2fr_1fr_1fr_0.9fr] md:gap-5 lg:gap-6">
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" />
            <p className="mt-3 max-w-[240px] text-[13px] leading-7 text-[#6f6251]">
              Platforma dla rodziców w Krakowie. Wydarzenia, kolonie i miejsca — wszystko w jednym miejscu.
            </p>
          </div>

          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#7b6f5f]">{section.title}</h3>
              <ul className="flex flex-col gap-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="inline-flex items-center gap-1.5 text-[14px] text-[#4a3c2c] transition-colors duration-200 hover:text-[#b65f31]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[#cfc2af] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-[#766958]">
            © {new Date().getFullYear()} niesiedzwdomu. Wszystkie prawa zastrzeżone.
          </p>
          <div className="flex items-center gap-4 text-[12px] text-[#766958]">
            <Link href="/regulamin" className="transition-colors duration-200 hover:text-[#b65f31]">Regulamin</Link>
            <Link href="/prywatnosc" className="transition-colors duration-200 hover:text-[#b65f31]">Prywatność</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
