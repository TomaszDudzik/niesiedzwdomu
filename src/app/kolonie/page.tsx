import type { Metadata } from "next";
import { getPublishedCamps } from "@/lib/data";
import { CampsListView } from "./camps-list-view";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Kolonie i Półkolonie w Krakowie | NieSiedzWDomu",
  description:
    "Sprawdzone kolonie, półkolonie i warsztaty wakacyjne dla dzieci. Porównuj terminy, czas trwania i lokalizacje w jednym miejscu.",
  alternates: {
    canonical: "/kolonie",
  },
};

export default async function CampsPage() {
  const camps = await getPublishedCamps(120);
  return <CampsListView camps={camps} />;
}
