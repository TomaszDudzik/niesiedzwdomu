import type { Metadata } from "next";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Analytics } from "@vercel/analytics/react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://niesiedzwdomu.pl";

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
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "NieSiedzWDomu - wydarzenia i miejsca dla rodzin",
      },
    ],
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
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1"><PageWrapper>{children}</PageWrapper></main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
