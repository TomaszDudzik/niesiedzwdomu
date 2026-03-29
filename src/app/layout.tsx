import type { Metadata } from "next";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageWrapper } from "@/components/layout/page-wrapper";

export const metadata: Metadata = {
  title: "nie siedź w domu — Odkryj Kraków z dzieckiem",
  description:
    "Wydarzenia, kolonie i najlepsze miejsca dla rodzin w Krakowie. Wszystko w jednym miejscu.",
  keywords: ["Kraków", "dzieci", "wydarzenia", "kolonie", "miejsca", "rodzina", "weekend"],
  icons: {
    icon: "/favicon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "nie siedź w domu",
    description: "Odkryj Kraków z dzieckiem. Wydarzenia, kolonie i miejsca dla rodzin.",
    locale: "pl_PL",
    type: "website",
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
      </body>
    </html>
  );
}
