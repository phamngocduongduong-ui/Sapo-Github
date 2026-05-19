import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function LegacyDriverQueueDashboardPage({ params }: { params: { id: string } }) {
  redirect(`/x/${params.id}`);
}
