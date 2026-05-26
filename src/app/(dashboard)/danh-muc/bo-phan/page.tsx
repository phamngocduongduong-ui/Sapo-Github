import { prisma } from "@/lib/db";
import DepartmentTable from "./DepartmentTable";

export default async function BoPhanPage() {
  const departments = await prisma.department.findMany({
    orderBy: { createdAt: "desc" }
  });

  return (
    <div style={{ width: "100%" }}>
      <DepartmentTable initialDepartments={departments as any} />
    </div>
  );
}
