import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { updateAccountInfo, createSalaryRequest } from "./actions";
import SalaryHistoryTimeline from "./SalaryHistoryTimeline";
import SalaryIncreaseTable from "./SalaryIncreaseTable";
import {
  User as UserIcon, Mail, Phone, MapPin, Briefcase, Building,
  Calendar, AlertTriangle, TrendingUp, Clock, FileText, Globe,
  UserCheck, CreditCard, Award, ShieldAlert, FileSignature
} from "lucide-react";

export default async function ProfilePage({
  searchParams
}: {
  searchParams: { edit?: string, tab?: string }
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const isEditing = searchParams.edit === "true";
  const now = new Date();
  const currentYear = now.getFullYear();

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  const empName = user?.employeeName || session.username;

  const employee = await prisma.employee.findFirst({
    where: { fullName: empName }
  });

  // Map tab aliases
  let activeTab = searchParams.tab || "1";
  if (activeTab === "info") activeTab = "1";
  if (activeTab === "contracts") activeTab = "2";
  if (activeTab === "attendance") activeTab = "3";
  if (activeTab === "salary") activeTab = "4";

  // Section 1 Data: Dashboard
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      employeeCode: employee?.employeeCode || "",
      year: currentYear
    },
    orderBy: { month: "asc" }
  });
  const usedLeaveDays = attendanceRecords.reduce((sum, rec) => sum + rec.annualLeaveDays, 0);
  const remainingLeaveDays = 12 - usedLeaveDays;

  const pendingLeaveCount = await (prisma as any).leaverequest.count({
    where: { employeeName: empName, status: "Chờ phê duyệt" }
  });

  const pendingSalaryCount = await (prisma as any).salarychange.count({
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
  const salaryHistory = await (prisma as any).salarychange.findMany({
    where: { employeeName: empName, status: "Đã phê duyệt" },
    orderBy: { createdAt: "desc" }
  });

  // Active Contracts
  const contracts = await (prisma as any).laborcontract.findMany({
    where: { employeeName: empName },
    orderBy: { createdAt: "desc" }
  });

  // Leave Requests
  const leaveRequests = await (prisma as any).leaverequest.findMany({
    where: { employeeName: empName },
    orderBy: { createdAt: "desc" }
  });

  // Salary Increase Requests
  const salaryRequests = await (prisma as any).salaryincreaserequest.findMany({
    where: { employeeName: empName },
    orderBy: { createdAt: "desc" }
  });

  const calculateSeniority = (startDate: string | Date | null) => {
    if (!startDate) return "—";
    const start = new Date(startDate);
    const diff = now.getTime() - start.getTime();
    const years = diff / (1000 * 60 * 60 * 24 * 365.25);
    const months = Math.floor((years % 1) * 12);

    if (years < 1) {
      const days = Math.floor(years * 365.25);
      if (days < 30) return `${days} ngày`;
      return `${months} tháng`;
    }
    return `${Math.floor(years)} năm ${months > 0 ? months + ' tháng' : ''}`;
  };

  const getSeniorityTier = (startDate: string | Date | null) => {
    if (!startDate) return { name: "Thành viên mới", class: "bronze" };
    const start = new Date(startDate);
    const years = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (years >= 5) return { name: "Cống hiến xuất sắc", class: "diamond" };
    if (years >= 3) return { name: "Thành viên Gắn bó", class: "gold" };
    if (years >= 1) return { name: "Thành viên Ổn định", class: "silver" };
    return { name: "Thành viên mới", class: "bronze" };
  };

  const tier = getSeniorityTier(employee?.startDate);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Base-style Elegant White Header Card */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "15px 24px", marginBottom: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <div style={{
                width: "96px",
                height: "96px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0072bc 0%, #005a96 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.75rem",
                fontWeight: 700,
                border: "4px solid #ffffff",
                boxShadow: "0 4px 10px rgba(0,72,188,0.15)"
              }}>
                {empName.charAt(0)}
              </div>
              <div style={{ position: "absolute", bottom: "2px", right: "2px", width: "18px", height: "18px", background: "#10b981", borderRadius: "50%", border: "3px solid #ffffff" }}></div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "#1e293b" }}>{empName}</h1>
                <span style={{ background: "#eff6ff", color: "#0072bc", padding: "3px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600, border: "1px solid #bfdbfe" }}>
                  {employee?.employeeCode || "MS-XXXX"}
                </span>
                <span className={`seniority-badge-header ${tier.class}`}>
                  {tier.name}
                </span>
              </div>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.95rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Briefcase size={16} color="#0072bc" /> <span style={{ fontWeight: 600, color: "#475569" }}>{employee?.position || "Chuyên viên"}</span>
                <span style={{ color: "#cbd5e1" }}>•</span>
                <Building size={16} color="#0072bc" /> <span style={{ fontWeight: 600, color: "#475569" }}>{employee?.department || "Phòng ban"}</span>
                {employee?.branch && (
                  <>
                    <span style={{ color: "#cbd5e1" }}>•</span>
                    <MapPin size={16} color="#0072bc" /> <span style={{ fontWeight: 600, color: "#475569" }}>{employee?.branch}</span>
                  </>
                )}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", marginTop: "1rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
                <span style={{ fontSize: "0.85rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.4rem" }}><Mail size={15} /> {employee?.email || "Chưa thiết lập"}</span>
                <span style={{ fontSize: "0.85rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.4rem" }}><Phone size={15} /> {employee?.phone || "Chưa thiết lập"}</span>
                <span style={{ fontSize: "0.85rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.4rem" }}><Calendar size={15} /> Ngày gia nhập: {employee?.startDate ? new Date(employee.startDate).toLocaleDateString("vi-VN") : "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Base-style Dual Column Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* Left Navigation Sidebar */}
          <div className="sidebar-menu-base">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Danh mục hồ sơ
            </div>
            <a href="/profile?tab=1" className={`menu-item-base ${activeTab === "1" ? "active" : ""}`}>
              <UserIcon size={18} />
              <span>Thông tin cá nhân</span>
            </a>
            <a href="/profile?tab=2" className={`menu-item-base ${activeTab === "2" ? "active" : ""}`}>
              <FileSignature size={18} />
              <span>Công việc & Hợp đồng</span>
            </a>
            <a href="/profile?tab=3" className={`menu-item-base ${activeTab === "3" ? "active" : ""}`}>
              <Calendar size={18} />
              <span>Nghỉ phép & Chuyên cần</span>
            </a>
            <a href="/profile?tab=4" className={`menu-item-base ${activeTab === "4" ? "active" : ""}`}>
              <TrendingUp size={18} />
              <span>Lịch sử & Đề xuất lương</span>
            </a>
          </div>

          {/* Right Main Content Pane */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>

            {/* TAB 1: THÔNG TIN CÁ NHÂN */}
            {activeTab === "1" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                    <UserCheck size={20} color="#0072bc" /> Hồ sơ liên hệ & Định danh
                  </h3>
                  {!isEditing ? (
                    <a href="/profile?tab=1&edit=true" className="btn-base btn-outline" style={{ padding: "6px 14px", borderRadius: "6px" }}>
                      Hiệu chỉnh hồ sơ
                    </a>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#0072bc", fontSize: "0.85rem", fontWeight: 600 }}>
                      <div className="spinner-small-base"></div> Chế độ chỉnh sửa
                    </div>
                  )}
                </div>

                <form action={updateAccountInfo} style={{ background: "#ffffff" }}>
                  <input type="hidden" name="fullName" value={empName} />
                  <input type="hidden" name="position" value={employee?.position || ""} />
                  <input type="hidden" name="department" value={employee?.department || ""} />
                  <input type="hidden" name="gender" value={employee?.gender || "Nam"} />
                  <input type="hidden" name="branch" value={employee?.branch || ""} />

                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>

                      <InfoItemBase label="Số CCCD / Hộ chiếu" name="idCardNumber" value={employee?.idCardNumber || "—"} editing={isEditing} />
                      <InfoItemBase
                        label="Ngày cấp"
                        name="idCardDate"
                        type="date"
                        value={employee?.idCardDate ? new Date(employee.idCardDate).toISOString().split('T')[0] : ""}
                        displayValue={employee?.idCardDate ? new Date(employee.idCardDate).toLocaleDateString("vi-VN") : "—"}
                        editing={isEditing}
                      />

                      <InfoItemBase label="Số điện thoại cá nhân" name="phone" value={employee?.phone || "—"} editing={isEditing} />
                      <InfoItemBase label="Địa chỉ Email" name="email" value={employee?.email || "—"} editing={isEditing} />

                      <InfoItemBase
                        label="Tình trạng hôn nhân"
                        name="maritalStatus"
                        value={employee?.maritalStatus || ""}
                        displayValue={employee?.maritalStatus === "Có" ? "Đã kết hôn" : "Độc thân"}
                        editing={isEditing}
                        renderInput={() => (
                          <select name="maritalStatus" className="select-base" defaultValue={employee?.maritalStatus || ""}>
                            <option value="">Độc thân</option>
                            <option value="Có">Đã kết hôn</option>
                          </select>
                        )}
                      />
                      <InfoItemBase
                        label="Trình độ học vấn"
                        name="educationLevel"
                        value={employee?.educationLevel || ""}
                        editing={isEditing}
                        renderInput={() => (
                          <select name="educationLevel" className="select-base" defaultValue={employee?.educationLevel || ""}>
                            <option value="">-- Chọn trình độ --</option>
                            {["Thạc sĩ", "Đại học", "Cao đẳng", "Trung cấp", "Lao động phổ thông"].map(level => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        )}
                      />

                      <div style={{ gridColumn: "1 / -1" }}>
                        <InfoItemBase label="Địa chỉ cư trú hiện tại" name="address" value={employee?.address || "—"} editing={isEditing} />
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div style={{ padding: "1.25rem 1.75rem", background: "#f8fafc", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                      <a href="/profile?tab=1" className="btn-base btn-outline" style={{ borderRadius: "6px" }}>Hủy bỏ</a>
                      <button type="submit" className="btn-base btn-primary" style={{ borderRadius: "6px", padding: "8px 20px" }}>Cập nhật thông tin</button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* TAB 2: CÔNG VIỆC & HỢP ĐỒNG */}
            {activeTab === "2" && (
              <div>
                <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                    <Briefcase size={20} color="#0072bc" /> Thông tin Công sự & Tuyển dụng
                  </h3>
                </div>

                <div style={{ padding: "16px 20px" }}>

                  {/* Job specifications */}
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", color: "#475569", fontWeight: 700 }}>📊 Vị trí và Thâm niên</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "1.25rem" }}>
                    <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 700 }}>Mã nhân sự</span>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>{employee?.employeeCode || "MS-XXXX"}</div>
                    </div>
                    <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 700 }}>Thâm niên công tác</span>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", marginTop: "4px" }}>{calculateSeniority(employee?.startDate)}</div>
                    </div>
                    <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: 700 }}>Hạng thành viên</span>
                      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0072bc", marginTop: "4px" }}>{tier.name}</div>
                    </div>
                  </div>

                  {/* Labor Contract Details */}
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", color: "#475569", fontWeight: 700 }}>📄 Hợp đồng lao động hiện tại</h4>
                  {contracts.length > 0 ? (
                    contracts.map((contract: any, index: number) => (
                      <div key={contract.id} style={{
                        background: index === 0 ? "#ffffff" : "#fafafa",
                        border: "1px solid " + (index === 0 ? "#bfdbfe" : "#e2e8f0"),
                        borderLeft: "5px solid " + (index === 0 ? "#0072bc" : "#94a3b8"),
                        borderRadius: "8px",
                        padding: "1.25rem",
                        marginBottom: "1rem"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                          <div>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: index === 0 ? "#0072bc" : "#475569" }}>
                              {contract.contractType}
                            </span>
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                              Số hợp đồng: <strong>{contract.contractNumber}</strong>
                            </div>
                          </div>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            background: contract.status === "Đã phê duyệt" ? "#f0fdf4" : "#fff7ed",
                            color: contract.status === "Đã phê duyệt" ? "#16a34a" : "#ea580c",
                            border: "1px solid " + (contract.status === "Đã phê duyệt" ? "#bbf7d0" : "#ffedd5")
                          }}>
                            {contract.status}
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", fontSize: "13px", color: "#475569" }}>
                          <div>📅 Ngày ký: <strong>{new Date(contract.contractDate).toLocaleDateString("vi-VN")}</strong></div>
                          <div>📅 Hiệu lực: <strong>{new Date(contract.startDate).toLocaleDateString("vi-VN")}</strong></div>
                          <div>📅 Hết hạn: <strong>{contract.endDate ? new Date(contract.endDate).toLocaleDateString("vi-VN") : "Vô thời hạn"}</strong></div>
                          <div>💰 Lương cơ bản: <strong>{contract.salaryBase?.toLocaleString("vi-VN")} VNĐ</strong></div>
                          <div>🛡️ BHXH đóng: <strong>{contract.socialInsurance?.toLocaleString("vi-VN")} VNĐ</strong></div>
                          <div>🏷️ Bậc lương: <strong>{contract.salaryLevel || "—"}</strong></div>
                        </div>

                        {contract.note && (
                          <div style={{ marginTop: "0.75rem", fontSize: "12px", color: "#64748b", fontStyle: "italic", background: "#f8fafc", padding: "0.5rem 0.75rem", borderRadius: "4px" }}>
                            Ghi chú hợp đồng: "{contract.note}"
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: "center", padding: "2.5rem", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", color: "#94a3b8" }}>
                      <FileText size={40} style={{ margin: "0 auto 10px", opacity: 0.6 }} />
                      <p style={{ margin: 0, fontSize: "13px" }}>Chưa lập hợp đồng lao động trên hệ thống.</p>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* TAB 3: NGHỈ PHÉP & CHUYÊN CẦN */}
            {activeTab === "3" && (
              <div>
                <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                    <Calendar size={20} color="#0072bc" /> Quản lý Chuyên cần & Nghỉ phép
                  </h3>
                </div>

                <div style={{ padding: "16px 20px" }}>

                  {/* Dashboard Metrics inside tabs */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
                    <MetricCardBase title="Nghỉ phép còn lại" value={remainingLeaveDays} unit="ngày" icon={<Calendar color="#0072bc" size={18} />} trend="Tiêu chuẩn 12 ngày" />
                    <MetricCardBase title="Đề xuất nghỉ chờ duyệt" value={pendingLeaveCount} unit="đơn" icon={<Clock color="#f59e0b" size={18} />} trend="Quy trình tự động" />
                    <MetricCardBase title="Đề xuất lương chờ duyệt" value={pendingSalaryCount} unit="đơn" icon={<TrendingUp color="#16a34a" size={18} />} trend="Đang chờ HR" />
                    <MetricCardBase title="Vi phạm năm nay" value={violationCount} unit="lần" icon={<AlertTriangle color="#ef4444" size={18} />} trend="Cam kết tuân thủ" />
                  </div>

                  {/* Attendance table overview */}
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", color: "#475569", fontWeight: 700 }}>📊 Bảng chuyên cần năm {currentYear}</h4>
                  <div style={{ overflowX: "auto", marginBottom: "2rem", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                          <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 700 }}>Tháng</th>
                          <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 700 }}>Công quy chuẩn</th>
                          <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 700 }}>Công thực tế</th>
                          <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 700 }}>Số ngày phép hưởng lương</th>
                          <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 700 }}>Nghỉ không lương</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRecords.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>
                              Chưa có bản ghi chuyên cần nào trong năm nay.
                            </td>
                          </tr>
                        ) : (
                          attendanceRecords.map((rec) => (
                            <tr key={rec.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e293b" }}>Tháng {rec.month}</td>
                              <td style={{ padding: "10px 12px", color: "#475569" }}>26 ngày</td>
                              <td style={{ padding: "10px 12px", fontWeight: 600, color: "#0072bc" }}>{26 - rec.unpaidLeaveDays} ngày</td>
                              <td style={{ padding: "10px 12px", color: "#16a34a", fontWeight: 600 }}>{rec.annualLeaveDays} ngày</td>
                              <td style={{ padding: "10px 12px", color: "#ef4444" }}>{rec.unpaidLeaveDays} ngày</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Leave history */}
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", color: "#475569", fontWeight: 700 }}>📋 Lịch sử đề xuất nghỉ phép</h4>
                  <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                          <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 700 }}>Ngày đề xuất</th>
                          <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 700 }}>Bắt đầu</th>
                          <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 700 }}>Kết thúc</th>
                          <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 700 }}>Số ngày</th>
                          <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 700 }}>Lý do</th>
                          <th style={{ padding: "10px 12px", color: "#475569", fontWeight: 700 }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveRequests.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>
                              Chưa có đề xuất nghỉ phép nào.
                            </td>
                          </tr>
                        ) : (
                          leaveRequests.map((req: any) => (
                            <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px 12px", color: "#64748b" }}>{new Date(req.createdAt).toLocaleDateString("vi-VN")}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 600 }}>{new Date(req.startDate).toLocaleDateString("vi-VN")}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 600 }}>{new Date(req.endDate).toLocaleDateString("vi-VN")}</td>
                              <td style={{ padding: "10px 12px", color: "#0072bc", fontWeight: 700 }}>{req.durationDays} ngày</td>
                              <td style={{ padding: "10px 12px", color: "#475569" }}>{req.reason}</td>
                              <td style={{ padding: "10px 12px" }}>
                                <span style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: req.status === "Đã phê duyệt" ? "#f0fdf4" : req.status === "Từ chối" ? "#fef2f2" : "#fff7ed",
                                  color: req.status === "Đã phê duyệt" ? "#16a34a" : req.status === "Từ chối" ? "#ef4444" : "#ea580c"
                                }}>
                                  {req.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 4: LỊCH SỬ & ĐỀ XUẤT LƯƠNG */}
            {activeTab === "4" && (
              <div>
                <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                    <TrendingUp size={20} color="#0072bc" /> Quản lý Lương & Chế độ đãi ngộ
                  </h3>
                </div>

                <div style={{ padding: "16px 20px" }}>

                  {/* Outer flex for Salary timeline and requests */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "1.5rem", alignItems: "start" }}>

                    {/* Left: Timeline component */}
                    <div>
                      <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.95rem", color: "#475569", fontWeight: 700 }}>📈 Tiến trình tăng lương</h4>
                      <SalaryHistoryTimeline history={salaryHistory as any} />
                    </div>

                    {/* Right: Salary proposals table */}
                    <div>
                      <SalaryIncreaseTable
                        initialRequests={salaryRequests as any}
                        onAddRequest={createSalaryRequest}
                      />
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Dynamic styling for Base.vn styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        * {
          font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        }
        .sidebar-menu-base {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          padding: 8px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 4px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
        }
        .menu-item-base {
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 10px 16px !important;
          border-radius: 8px !important;
          color: #475569 !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          text-decoration: none !important;
          transition: all 0.2s ease !important;
        }
        .menu-item-base:hover {
          background: #f1f5f9 !important;
          color: #1e293b !important;
        }
        .menu-item-base.active {
          background: #eff6ff !important;
          color: #0072bc !important;
          font-weight: 700 !important;
        }
        .seniority-badge-header {
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          padding: 3px 10px !important;
          border-radius: 12px !important;
          border: 1px solid transparent !important;
        }
        .seniority-badge-header.diamond {
          background: #faf5ff !important;
          color: #7c3aed !important;
          border-color: #ddd6fe !important;
        }
        .seniority-badge-header.gold {
          background: #fefcbf !important;
          color: #b7791f !important;
          border-color: #fef08a !important;
        }
        .seniority-badge-header.silver {
          background: #f1f5f9 !important;
          color: #475569 !important;
          border-color: #e2e8f0 !important;
        }
        .seniority-badge-header.bronze {
          background: #fff7ed !important;
          color: #c2410c !important;
          border-color: #ffedd5 !important;
        }
        .select-base {
          width: 100% !important;
          padding: 8px 12px !important;
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
          font-size: 13px !important;
          background-color: #ffffff !important;
          color: #334155 !important;
          outline: none !important;
          transition: border-color 0.2s !important;
        }
        .select-base:focus {
          border-color: #0072bc !important;
        }
        .input-text-base {
          width: 100% !important;
          padding: 8px 12px !important;
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
          font-size: 13px !important;
          outline: none !important;
          transition: border-color 0.2s !important;
          color: #334155 !important;
        }
        .input-text-base:focus {
          border-color: #0072bc !important;
        }
        .spinner-small-base {
          width: 14px !important;
          height: 14px !important;
          border: 2px solid #0072bc !important;
          border-top-color: transparent !important;
          border-radius: 50% !important;
          animation: spin-base 0.8s linear infinite !important;
        }
        @keyframes spin-base {
          to { transform: rotate(360deg); }
        }
      ` }} />
    </div>
  );
}

function MetricCardBase({ title, value, unit, icon, trend }: { title: string, value: any, unit: string, icon: any, trend: string }) {
  return (
    <div style={{
      padding: "1.25rem",
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem",
      boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ background: "#eff6ff", padding: "6px", borderRadius: "6px" }}>{icon}</div>
        <span style={{ fontSize: "10px", color: "#16a34a", fontWeight: 700, background: "#f0fdf4", padding: "1px 6px", borderRadius: "4px" }}>Active</span>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
          <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1e293b" }}>{value}</span>
          <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>{unit}</span>
        </div>
        <div style={{ color: "#64748b", fontSize: "11px", marginTop: "2px", fontWeight: 600 }}>{title}</div>
      </div>
      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem", fontSize: "10px", color: "#94a3b8" }}>
        {trend}
      </div>
    </div>
  );
}

function InfoItemBase({
  label, value, name, editing, type = "text", displayValue, renderInput
}: {
  label: string, value: string, name: string, editing: boolean, type?: string, displayValue?: string, renderInput?: () => React.ReactNode
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label style={{ color: "#64748b", fontSize: "13px", fontWeight: 700, letterSpacing: "0.025em" }}>
        {label}
      </label>
      {editing ? (
        renderInput ? renderInput() : <input type={type} name={name} className="input-text-base" defaultValue={value} />
      ) : (
        <div style={{ fontSize: "13px", color: "#1e293b", fontWeight: 600, padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
          {displayValue || value}
        </div>
      )}
    </div>
  );
}
