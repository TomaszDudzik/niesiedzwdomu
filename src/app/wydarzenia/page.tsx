import type { Metadata } from "next";
import { getPublishedEvents } from "@/lib/data";
import { EventsListView } from "./events-list-view";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Wydarzenia dla dzieci w Krakowie | NieSiedzWDomu",
  description:
    "Przegladaj aktualne wydarzenia dla dzieci w Krakowie: warsztaty, spektakle, aktywnosci rodzinne i atrakcje na weekend.",
  alternates: {
    canonical: "/wydarzenia",
  },
};

export default async function EventsPage() {
  const events = await getPublishedEvents(100);
  return <EventsListView events={events} />;
}
