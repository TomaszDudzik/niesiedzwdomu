import { getPublishedPlaces } from "@/lib/data";
import { PlacesListView } from "./places-list-view";

export const revalidate = 60;

export default async function PlacesPage() {
  const places = await getPublishedPlaces(100);
  return <PlacesListView places={places} />;
}
