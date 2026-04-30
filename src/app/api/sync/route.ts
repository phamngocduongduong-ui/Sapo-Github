import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const module = searchParams.get("module");

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isAdmin = user.username === "admin" || user.role === "Admin";
  const userBranches = user.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];
  const userName = user.employeeName || user.username || "";

  try {
    switch (module) {
      case "employees":
        return NextResponse.json(await prisma.employee.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          orderBy: { createdAt: "desc" } 
        }));
      case "orders":
        return NextResponse.json(await prisma.order.findMany({ 
          include: { items: true }, 
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
          include: { _count: { select: { details: true } } }, 
          orderBy: { createdAt: "desc" } 
        }));
      case "salary-levels":
        return NextResponse.json(await prisma.salaryLevel.findMany({ orderBy: { stt: "asc" } }));
      case "labor-contracts":
        return NextResponse.json(await prisma.laborContract.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          orderBy: { createdAt: "desc" } 
        }));
      case "departments":
        return NextResponse.json(await prisma.department.findMany({ orderBy: { createdAt: "desc" } }));
      case "positions":
        return NextResponse.json(await prisma.position.findMany({ orderBy: { createdAt: "desc" } }));
      case "salary-changes":
        return NextResponse.json(await prisma.salaryChange.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          orderBy: { createdAt: "desc" } 
        }));
      case "transfer-promotions":
        return NextResponse.json(await prisma.transferPromotion.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          orderBy: { createdAt: "desc" } 
        }));
      case "material-plans":
        return NextResponse.json(await prisma.materialPlan.findMany({ include: { orders: true }, orderBy: { createdAt: "desc" } }));
      case "purchasing-plans":
        return NextResponse.json(await prisma.purchasingPlan.findMany({ include: { order: true, items: true }, orderBy: { createdAt: "desc" } }));
      case "dispatch-orders":
        return NextResponse.json(await prisma.dispatchOrder.findMany({ orderBy: { createdAt: "desc" } }));
      case "violations":
        return NextResponse.json(await prisma.violation.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          orderBy: { createdAt: "desc" } 
        }));
      case "leave-requests":
        const isEmployee = user.role !== "Admin" && user.role !== "Manager" && user.role !== "HR";
        return NextResponse.json(await prisma.leaveRequest.findMany({ 
          where: isEmployee ? { employeeName: userName } : {},
          orderBy: { createdAt: "desc" } 
        }));
      case "approvals":
        const [pContracts, pLeaves, pSalaryChanges, pTransfers, pResignations, pPayrolls] = await Promise.all([
          prisma.laborContract.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
          prisma.leaveRequest.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
          prisma.salaryChange.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
          prisma.transferPromotion.findMany({ where: { status: "Chờ phê duyệt" }, orderBy: { createdAt: "desc" } }),
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
      default:
        return NextResponse.json({ error: "Invalid module" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}

