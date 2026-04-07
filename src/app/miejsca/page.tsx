import type { Metadata } from "next";
import { getPublishedPlaces } from "@/lib/data";
import { PlacesListView } from "./places-list-view";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Miejsca dla dzieci w Krakowie | NieSiedzWDomu",
  description:
    "Sprawdzone miejsca dla rodzin z dziecmi w Krakowie: sale zabaw, muzea, parki, atrakcje i przestrzenie na wspolny czas.",
  alternates: {
    canonical: "/miejsca",
  },
};

export default async function PlacesPage() {
  const places = await getPublishedPlaces(100);
  return <PlacesListView places={places} />;
}
