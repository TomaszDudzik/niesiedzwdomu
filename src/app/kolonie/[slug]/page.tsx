import { redirect } from "next/navigation";

interface PageProps { params: Promise<{ slug: string }>; }

export default async function CampDetailPage({ params }: PageProps) {
  redirect("/kolonie");
}
