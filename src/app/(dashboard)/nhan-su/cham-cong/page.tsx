export default function ChamCongPage() {
  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
        🕐 Chấm công
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Theo dõi thời gian làm việc và chấm công nhân viên
      </p>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0 }}>Bảng chấm công</h3>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>+</span>
            Ghi nhận
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "56px", textAlign: "center" }}>STT</th>
                <th>Nhân viên</th>
                <th>Ngày</th>
                <th>Giờ vào</th>
                <th>Giờ ra</th>
                <th>Số giờ làm</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#888", fontStyle: "italic" }}>
                  Chưa có dữ liệu chấm công. Nhấn &quot;Ghi nhận&quot; để bắt đầu.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
