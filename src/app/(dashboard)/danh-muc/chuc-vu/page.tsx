import { prisma } from "@/lib/db";
import PositionTable from "./PositionTable";

export default async function ChucVuPage() {
  const positions = await prisma.position.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div style={{ width: "100%" }}>
      <PositionTable initialPositions={positions as any} />
    </div>
  );
}
