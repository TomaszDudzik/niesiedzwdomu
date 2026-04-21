import type { Metadata } from "next";
import { getPublishedEvents, getPublishedPlaces, getPublishedActivities } from "@/lib/data";
import { MapaView } from "./mapa-view";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Mapa Krakowa | NieSiedzWDomu",
  description: "Odkryj miejsca, wydarzenia i zajęcia dla dzieci w Krakowie na interaktywnej mapie.",
};

export default async function MapaPage() {
  const [events, places, activities] = await Promise.all([
    getPublishedEvents(200),
    getPublishedPlaces(200),
    getPublishedActivities(120),
  ]);

  return <MapaView events={events} places={places} activities={activities} />;
}
