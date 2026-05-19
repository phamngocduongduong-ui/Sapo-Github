import { prisma } from "@/lib/db";

export default async function PurchasingPage() {
  const plans = await (prisma as any).purchasingplan.findMany({
    include: { order: true, purchasingplanitem: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
      <main className="main-content" style={{ padding: '2rem', width: '100%' }}>
        <h1 className="page-title">Phân hệ Mua hàng (Purchasing)</h1>
        
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Form tạo kế hoạch thu mua */}
          <div className="card" style={{ flex: '1', minWidth: '300px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Tạo Kế hoạch Thu mua NVL</h3>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Chọn Đơn hàng</label>
                <select name="orderId" className="input" required>
                  <option value="">-- Chọn đơn hàng --</option>
                  {/* Demo option */}
                  <option value="demo-1">ĐH: Áo thun - KH Nguyễn Văn A</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nguyên vật liệu cần mua</label>
                <input type="text" name="material" className="input" placeholder="Ví dụ: Vải cotton" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Số lượng</label>
                <input type="number" name="quantity" className="input" required min="1" />
              </div>
              <button type="button" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Lưu Kế hoạch (Chức năng Demo)
              </button>
            </form>
          </div>

          {/* Danh sách kế hoạch thu mua */}
          <div className="card" style={{ flex: '2', minWidth: '400px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Danh sách Thu mua</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã Kế hoạch</th>
                    <th>Mã Đơn hàng</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>{plan.id.slice(0, 8)}</td>
                      <td>{plan.orderId.slice(0, 8)}</td>
                      <td>
                        <span className="badge badge-warning">{plan.status}</span>
                      </td>
                      <td>{new Date(plan.createdAt).toLocaleDateString('vi-VN')}</td>
                    </tr>
                  ))}
                  {plans.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '1rem' }}>
                        Chưa có kế hoạch thu mua nào.
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
