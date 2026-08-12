import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ApprovalCenterPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId },
    include: { permission: { include: { permissiondetail: true } } }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  
  // Resolve user permissions
  const permissions = new Set<string>();
  if (user?.permission) {
    user.permission.forEach((p: any) => {
      p.permissiondetail?.forEach((d: any) => {
        if (d.canAccess) {
          permissions.add(d.moduleKey);
        }
      });
    });
  }

  // Find the first module they have access to and redirect
  if (isAdmin || permissions.has("PD_NHAN_SU")) redirect("/phe-duyet/nhan-su");
  if (permissions.has("PD_HOP_DONG_LD")) redirect("/phe-duyet/hop-dong-lao-dong");
  if (permissions.has("PD_HOP_DONG_BH")) redirect("/phe-duyet/hop-dong-ban-hang");
  if (permissions.has("PD_LUONG_THUONG")) redirect("/phe-duyet/luong-thuong");
  if (permissions.has("PD_THANH_TOAN")) redirect("/phe-duyet/thanh-toan");
  if (permissions.has("PD_MUA_HANG")) redirect("/phe-duyet/mua-hang");
  if (permissions.has("PD_DE_NGHI_MH")) redirect("/phe-duyet/de-nghi-mua-hang");

  redirect("/");
}
