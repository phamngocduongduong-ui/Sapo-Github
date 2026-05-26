import React from "react";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import ReportClient from "./ReportClient";

export default async function NhanSuBaoCaoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { permission: { include: { permissiondetail: true } } }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const hasAccess = isAdmin || ((user as any)?.permission?.some((p: any) => 
    p.permissiondetail?.some((d: any) => d.moduleKey === "NS_BAO_CAO" && d.canAccess)
  ) ?? false);

  if (!hasAccess) {
    redirect("/");
  }

  return (
    <ReportClient />
  );
}
