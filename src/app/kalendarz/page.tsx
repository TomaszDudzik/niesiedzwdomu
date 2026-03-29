import { getPublishedEvents } from "@/lib/data";
import { CalendarView } from "./calendar-view";

export const revalidate = 60;

export default async function CalendarPage() {
  const events = await getPublishedEvents(200);

  return (
    <div className="container-page pt-5 pb-10">
      <h1 className="text-2xl font-bold text-foreground tracking-[-0.02em] mb-1">Kalendarz</h1>
      <p className="text-[14px] text-muted mb-6">Co się dzieje w Krakowie</p>
      <CalendarView events={events} />
    </div>
  );
}
