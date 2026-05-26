import { prisma } from "@/lib/db";
import PermissionAssignment from "./PermissionAssignment";

export default async function QuyenSuDungPage() {
  const categories = await prisma.permission.findMany({
    where: {
      status: "ACTIVE"
    },
    orderBy: {
      name: "asc"
    }
  });

  return (
    <div style={{ width: "100%" }}>
      <PermissionAssignment categories={categories} />
    </div>
  );
}
