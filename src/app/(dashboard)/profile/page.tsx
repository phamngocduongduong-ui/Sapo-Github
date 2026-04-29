import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { updateAccountInfo } from "./actions";
import SalaryHistoryTimeline from "./SalaryHistoryTimeline";
import { 
  User as UserIcon, Mail, Phone, MapPin, Briefcase, Building, 
  Calendar, AlertTriangle, TrendingUp, Clock, FileText, Globe, UserCheck
} from "lucide-react";

export default async function ProfilePage({ 
  searchParams 
}: { 
  searchParams: { edit?: string } 
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const isEditing = searchParams.edit === "true";
  const now = new Date();
  const currentYear = now.getFullYear();

  const user = await prisma.user.findUnique({
    where: { username: session.username }
  });

  const empName = user?.employeeName || session.username;

  const employee = await prisma.employee.findFirst({
    where: { fullName: empName }
  });

  // Section 1 Data: Dashboard
  // New logic: Sum annualLeaveDays from Attendance table for the current year
  const attendanceRecords = await prisma.attendance.findMany({
    where: { 
      employeeCode: employee?.employeeCode || "",
      year: currentYear
    }
  });
  const usedLeaveDays = attendanceRecords.reduce((sum, rec) => sum + rec.annualLeaveDays, 0);
  const remainingLeaveDays = 12 - usedLeaveDays;

  const pendingLeaveCount = await prisma.leaveRequest.count({
    where: { employeeName: empName, status: "Chờ phê duyệt" }
  });

  const pendingSalaryCount = await prisma.salaryChange.count({
    where: { employeeName: empName, status: "Chờ phê duyệt" }
  });

  const violationCount = await prisma.violation.count({
    where: { 
      employeeName: empName,
      date: {
        gte: new Date(currentYear, 0, 1),
        lte: new Date(currentYear, 11, 31)
      }
    }
  });

  // Section 3 Data: Salary History
  const salaryHistory = await prisma.salaryChange.findMany({
    where: { employeeName: empName, status: "Đã phê duyệt" },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header Section */}
        <div className="card" style={{ padding: "2.5rem", marginBottom: "2rem", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "#fff", border: "none", borderRadius: "20px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}>
          <div style={{ display: "flex", gap: "2.5rem", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: "130px", height: "130px", borderRadius: "32px", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem", border: "2px solid rgba(255,255,255,0.2)", backdropFilter: "blur(10px)" }}>
                {empName.charAt(0)}
              </div>
              <div style={{ position: "absolute", bottom: "-5px", right: "-5px", width: "24px", height: "24px", background: "#10b981", borderRadius: "50%", border: "4px solid #0f172a" }}></div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <h1 style={{ margin: 0, fontSize: "2.5rem", fontWeight: 800, letterSpacing: "-0.025em" }}>{empName}</h1>
                <span style={{ background: "rgba(255,255,255,0.15)", padding: "4px 12px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)" }}>{employee?.employeeCode || "MS-XXXX"}</span>
              </div>
              <p style={{ margin: "0.75rem 0 0", fontSize: "1.1rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 500 }}>
                <Briefcase size={20} color="#3b82f6" /> {employee?.position || "Chuyên viên"} • <Building size={20} color="#3b82f6" /> {employee?.department || "Phòng ban"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", marginTop: "1.25rem" }}>
                <span style={{ fontSize: "0.95rem", color: "#cbd5e1", display: "flex", alignItems: "center", gap: "0.5rem" }}><UserIcon size={18} /> {employee?.gender || "—"}</span>
                <span style={{ fontSize: "0.95rem", color: "#cbd5e1", display: "flex", alignItems: "center", gap: "0.5rem" }}><Phone size={18} /> {employee?.phone || "—"}</span>
                <span style={{ fontSize: "0.95rem", color: "#cbd5e1", display: "flex", alignItems: "center", gap: "0.5rem" }}><Mail size={18} /> {employee?.email || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Dashboard Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
          <MetricCard title="Nghỉ phép còn lại" value={remainingLeaveDays} unit="ngày" icon={<Calendar color="#3b82f6" />} trend="Tiêu chuẩn 12 ngày" />
          <MetricCard title="Đề xuất nghỉ" value={pendingLeaveCount} unit="đơn" icon={<Clock color="#f59e0b" />} trend="Đang chờ phê duyệt" />
          <MetricCard title="Đề xuất lương" value={pendingSalaryCount} unit="đơn" icon={<TrendingUp color="#10b981" />} trend="Đang chờ phê duyệt" />
          <MetricCard title="Vi phạm năm nay" value={violationCount} unit="lần" icon={<AlertTriangle color="#ef4444" />} trend="Tuân thủ nội quy" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "2rem", alignItems: "start" }}>
          {/* Section 2: General Information */}
          <div className="card" style={{ padding: "0", borderRadius: "20px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem 2rem", background: "#fff", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.75rem", fontWeight: 700 }}>
                <UserCheck size={22} color="#3b82f6" /> Liên hệ & Cá nhân
              </h3>
              {!isEditing ? (
                <a href="/profile?edit=true" className="btn btn-sm btn-outline" style={{ borderRadius: "8px", padding: "6px 16px", fontSize: "0.85rem" }}>Chỉnh sửa hồ sơ</a>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#3b82f6", fontSize: "0.85rem", fontWeight: 600 }}>
                  <div className="spinner-small"></div> Đang chỉnh sửa
                </div>
              )}
            </div>

            <form action={updateAccountInfo} style={{ background: "#fff" }}>
              {/* Truyền các trường ẩn để action không làm mất dữ liệu cũ của các trường không cho sửa */}
              <input type="hidden" name="fullName" value={empName} />
              <input type="hidden" name="position" value={employee?.position || ""} />
              <input type="hidden" name="department" value={employee?.department || ""} />
              <input type="hidden" name="gender" value={employee?.gender || ""} />

              <div style={{ padding: "2rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                  {/* Row 1 */}
                  <InfoItem label="Số CCCD" name="idCardNumber" value={employee?.idCardNumber || "—"} editing={isEditing} />
                  <InfoItem label="Ngày cấp" name="idCardDate" type="date" value={employee?.idCardDate ? new Date(employee.idCardDate).toISOString().split('T')[0] : ""} displayValue={employee?.idCardDate ? new Date(employee.idCardDate).toLocaleDateString("vi-VN") : "—"} editing={isEditing} />
                  
                  {/* Row 2 */}
                  <InfoItem label="Số điện thoại" name="phone" value={employee?.phone || "—"} editing={isEditing} />
                  <InfoItem label="Email" name="email" value={employee?.email || "—"} editing={isEditing} />
                  
                  {/* Row 3 */}
                  <InfoItem 
                    label="Tình trạng hôn nhân" 
                    name="maritalStatus" 
                    value={employee?.maritalStatus || ""} 
                    displayValue={employee?.maritalStatus === "Có" ? "Đã kết hôn" : "Độc thân"}
                    editing={isEditing} 
                    renderInput={() => (
                      <select name="maritalStatus" className="form-control" defaultValue={employee?.maritalStatus || ""} style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.95rem" }}>
                        <option value="">Độc thân</option>
                        <option value="Có">Đã kết hôn</option>
                      </select>
                    )}
                  />
                  <InfoItem 
                    label="Trình độ học vấn" 
                    name="educationLevel" 
                    value={employee?.educationLevel || ""} 
                    editing={isEditing} 
                    renderInput={() => (
                      <select name="educationLevel" className="form-control" defaultValue={employee?.educationLevel || ""} style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.95rem" }}>
                        <option value="">-- Chọn trình độ --</option>
                        {["Thạc sĩ", "Đại học", "Cao đẳng", "Trung cấp", "Lao động phổ thông"].map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    )}
                  />
                  
                  {/* Row 4 */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <InfoItem label="Địa chỉ hiện tại" name="address" value={employee?.address || "—"} editing={isEditing} />
                  </div>
                </div>
              </div>

              {isEditing && (
                <div style={{ padding: "1.5rem 2rem", background: "#f8fafc", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                  <a href="/profile" className="btn btn-outline" style={{ borderRadius: "8px" }}>Hủy bỏ</a>
                  <button type="submit" className="btn btn-primary" style={{ borderRadius: "8px", padding: "8px 24px" }}>Cập nhật ngay</button>
                </div>
              )}
            </form>
          </div>

          {/* Section 3: Salary History Timeline */}
          <SalaryHistoryTimeline history={salaryHistory as any} />
        </div>
      </div>
      
      <style>{`
        .spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid #3b82f6;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

function MetricCard({ title, value, unit, icon, trend }: { title: string, value: any, unit: string, icon: any, trend: string }) {
  return (
    <div className="card" style={{ padding: "1.5rem", border: "none", borderRadius: "20px", display: "flex", flexDirection: "column", gap: "1rem", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", transition: "all 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ background: "#f8fafc", padding: "0.6rem", borderRadius: "12px", border: "1px solid #f1f5f9" }}>{icon}</div>
        <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600, background: "#f0fdf4", padding: "2px 8px", borderRadius: "10px" }}>Ổn định</span>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
          <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#1e293b", letterSpacing: "-0.025em" }}>{value}</span>
          <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 500 }}>{unit}</span>
        </div>
        <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: "0.4rem", fontWeight: 500 }}>{title}</div>
      </div>
      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem", fontSize: "0.75rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#cbd5e1" }}></div> {trend}
      </div>
    </div>
  );
}

function InfoItem({ 
  label, value, name, editing, type = "text", displayValue, renderInput 
}: { 
  label: string, value: string, name: string, editing: boolean, type?: string, displayValue?: string, renderInput?: () => React.ReactNode 
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <label style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {editing ? (
        renderInput ? renderInput() : <input type={type} name={name} className="form-control" defaultValue={value} style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.95rem" }} />
      ) : (
        <div style={{ fontSize: "1rem", color: "#334155", fontWeight: 600, padding: "0.2rem 0" }}>{displayValue || value}</div>
      )}
    </div>
  );
}
