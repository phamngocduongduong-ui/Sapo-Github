import { prisma } from "@/lib/db";

export default async function ProductionPage() {
  const plans = await (prisma as any).productionplan.findMany({
    include: { order: true, productionplanitem: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
      <main className="main-content" style={{ padding: '2rem', width: '100%' }}>
        <h1 className="page-title">Phân hệ Sản xuất (Production)</h1>
        
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Form tạo kế hoạch sản xuất */}
          <div className="card" style={{ flex: '1', minWidth: '300px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Tạo Kế hoạch Sản xuất</h3>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Chọn Đơn hàng</label>
                <select name="orderId" className="input" required>
                  <option value="">-- Chọn đơn hàng chưa có kế hoạch --</option>
                  {/* Demo option */}
                  <option value="demo-1">ĐH: Áo thun - KH Nguyễn Văn A</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Ngày bắt đầu dự kiến</label>
                <input type="date" name="startDate" className="input" required />
              </div>
              <button type="button" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Tạo Kế hoạch (Chức năng Demo)
              </button>
            </form>
          </div>

          {/* Danh sách kế hoạch sản xuất */}
          <div className="card" style={{ flex: '2', minWidth: '400px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Danh sách Kế hoạch Sản xuất</h3>
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
                        <span className="badge badge-info">{plan.status}</span>
                      </td>
                      <td>{new Date(plan.createdAt).toLocaleDateString('vi-VN')}</td>
                    </tr>
                  ))}
                  {plans.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '1rem' }}>
                        Chưa có kế hoạch sản xuất nào.
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
