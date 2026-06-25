import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import PurchasingProposalApprovalPage from "../../purchasing/phe-duyet-de-nghi/page";

export default async function DeNghiMuaHangApprovalPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await (prisma as any).user.findUnique({
    where: { id: session.userId },
    include: { permission: { include: { permissiondetail: true } } }
  });

  const isAdmin = user?.username === "admin" || user?.role === "Admin";
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

  const hasAccess = isAdmin || permissions.has("PD_DE_NGHI_MH");
  if (!hasAccess) {
    return (
      <div className="main-content" style={{ padding: "2rem" }}>
        <h1>Bạn không có quyền truy cập trang này.</h1>
      </div>
    );
  }

  return (
    <PurchasingProposalApprovalPage isEmbedded={false} />
  );
}
