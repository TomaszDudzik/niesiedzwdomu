import { Tent } from "lucide-react";
import { ComingSoonPage } from "@/components/ui/coming-soon";

export default function CampsPage() {
  return (
    <ComingSoonPage
      icon={<Tent size={40} strokeWidth={1.5} />}
      title="Kolonie i półkolonie"
      description="Zbieramy najlepsze kolonie, półkolonie i warsztaty wakacyjne dla dzieci w Krakowie."
      detail="Weryfikujemy oferty, zbieramy opinie rodziców i przygotowujemy porównania — żebyś mógł wybrać najlepszą opcję dla swojego dziecka."
    />
  );
}
