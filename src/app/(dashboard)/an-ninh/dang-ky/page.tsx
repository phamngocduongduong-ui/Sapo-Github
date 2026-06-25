"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import SecurityRegistrationTable from "./SecurityRegistrationTable";

import { getUserModuleBranchFilter } from "@/lib/permissions";

export default async function SecurityRegistrationPage() {
  const session = await getSession();
  const userId = session?.userId;
  
  const user = await (prisma as any).user.findUnique({
    where: { id: userId || "" },
    select: { id: true, username: true, role: true, employeeName: true }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const activeBranch = session?.activeBranch;

  const filter = user ? await getUserModuleBranchFilter(user.id, "AN_DANG_KY", session?.activeBranch, {
    branchField: "branch",
    creatorField: "creator"
  }) : { id: "NO_ACCESS" };

  const registrations = await (prisma as any).securityregistration.findMany({
    where: filter,
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
