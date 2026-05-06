import type { Metadata } from "next";
import { Nunito, Nunito_Sans, Pacifico } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Analytics } from "@vercel/analytics/react";
import { getPublishedEvents, getPublishedPlaces, getPublishedCamps, getPublishedActivitiesCount } from "@/lib/data";

const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-pacifico",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  variable: "--font-nunito-sans",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.niesiedzwdomu.pl";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Nie siedź w domu - Odkryj Kraków z dzieckiem | niesiedzwdomu",
  description:
    "Nie siedź w domu. Wydarzenia, kolonie i najlepsze miejsca dla rodzin w Krakowie. Wszystko w jednym miejscu.",
  keywords: ["nie siedź w domu", "niesiedzwdomu", "Kraków", "dzieci", "wydarzenia", "kolonie", "miejsca", "rodzina", "weekend"],
  icons: {
    icon: "/favicon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Nie siedź w domu | niesiedzwdomu",
    description: "Nie siedź w domu. Odkryj Kraków z dzieckiem: wydarzenia, kolonie i miejsca dla rodzin.",
    url: SITE_URL,
    siteName: "NieSiedzWDomu",
    locale: "pl_PL",
    type: "website",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "NieSiedzWDomu" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nie siedź w domu | niesiedzwdomu",
    description: "Odkryj Kraków z dzieckiem: wydarzenia, kolonie i miejsca dla rodzin.",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [events, places, camps, activitiesCount] = await Promise.all([
    getPublishedEvents(200),
    getPublishedPlaces(200),
    getPublishedCamps(40),
    getPublishedActivitiesCount(),
  ]);
  const counts = { events: events.length, places: places.length, camps: camps.length, activities: activitiesCount };

  return (
    <html lang="pl" className={`${nunito.variable} ${nunitoSans.variable} ${pacifico.variable}`}>
      <body suppressHydrationWarning className="min-h-screen flex flex-col">
        <Header counts={counts} />
        <main className="flex-1">
          <PageWrapper>{children}</PageWrapper>
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
