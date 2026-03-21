import { Users } from "lucide-react";
import { ComingSoonPage } from "@/components/ui/coming-soon";

export default function ActivitiesPage() {
  return (
    <ComingSoonPage
      icon={<Users size={40} strokeWidth={1.5} />}
      title="Zajęcia dla dzieci"
      description="Tworzymy katalog regularnych zajęć dla dzieci w Krakowie — od sportowych, przez artystyczne, po edukacyjne."
      detail="Chcemy ułatwić Ci znalezienie zajęć dopasowanych do wieku i zainteresowań Twojego dziecka."
    />
  );
}
