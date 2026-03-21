import { MapPin } from "lucide-react";
import { ComingSoonPage } from "@/components/ui/coming-soon";

export default function PlacesPage() {
  return (
    <ComingSoonPage
      icon={<MapPin size={40} strokeWidth={1.5} />}
      title="Miejsca"
      description="Pracujemy nad bazą miejsc przyjaznych rodzinom w Krakowie — place zabaw, sale zabaw, kawiarnie rodzinne i więcej."
      detail="Odwiedzamy, sprawdzamy i opisujemy miejsca, żebyś wiedział dokąd warto się wybrać z dzieckiem."
    />
  );
}
