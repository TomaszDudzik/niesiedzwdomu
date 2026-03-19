import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="container-page py-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="max-w-xs">
            <Logo size="sm" />
            <p className="text-[13px] text-muted mt-2 leading-relaxed">
              Wydarzenia, kolonie i miejsca dla rodzin w Krakowie.
            </p>
          </div>

          <div className="flex gap-12 text-[13px]">
            <div className="flex flex-col gap-2">
              <Link href="/wydarzenia" className="text-muted hover:text-foreground transition-colors">Wydarzenia</Link>
              <Link href="/kolonie" className="text-muted hover:text-foreground transition-colors">Kolonie</Link>
              <Link href="/miejsca" className="text-muted hover:text-foreground transition-colors">Miejsca</Link>
              <Link href="/kalendarz" className="text-muted hover:text-foreground transition-colors">Kalendarz</Link>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/co-robic-z-dzieckiem-w-krakowie" className="text-muted hover:text-foreground transition-colors">Co robić z dzieckiem</Link>
              <Link href="/wydarzenia-dla-dzieci-krakow" className="text-muted hover:text-foreground transition-colors">Wydarzenia dla dzieci</Link>
              <Link href="/polkolonie-krakow" className="text-muted hover:text-foreground transition-colors">Półkolonie</Link>
              <Link href="/place-zabaw-krakow" className="text-muted hover:text-foreground transition-colors">Place zabaw</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} wyjdź na pole
          </p>
        </div>
      </div>
    </footer>
  );
}
