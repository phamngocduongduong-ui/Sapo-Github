import { prisma } from "@/lib/db";

export default async function SalesPage() {
  const orders = await prisma.order.findMany({
    include: { items: true },
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
