import type { Metadata } from "next";
import { getPublishedActivities } from "@/lib/data";
import { ActivitiesListView } from "./activities-list-view";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Zajęcia dla dzieci w Krakowie | NieSiedzWDomu",
  description:
    "Regularne zajęcia dla dzieci w Krakowie: sportowe, artystyczne, językowe i edukacyjne. Filtruj po dniu tygodnia, wieku i dzielnicy.",
  alternates: {
    canonical: "/zajecia",
  },
};

export default async function ActivitiesPage() {
  const activities = await getPublishedActivities(150);
  return <ActivitiesListView activities={activities} />;
}
