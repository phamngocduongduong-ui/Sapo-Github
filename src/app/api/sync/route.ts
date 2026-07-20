import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserModuleBranchFilter, getUserPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

async function getUserPosition(employeeName: string | null) {
  if (!employeeName) return "";

  // Check in transferpromotion table for the latest approved request
  const latestTransfer = await (prisma as any).transferpromotion.findFirst({
    where: {
      employeeName: employeeName,
      status: "Đã phê duyệt"
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  if (latestTransfer) {
    return latestTransfer.newPosition || "";
  }

  // Fallback to employee table
  const employee = await prisma.employee.findFirst({
    where: { fullName: employeeName }
  });

  return employee?.position || "";
}

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

  const position = await getUserPosition(user.employeeName);
  const isAdmin = user.username === "admin" || user.role === "Admin";
  const isManager = isAdmin || user.role?.includes("Trưởng phòng") || position.includes("Trưởng phòng") || position.includes("Giám đốc");
  const isStaff = !isManager;
  const userBranches = user.branch ? user.branch.split(",").map(b => b.trim()).filter(Boolean) : [];
  const userName = user.employeeName || user.username || "";

  try {
    switch (module) {
      case "employees": {
        const filter = await getUserModuleBranchFilter(user.id, "NS_NHAN_VIEN", session.activeBranch, {
          branchField: "branch",
          creatorField: "creator",
          employeeField: "fullName"
        });
        return NextResponse.json(await prisma.employee.findMany({ 
          where: filter,
          orderBy: { createdAt: "desc" } 
        }));
      }
      case "contracts": {
        const filter = await getUserModuleBranchFilter(user.id, "KD_HOP_DONG", session.activeBranch, {
          employeeInBranchField: "salesEmployee",
          employeeField: "salesEmployee"
        });
        return NextResponse.json(await (prisma as any).contract.findMany({ 
          where: filter,
          include: { contractitem: true }, 
          orderBy: { createdAt: "desc" } 
        }));
      }
      case "orders": {
        const page = searchParams.get("page");
        let filter: any = { id: "NO_ACCESS" };
        if (user) {
          const { canAccess: canAccessProd } = await getUserPermission(user.id, "SX_DON_SAN_XUAT");

          if (page === "production" || (!page && canAccessProd)) {
            const activeBranch = session.activeBranch;
            if (activeBranch) {
              if (activeBranch === "Hồ Chí Minh") {
                filter = {
                  OR: [
                    { status: "Chờ tiếp nhận" },
                    { branch: "Hồ Chí Minh" }
                  ]
                };
              } else {
                filter = { branch: activeBranch };
              }
            } else {
              filter = {};
            }
          } else if (page === "delivery-plan") {
            const activeBranch = session.activeBranch;
            if (activeBranch && activeBranch !== "Hồ Chí Minh") {
              filter = { branch: activeBranch };
            } else {
              filter = {};
            }
          } else {
            // Logic cho trang đơn hàng (sales)
            if (isManager) {
              // Trưởng phòng trở lên thấy toàn bộ đơn hàng
              filter = {};
            } else {
              // Nhân viên kinh doanh: thấy đơn hàng thuộc hợp đồng của mình (dù ai tạo)
              // hoặc đơn hàng mà họ là người phụ trách (employeeName)
              const userContracts = await prisma.contract.findMany({
                where: { salesEmployee: userName },
                select: { contractNumber: true }
              });
              const contractNumbers = userContracts.map(c => c.contractNumber);
              const contractConditions = contractNumbers.map(num => ({
                note: { contains: `Hợp đồng: ${num}` }
              }));

              filter = {
                OR: [
                  { employeeName: userName },
                  ...contractConditions
                ]
              };
            }
          }
        }
        return NextResponse.json(await (prisma as any).order.findMany({ 
          where: filter,
          include: { orderitem: true }, 
          orderBy: { createdAt: "desc" } 
        }));
      }
      case "attendance": {
        const filter = await getUserModuleBranchFilter(user.id, "LB_CHAM_CONG", session.activeBranch, {
          branchField: "branch",
          employeeField: "employeeName"
        });
        return NextResponse.json(await prisma.attendance.findMany({ 
          where: filter,
          orderBy: { createdAt: "desc" } 
        }));
      }
      case "payroll": {
        const filter = await getUserModuleBranchFilter(user.id, "NS_BANG_LUONG", session.activeBranch, {
          branchField: "branch",
          creatorField: "creator"
        });
        return NextResponse.json(await prisma.payroll.findMany({ 
          where: filter,
          include: { _count: { select: { payrolldetail: true } } }, 
          orderBy: { createdAt: "desc" } 
        }));
      }
      case "salary-levels":
        return NextResponse.json(await (prisma as any).salarylevel.findMany({ orderBy: { stt: "asc" } }));
      case "labor-contracts": {
        const filter = await getUserModuleBranchFilter(user.id, "NS_HOP_DONG", session.activeBranch, {
          branchField: "branch",
          creatorField: "creator",
          employeeField: "employeeName"
        });
        return NextResponse.json(await (prisma as any).laborcontract.findMany({ 
          where: filter,
          orderBy: { createdAt: "desc" } 
        }));
      }
      case "departments":
        return NextResponse.json(await prisma.department.findMany({ orderBy: { createdAt: "desc" } }));
      case "positions":
        return NextResponse.json(await prisma.position.findMany({ orderBy: { createdAt: "desc" } }));
      case "salary-changes": {
        const filter = await getUserModuleBranchFilter(user.id, "NS_TANG_GIAM_LUONG", session.activeBranch, {
          branchField: "branch",
          creatorField: "creator",
          employeeField: "employeeName"
        });
        return NextResponse.json(await (prisma as any).salarychange.findMany({ 
          where: filter,
          orderBy: { createdAt: "desc" } 
        }));
      }
      case "transfer-promotions": {
        const filter = await getUserModuleBranchFilter(user.id, "NS_DIEU_DONG", session.activeBranch, {
          branchField: "branch",
          creatorField: "creator",
          employeeField: "employeeName"
        });
        return NextResponse.json(await (prisma as any).transferpromotion.findMany({ 
          where: filter,
          orderBy: { createdAt: "desc" } 
        }));
      }
      case "material-plans":
        return NextResponse.json(await (prisma as any).materialplan.findMany({ 
          where: session.activeBranch ? {
            order: {
              some: {
                branch: session.activeBranch
              }
            }
          } : {},
          include: { order: true }, 
          orderBy: { createdAt: "desc" } 
        }));
      case "purchasing-plans":
        return NextResponse.json(await (prisma as any).purchasingplan.findMany({ include: { order: true, items: true }, orderBy: { createdAt: "desc" } }));
      case "dispatch-orders":
        return NextResponse.json(await (prisma as any).dispatchorder.findMany({ orderBy: { createdAt: "desc" } }));
      case "violations":
        return NextResponse.json(await prisma.violation.findMany({ 
          where: isAdmin ? {} : { branch: { in: userBranches } },
          orderBy: { createdAt: "desc" } 
        }));
      case "leave-requests": {
        const isEmployee = user.role !== "Admin" && user.role !== "Manager" && user.role !== "HR";
        return NextResponse.json(await (prisma as any).leaverequest.findMany({ 
          where: isEmployee ? { employeeName: userName } : {},
          orderBy: { createdAt: "desc" } 
        }));
      }
      case "security-registrations": {
        const filter = await getUserModuleBranchFilter(user.id, "AN_DANH_SACH", session.activeBranch, {
          branchField: "branch",
          creatorField: "creator"
        });
        return NextResponse.json(await (prisma as any).securityregistration.findMany({ 
          where: filter,
          orderBy: { createdAt: 'desc' } 
        }));
      }
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
      case "suppliers":
        return NextResponse.json(await (prisma as any).supplier.findMany({
          where: { status: "Hoạt động" },
          orderBy: { name: "asc" }
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
      case "purchase-orders": {
        let filter: any = {};
        if (!isAdmin) {
          const { allBranches } = await getUserPermission(user.id, "TM_LENH_MUA");
          if (allBranches) {
            // See all branches
          } else {
            const activeBranch = session.activeBranch || user.branch?.split(",")[0]?.trim() || "";
            filter = { branch: activeBranch };
          }
        }
        return NextResponse.json(await (prisma as any).purchaseorder.findMany({
          where: filter,
          include: { purchaseorderdetail: true },
          orderBy: { createdAt: "desc" }
        }));
      }
      case "purchasing-proposals": {
        let filter: any = {};
        if (!isAdmin) {
          const { allBranches } = await getUserPermission(user.id, "TM_LENH_MUA");
          if (allBranches) {
            // See all branches
          } else {
            const activeBranch = session.activeBranch || user.branch?.split(",")[0]?.trim() || "";
            filter = { branch: activeBranch };
          }
        }
        const [mProposals, pProposals] = await Promise.all([
          (prisma as any).maintenanceproposal.findMany({
            where: filter,
            include: { items: true },
            orderBy: { createdAt: "desc" }
          }),
          (prisma as any).purchasingproposal.findMany({
            where: filter,
            include: { items: true },
            orderBy: { createdAt: "desc" }
          })
        ]);
        const proposals = [...mProposals, ...pProposals].sort((a: any, b: any) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        for (const proposal of proposals) {
          const proposalCode = proposal.proposalCode;
          const poDetails = await (prisma as any).purchaseorderdetail.findMany({
            where: {
              purchaseorder: {
                purpose: {
                  contains: proposalCode
                },
                status: {
                  notIn: ["Tạo mới", "Từ chối"]
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
      }
      case "purchasing-proposals-direct": {
        const filter = await getUserModuleBranchFilter(user.id, "TM_DE_NGHI", session.activeBranch, {
          branchField: "branch",
          creatorField: "proposer"
        });
        const proposals = await (prisma as any).purchasingproposal.findMany({
          where: filter,
          include: { items: true },
          orderBy: { createdAt: "desc" }
        });
        for (const proposal of proposals) {
          const proposalCode = proposal.proposalCode;
          const poDetails = await (prisma as any).purchaseorderdetail.findMany({
            where: {
              purchaseorder: {
                purpose: { contains: proposalCode },
                status: { notIn: ["Tạo mới", "Từ chối"] }
              }
            },
            select: {
              proposalProductName: true,
              requestedQuantity: true,
              purchaseorder: { select: { status: true } }
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
      }
      case "purchasing-proposal-approvals": {
        const filter = await getUserModuleBranchFilter(user.id, "TM_PHE_DUYET_DE_NGHI", session.activeBranch, {
          branchField: "branch"
        });
        const proposals = await (prisma as any).purchasingproposal.findMany({
          where: {
            ...filter,
            status: { in: ["Chờ duyệt", "Chờ mua", "Đã phê duyệt", "Từ chối", "Hoàn thành"] }
          },
          include: { items: true },
          orderBy: { createdAt: "desc" }
        });
        for (const proposal of proposals) {
          const proposalCode = proposal.proposalCode;
          const poDetails = await (prisma as any).purchaseorderdetail.findMany({
            where: {
              purchaseorder: {
                purpose: { contains: proposalCode },
                status: { notIn: ["Tạo mới", "Từ chối"] }
              }
            },
            select: {
              proposalProductName: true,
              requestedQuantity: true,
              purchaseorder: { select: { status: true } }
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
      }
      case "payment-proposals": {
        const proposalsDb = await (prisma as any).paymentproposal.findMany({
          include: {
            items: true
          },
          orderBy: {
            createdAt: "desc"
          }
        });
        const proposals = proposalsDb.map((p: any) => ({
          id: p.id,
          proposalNumber: p.proposalNumber,
          date: p.date,
          proposer: p.proposer,
          supplierCode: p.supplierCode,
          supplierName: p.supplierName,
          accountInfo: p.accountInfo,
          purpose: p.purpose,
          status: p.status,
          note: p.note,
          createdAt: p.createdAt,
          items: p.items.map((item: any) => ({
            id: item.id,
            content: item.content,
            unit: item.unit,
            quantity: item.quantity,
            price: item.price,
            amount: item.amount,
            rate: item.rate,
            total: item.total
          }))
        }));
        return NextResponse.json(proposals);
      }
      case "payment-vouchers": {
        const vouchersDb = await (prisma as any).paymentvoucher.findMany({
          include: {
            items: true
          },
          orderBy: {
            createdAt: "desc"
          }
        });
        return NextResponse.json(vouchersDb);
      }
      case "receipt-vouchers": {
        const vouchersDb = await (prisma as any).receiptvoucher.findMany({
          orderBy: {
            createdAt: "desc"
          }
        });
        return NextResponse.json(vouchersDb);
      }

      case "weighing-slips": {
        const filter = await getUserModuleBranchFilter(user.id, "KT_CAN_XE", session.activeBranch, {
          branchField: "branch"
        });
        if ((filter as any).id === "NO_ACCESS") return NextResponse.json([]);
        return NextResponse.json(await prisma.weighingslip.findMany({
          where: filter,
          orderBy: { createdAt: "desc" }
        }));
      }
      default:
        return NextResponse.json({ error: "Invalid module" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: (error as any).message }, { status: 500 });
  }
}

