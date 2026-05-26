import { getMyCheckins } from "./actions";
import CheckInClient from "./CheckInClient";
import { prisma } from "@/lib/db";

export default async function ChamCongNewPage() {
  const now = new Date();
  const initialCheckins = await getMyCheckins(now.getMonth() + 1, now.getFullYear());
  const areas = await prisma.checkin_area.findMany({
    where: { status: "ACTIVE" }
  });

  return (
    <div className="page-content">
      <CheckInClient initialCheckins={initialCheckins} areas={areas} />
    </div>
  );
}
