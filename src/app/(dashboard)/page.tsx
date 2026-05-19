import { prisma } from "@/lib/db";
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Bell, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  Edit3
} from "lucide-react";
import Link from "next/link";

export default async function OverviewPage() {
  let pendingLeaveCount = 0;
  let activeEmployeeCount = 0;
  let pendingContractCount = 0;

  try {
    pendingLeaveCount = await (prisma as any).leaverequest.count({
      where: { status: "Chờ phê duyệt" }
    });

    activeEmployeeCount = await prisma.employee.count({
      where: { status: "ACTIVE" }
    });

    pendingContractCount = await (prisma as any).laborcontract.count({
      where: { status: "Chờ phê duyệt" }
    });
  } catch (error) {
    console.error("Overview data fetch failed:", error);
  }

  const stats = [
    {
      title: "Nhân viên",
      value: activeEmployeeCount,
      label: "Đang làm việc",
      icon: <Users size={24} />,
      color: "#2563eb",
      bg: "#eff6ff",
      link: "/nhan-su/nhan-vien"
    },
    {
      title: "Nghỉ phép",
      value: pendingLeaveCount,
      label: "Chờ phê duyệt",
      icon: <Clock size={24} />,
      color: "#f59e0b",
      bg: "#fffbeb",
      link: "/nhan-su/phe-duyet"
    },
    {
      title: "Hợp đồng",
      value: pendingContractCount,
      label: "Chờ ký duyệt",
      icon: <FileText size={24} />,
      color: "#10b981",
      bg: "#ecfdf5",
      link: "/nhan-su/hop-dong"
    }
  ];

  return (
    <div style={{ padding: "2rem" }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#1e293b", margin: 0 }}>
          Chào buổi sáng! 👋
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.5rem", fontSize: "1rem" }}>
          Hệ thống đang hoạt động ổn định. Đây là tóm tắt công việc hôm nay.
        </p>
      </header>

      <style dangerouslySetInnerHTML={{ __html: `
        .stat-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          position: relative;
          overflow: hidden;
          border: 1px solid #f1f5f9;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          background-color: #fff;
          border-radius: 0.5rem;
          text-decoration: none;
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          border-color: #e2e8f0;
        }
        .quick-action-link {
          text-decoration: none;
          background: rgba(255,255,255,0.1);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          color: #fff;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s;
          display: block;
        }
        .quick-action-link:hover {
          background: rgba(255,255,255,0.2);
        }
      ` }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
        {stats.map((stat, idx) => (
          <Link href={stat.link} key={idx} className="stat-card">
            <div style={{ 
              width: "48px", 
              height: "48px", 
              borderRadius: "12px", 
              background: stat.bg, 
              color: stat.color,
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center"
            }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: "2rem", fontWeight: "800", color: "#1e293b" }}>{stat.value}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#64748b" }}>{stat.title} - {stat.label}</span>
                <ArrowRight size={16} color="#94a3b8" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: "3rem", display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        {/* Activity Feed */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#1e293b", margin: 0 }}>Hoạt động gần đây</h3>
            <button style={{ background: "none", border: "none", color: "#2563eb", fontWeight: "700", fontSize: "0.85rem", cursor: "pointer" }}>Xem tất cả</button>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#1e293b", fontWeight: "500" }}>
                  <strong>Admin</strong> đã phê duyệt <strong>2 đơn nghỉ phép</strong> mới.
                </p>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>10 phút trước</span>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#1e293b", fontWeight: "500" }}>
                  Hệ thống đã tự động đồng bộ dữ liệu <strong>Chấm công tháng 5</strong>.
                </p>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>1 giờ trước</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ padding: "1.5rem", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", border: "none" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#fff", marginBottom: "1.5rem", marginTop: 0 }}>Thao tác nhanh</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link href="/nhan-su/nhan-vien" className="quick-action-link">
              ➕ Thêm nhân viên mới
            </Link>
            <Link href="/nhan-su/hop-dong" className="quick-action-link">
              📄 Tạo hợp đồng lao động
            </Link>
            <Link href="/nhan-su/phe-duyet" className="quick-action-link">
              ✔️ Phê duyệt yêu cầu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
