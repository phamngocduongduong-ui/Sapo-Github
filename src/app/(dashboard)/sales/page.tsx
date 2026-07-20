import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

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

export default async function SalesPage() {
  const session = await getSession();
  const user = session?.userId
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  const position = await getUserPosition(user?.employeeName || null);
  const isAdmin = user?.username === "admin" || user?.role === "Admin";
  const isManager = isAdmin || user?.role?.includes("Trưởng phòng") || position.includes("Trưởng phòng") || position.includes("Giám đốc");
  const isStaff = !isManager;
  const userName = user?.employeeName || user?.username || "";

  let whereClause: any = {};
  if (isStaff && user) {
    const userContracts = await prisma.contract.findMany({
      where: { salesEmployee: userName },
      select: { contractNumber: true }
    });
    const contractNumbers = userContracts.map(c => c.contractNumber);
    const contractConditions = contractNumbers.map(num => ({
      note: { contains: `Hợp đồng: ${num}` }
    }));
    whereClause = {
      OR: [
        { employeeName: userName },
        ...contractConditions
      ]
    };
  }

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: { orderitem: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
      <main className="main-content" style={{ padding: '2rem', width: '100%' }}>
        <h1 className="page-title">Phân hệ Kinh doanh (Sales)</h1>
        
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Form tạo đơn hàng */}
          <div className="card" style={{ flex: '1', minWidth: '300px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Tạo Đơn hàng mới</h3>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tên Khách hàng</label>
                <input type="text" name="customerName" className="input" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Sản phẩm</label>
                <input type="text" name="product" className="input" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Số lượng</label>
                <input type="number" name="quantity" className="input" required min="1" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Ngày giao dự kiến</label>
                <input type="date" name="expectedDate" className="input" required />
              </div>
              <button type="button" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Tạo Đơn hàng (Chức năng Demo)
              </button>
            </form>
          </div>

          {/* Danh sách đơn hàng */}
          <div className="card" style={{ flex: '2', minWidth: '400px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Danh sách Đơn hàng</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã ĐH</th>
                    <th>Khách hàng</th>
                    <th>Ngày giao</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.orderCode}</td>
                      <td>{order.customerCode}</td>
                      <td>{order.requestDeliveryDate ? new Date(order.requestDeliveryDate).toLocaleDateString('vi-VN') : '—'}</td>
                      <td>
                        <span className="badge badge-warning">{order.status}</span>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '1rem' }}>
                        Chưa có đơn hàng nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
  );
}
