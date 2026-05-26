"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import SecurityRegistrationTable from "./SecurityRegistrationTable";

export default async function SecurityRegistrationPage() {
  const session = await getSession();
  const userId = session?.userId;
  
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: { username: true, role: true, employeeName: true }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const activeBranch = session?.activeBranch;
  const registrations = await (prisma as any).securityregistration.findMany({
    where: activeBranch ? { branch: activeBranch } : {},
    orderBy: { createdAt: 'desc' }
  });

  return (
    <SecurityRegistrationTable 
      initialData={JSON.parse(JSON.stringify(registrations))} 
      isAdmin={isAdmin} 
      currentUserName={user?.employeeName || user?.username || "Unknown"}
      activeBranch={activeBranch}
    />
  );
}
