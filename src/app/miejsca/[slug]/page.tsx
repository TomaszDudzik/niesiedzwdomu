import { redirect } from "next/navigation";

interface PageProps { params: Promise<{ slug: string }>; }

export default async function PlaceDetailPage({ params }: PageProps) {
  redirect("/miejsca");
}
