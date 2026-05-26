import { prisma } from "@/lib/db";
import PermissionTable from "./PermissionTable";

export default async function MucQuyenPage() {
  const permissions = await prisma.permission.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div style={{ width: "100%" }}>
      <PermissionTable initialPermissions={permissions as any} />
    </div>
  );
}

