import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const module = searchParams.get("module");

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.status === "INACTIVE") {
    return NextResponse.json({ error: "ACCOUNT_INACTIVE" }, { status: 403 });
  }

  const isAdmin = user.username === "admin" || user.role === "Admin";
  const isStaff = user.role?.includes("Nhân viên") && !isAdmin;
  const userBranches = user.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];
  const userName = user.employeeName || user.username || "";

  try {
    switch (module) {
      case "employees":
        return NextResponse.json(await prisma.employee.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          orderBy: { createdAt: "desc" } 
        }));
      case "contracts":
        return NextResponse.json(await (prisma as any).contract.findMany({ 
          where: isStaff ? { salesEmployee: userName } : {},
          include: { contractitem: true }, 
          orderBy: { createdAt: "desc" } 
        }));
      case "orders":
        return NextResponse.json(await (prisma as any).order.findMany({ 
          where: isStaff ? { employeeName: userName } : {},
          include: { orderitem: true }, 
          orderBy: { createdAt: "desc" } 
        }));
      case "attendance":
        return NextResponse.json(await prisma.attendance.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          orderBy: { createdAt: "desc" } 
        }));
      case "payroll":
        return NextResponse.json(await prisma.payroll.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          include: { _count: { select: { payrolldetail: true } } }, 
          orderBy: { createdAt: "desc" } 
        }));
      case "salary-levels":
        return NextResponse.json(await (prisma as any).salarylevel.findMany({ orderBy: { stt: "asc" } }));
      case "labor-contracts":
        return NextResponse.json(await (prisma as any).laborcontract.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          orderBy: { createdAt: "desc" } 
        }));
      case "departments":
        return NextResponse.json(await prisma.department.findMany({ orderBy: { createdAt: "desc" } }));
      case "positions":
        return NextResponse.json(await prisma.position.findMany({ orderBy: { createdAt: "desc" } }));
      case "salary-changes":
        return NextResponse.json(await (prisma as any).salarychange.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          orderBy: { createdAt: "desc" } 
        }));
      case "transfer-promotions":
        return NextResponse.json(await (prisma as any).transferpromotion.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          orderBy: { createdAt: "desc" } 
        }));
      case "material-plans":
        return NextResponse.json(await (prisma as any).materialplan.findMany({ include: { order: true }, orderBy: { createdAt: "desc" } }));
      case "purchasing-plans":
        return NextResponse.json(await (prisma as any).purchasingplan.findMany({ include: { order: true, items: true }, orderBy: { createdAt: "desc" } }));
      case "dispatch-orders":
        return NextResponse.json(await (prisma as any).dispatchorder.findMany({ orderBy: { createdAt: "desc" } }));
      case "violations":
        return NextResponse.json(await prisma.violation.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          orderBy: { createdAt: "desc" } 
        }));
      case "leave-requests":
        const isEmployee = user.role !== "Admin" && user.role !== "Manager" && user.role !== "HR";
        return NextResponse.json(await (prisma as any).leaverequest.findMany({ 
          where: isEmployee ? { employeeName: userName } : {},
          orderBy: { createdAt: "desc" } 
        }));
      case "security-registrations":
        return NextResponse.json(await (prisma as any).securityregistration.findMany({ 
          where: session.activeBranch ? { branch: session.activeBranch } : {},
          orderBy: { createdAt: 'desc' } 
        }));
      case "approvals":
        const [pContracts, pLeaves, pSalaryChanges, pTransfers, pResignations, pPayrolls] = await Promise.all([
          (prisma as any).laborcontract.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
          (prisma as any).leaverequest.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
          (prisma as any).salarychange.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
          (prisma as any).transferpromotion.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
          (prisma as any).resignation.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
          prisma.payroll.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
        ]);
        return NextResponse.json({
          contracts: pContracts,
          leaves: pLeaves,
          salaryChanges: pSalaryChanges,
          transfers: pTransfers,
          resignations: pResignations,
          payrolls: pPayrolls
        });
      case "customers":
        return NextResponse.json(await (prisma as any).customer.findMany({
          select: { code: true, name: true, abbreviation: true }
        }));
      case "products":
        return NextResponse.json(await prisma.product.findMany({
          select: { code: true, name: true, englishName: true, packaging: true, unit: { select: { name: true } } }
        }));
      case "pending-purchase-orders":
        return NextResponse.json(await (prisma as any).purchaseorder.findMany({
          where: { status: "Chờ mua hàng" },
          include: { purchaseorderdetail: true },
          orderBy: { createdAt: "asc" }
        }));
      case "purchase-invoices":
        return NextResponse.json(await (prisma as any).purchaseinvoice.findMany({
          include: { purchaseinvoicedetail: true },
          orderBy: { createdAt: "desc" }
        }));
      case "purchase-orders":
        return NextResponse.json(await (prisma as any).purchaseorder.findMany({
          where: isAdmin ? {} : {
            branch: { in: userBranches }
          },
          include: { purchaseorderdetail: true },
          orderBy: { createdAt: "desc" }
        }));
      case "maintenance-proposals":
        const proposals = await (prisma as any).maintenanceproposal.findMany({
          where: isAdmin ? {} : {
            branch: { in: userBranches }
          },
          include: { items: true },
          orderBy: { createdAt: "desc" }
        });
        for (const proposal of proposals) {
          const proposalCode = proposal.proposalCode;
          const poDetails = await (prisma as any).purchaseorderdetail.findMany({
            where: {
              purchaseorder: {
                purpose: {
                  contains: proposalCode
                }
              }
            },
            select: {
              proposalProductName: true,
              requestedQuantity: true,
              purchaseorder: {
                select: {
                  status: true
                }
              }
            }
          });
          for (const item of proposal.items) {
            const matchedDetails = poDetails.filter((d: any) => d.proposalProductName === item.productName);
            const orderedQty = matchedDetails.reduce((sum: number, d: any) => sum + (d.requestedQuantity || 0), 0);
            (item as any).orderedQuantity = orderedQty;
            
            if (orderedQty > 0) {
              const statuses = Array.from(new Set(matchedDetails.map((d: any) => d.purchaseorder?.status).filter(Boolean)));
              (item as any).poStatus = statuses.join(", ");
            } else {
              (item as any).poStatus = "";
            }
          }
        }
        return NextResponse.json(proposals);
      default:
        return NextResponse.json({ error: "Invalid module" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}

