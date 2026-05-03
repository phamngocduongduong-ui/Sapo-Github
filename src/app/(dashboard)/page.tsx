import { prisma } from "@/lib/db";

export default async function OverviewPage() {
  // Lấy số đơn nghỉ phép chờ phê duyệt
  const pendingLeaveCount = await (prisma as any).leaverequest.count({
    where: { status: "Chờ phê duyệt" }
  });

  // Lấy số nhân viên đang sử dụng từ Prisma
  const activeEmployeeCount = await prisma.employee.count({
    where: { status: "ACTIVE" }
  });

  const stats = [
    {
      title: "Đơn nghỉ phép",
      value: pendingLeaveCount,
      label: "Đang chờ phê duyệt",
      icon: "🏖️",
      color: "#3498db",
      bg: "rgba(52, 152, 219, 0.1)"
    },
    {
      title: "Tổng nhân viên",
      value: activeEmployeeCount,
      label: "Đang làm việc",
      icon: "🧑‍💼",
      color: "#27ae60",
      bg: "rgba(39, 174, 96, 0.1)"
    }
  ];

  return (
    <main className="main-content" style={{ width: "100%" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h1 className="page-title" style={{ marginBottom: "0.5rem" }}>📊 Tổng quan hệ thống</h1>
        <p style={{ color: "#888", fontSize: "0.95rem" }}>Chào mừng bạn quay trở lại. Đây là tóm tắt tình hình nhân sự hiện tại.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {stats.map((stat, idx) => (
          <div key={idx} className="card" style={{ 
            padding: "1.5rem", 
            display: "flex", 
            alignItems: "center", 
            gap: "1.5rem",
            borderLeft: `5px solid ${stat.color}`,
            transition: "transform 0.2s ease",
            cursor: "default"
          }}>
            <div style={{ 
              width: "64px", 
              height: "64px", 
              borderRadius: "16px", 
              background: stat.bg, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: "2rem" 
            }}>
              {stat.icon}
            </div>
            <div>
              <h4 style={{ margin: 0, color: "#888", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>{stat.title}</h4>
              <div style={{ fontSize: "2rem", fontWeight: 700, margin: "0.25rem 0", color: "#2c3e50" }}>{stat.value}</div>
              <div style={{ fontSize: "0.85rem", color: stat.color, fontWeight: 600 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Trang trí thêm báo cáo giả lập để trông "đẹp" hơn */}
      <div style={{ marginTop: "2.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "1.5rem" }}>📈 Biểu đồ tăng trưởng (Minh họa)</h3>
          <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "1rem", padding: "0 1rem" }}>
             {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
               <div key={i} style={{ flex: 1, background: "linear-gradient(to top, #3498db, #5dade2)", height: `${h}%`, borderRadius: "4px 4px 0 0" }}></div>
             ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", color: "#888", fontSize: "0.8rem" }}>
            <span>Thứ 2</span><span>Thứ 3</span><span>Thứ 4</span><span>Thứ 5</span><span>Thứ 6</span><span>Thứ 7</span><span>CN</span>
          </div>
        </div>
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "1.5rem" }}>🔔 Thông báo mới</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ fontSize: "0.9rem", paddingBottom: "0.75rem", borderBottom: "1px solid #eee" }}>
              <strong>Hệ thống:</strong> Đã cập nhật tính năng báo cáo mới.
            </div>
            <div style={{ fontSize: "0.9rem", paddingBottom: "0.75rem", borderBottom: "1px solid #eee" }}>
              <strong>Nhân sự:</strong> Có 2 nhân viên mới vừa gia nhập.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
