import { getPublishedEvents } from "@/lib/data";
import { EventsListView } from "./events-list-view";

export const revalidate = 60;

export default async function EventsPage() {
  const events = await getPublishedEvents(100);
  return <EventsListView events={events} />;
}
