"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateApprovalStatus } from "./actions";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { MoreHorizontal, CheckCircle, XCircle, RotateCcw } from "lucide-react";

interface ApprovalTabsProps {
  pending: any;
  approved: any;
}

export default function ApprovalTabs({ pending, approved }: ApprovalTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"contract" | "leave" | "resignation" | "transfer" | "salary" | "all">("contract");
  const [isPending, startTransition] = useTransition();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("down");

  // Confirmation state
  const [confirmState, setConfirmState] = useState<{
    show: boolean;
    id: string;
    type: string;
    action: string;
    label: string;
  }>({
    show: false,
    id: "",
    type: "",
    action: "",
    label: ""
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Helper to flatten and label data
  const flattenData = (data: any) => {
    const list: any[] = [];
    if (data.contracts) data.contracts.forEach((item: any) => list.push({ ...item, moduleLabel: "Hợp đồng", moduleType: "LaborContract" }));
    if (data.leaves) data.leaves.forEach((item: any) => list.push({ ...item, moduleLabel: "Nghỉ phép", moduleType: "LeaveRequest" }));
    if (data.salaryChanges) data.salaryChanges.forEach((item: any) => list.push({ ...item, moduleLabel: "Tăng, giảm lương", moduleType: "SalaryChange" }));
    if (data.transfers) data.transfers.forEach((item: any) => list.push({ ...item, moduleLabel: "Thuyên chuyển, bổ nhiệm", moduleType: "TransferPromotion" }));
    if (data.resignations) data.resignations.forEach((item: any) => list.push({ ...item, moduleLabel: "Nghỉ việc", moduleType: "Resignation" }));
    if (data.payrolls) data.payrolls.forEach((item: any) => list.push({ ...item, moduleLabel: "Bảng lương", moduleType: "Payroll" }));
    if (data.purchaseOrders) data.purchaseOrders.forEach((item: any) => list.push({ ...item, moduleLabel: "Lệnh mua", moduleType: "PurchaseOrder" }));

    return list.sort((a, b) => new Date(b.createdAt || b.requestDate || b.planDate).getTime() - new Date(a.createdAt || a.requestDate || a.planDate).getTime());
  };

  const getFilteredList = () => {
    switch (activeTab) {
      case "contract":
        return flattenData({ contracts: pending.contracts || [] });
      case "leave":
        return flattenData({ leaves: pending.leaves || [] });
      case "resignation":
        return flattenData({ resignations: pending.resignations || [] });
      case "transfer":
        return flattenData({ transfers: pending.transfers || [] });
      case "salary":
        return flattenData({ salaryChanges: pending.salaryChanges || [] });
      case "all":
        return flattenData(approved);
      default:
        return [];
    }
  };

  const currentList = getFilteredList();

  async function handleAction(id: string, type: string, action: string, label?: string) {
    setConfirmState({
      show: true,
      id,
      type,
      action,
      label: label || "hồ sơ này"
    });
  }

  async function executeAction() {
    const { id, type, action } = confirmState;
    setConfirmState(prev => ({ ...prev, show: false }));

    startTransition(async () => {
      try {
        const newStatus = action === 'approve' ? "Đã phê duyệt" : "Tạo mới";
        await updateApprovalStatus(id, type, newStatus);
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  const [viewingItem, setViewingItem] = useState<any | null>(null);

  const getDetailText = (item: any) => {
    switch (item.moduleType) {
      case "LaborContract": return `${item.contractType} - ${item.position}`;
      case "LeaveRequest": return `${item.reason} (${item.totalDays} ngày)`;
      case "SalaryChange": return `${item.type}: ${item.currentSalaryLevel} ➡️ ${item.proposedSalaryLevel}`;
      case "TransferPromotion": return `${item.currentPosition} ➡️ ${item.newPosition}`;
      case "Resignation": return `Lý do: ${item.reason}`;
      case "Payroll": return `Tháng ${item.month}/${item.year}`;
      case "PurchaseOrder": return `Mục đích: ${item.purpose}`;
      default: return "";
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .base-table th {
          background: #f1f5f9 !important;
          padding: 0px 0.75rem !important;
          font-weight: 700 !important;
          color: #334155 !important;
          border-bottom: 1px solid #e0e6ed !important;
          text-align: center !important;
          height: 35px !important;
          font-family: "Segoe UI", sans-serif !important;
          font-size: 13px !important;
        }
        .base-table td {
          padding: 0px 0.75rem !important;
          vertical-align: middle !important;
          font-family: "Segoe UI", sans-serif !important;
          font-size: 13px !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
      ` }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* Module Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "nowrap", background: "transparent", padding: "0px", alignItems: "center", overflowX: "auto" }}>
          <button
            onClick={() => setActiveTab("contract")}
            className={`btn ${activeTab === "contract" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "0.375rem 0.75rem", borderRadius: "6px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
          >
            📄 Hợp đồng <span style={{ background: activeTab === "contract" ? "rgba(255,255,255,0.2)" : "#f1f5f9", color: activeTab === "contract" ? "#fff" : "#475569", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>{pending.contracts?.length || 0}</span>
          </button>
          <button
            onClick={() => setActiveTab("leave")}
            className={`btn ${activeTab === "leave" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "0.375rem 0.75rem", borderRadius: "6px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
          >
            🏖️ Nghỉ phép <span style={{ background: activeTab === "leave" ? "rgba(255,255,255,0.2)" : "#f1f5f9", color: activeTab === "leave" ? "#fff" : "#475569", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>{pending.leaves?.length || 0}</span>
          </button>
          <button
            onClick={() => setActiveTab("resignation")}
            className={`btn ${activeTab === "resignation" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "0.375rem 0.75rem", borderRadius: "6px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
          >
            🚪 Nghỉ việc <span style={{ background: activeTab === "resignation" ? "rgba(255,255,255,0.2)" : "#f1f5f9", color: activeTab === "resignation" ? "#fff" : "#475569", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>{pending.resignations?.length || 0}</span>
          </button>
          <button
            onClick={() => setActiveTab("transfer")}
            className={`btn ${activeTab === "transfer" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "0.375rem 0.75rem", borderRadius: "6px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
          >
            🔄 Thuyên chuyển, bổ nhiệm <span style={{ background: activeTab === "transfer" ? "rgba(255,255,255,0.2)" : "#f1f5f9", color: activeTab === "transfer" ? "#fff" : "#475569", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>{pending.transfers?.length || 0}</span>
          </button>
          <button
            onClick={() => setActiveTab("salary")}
            className={`btn ${activeTab === "salary" ? "btn-primary" : "btn-outline"}`}
            style={{ padding: "0.375rem 0.75rem", borderRadius: "6px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
          >
            💰 Tăng, giảm lương <span style={{ background: activeTab === "salary" ? "rgba(255,255,255,0.2)" : "#f1f5f9", color: activeTab === "salary" ? "#fff" : "#475569", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>{pending.salaryChanges?.length || 0}</span>
          </button>
          <div style={{ flex: 1, minWidth: "0.5rem" }} />
          <button
            onClick={() => setActiveTab("all")}
            className={`btn ${activeTab === "all" ? "btn-success" : "btn-outline"}`}
            style={{ padding: "0.375rem 0.75rem", borderRadius: "6px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", color: activeTab === "all" ? "#fff" : "", flexShrink: 0 }}
          >
            ✅ Tất cả <span style={{ background: activeTab === "all" ? "rgba(255,255,255,0.2)" : "#e2e8f0", color: activeTab === "all" ? "#fff" : "#475569", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>{flattenData(approved).length}</span>
          </button>
          <button
            onClick={() => router.refresh()}
            className="btn btn-outline"
            style={{
              padding: "0.375rem 0.75rem",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              background: "#fff",
              border: "1px solid #cbd5e1",
              color: "#64748b",
              flexShrink: 0
            }}
          >
            <RotateCcw size={16} style={{ color: "#64748b" }} /> Làm mới
          </button>
        </div>

        <div className="base-table-wrapper" style={{ overflow: "visible" }}>
          <table className="base-table" style={{ overflow: "visible" }}>
            <thead>
              <tr>
                <th className="th-first" style={{ width: "50px", textAlign: "center" }}>STT</th>
                <th>Phân hệ</th>
                <th>Mã/Số</th>
                <th>Nhân viên</th>
                <th>Ngày tạo</th>
                <th>Chi tiết</th>
                <th>Trạng thái</th>
                {activeTab !== "all" && <th className="th-last" style={{ width: "100px", textAlign: "right" }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={activeTab !== "all" ? 8 : 7} style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{activeTab !== "all" ? "🎉" : "📋"}</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>
                      {activeTab !== "all" ? "Tất cả hồ sơ đã được xử lý xong!" : "Chưa có hồ sơ nào được phê duyệt"}
                    </div>
                  </td>
                </tr>
              ) : (
                currentList.map((item, idx) => (
                  <tr
                    key={`${item.moduleType}-${item.id}`}
                    onClick={() => setViewingItem(item)}
                    style={{ cursor: "pointer" }}
                    className="table-row-hover"
                  >
                    <td style={{ textAlign: "center", color: "#94a3b8" }}>{idx + 1}</td>
                    <td>
                      <span className="badge-count" style={{ background: "#f1f5f9", color: "#475569", fontWeight: 700, fontSize: "11px", padding: "2px 8px" }}>{item.moduleLabel}</span>
                    </td>
                    <td>
                      <span className="code-pill">
                        {item.contractNumber ||
                          item.leaveCode ||
                          item.resignationCode ||
                          item.payrollCode ||
                          item.changeCode ||
                          item.planNumber ||
                          item.employeeCode ||
                          item.orderCode ||
                          item.poCode || "—"}
                      </span>
                    </td>
                    <td>
                      <div className="employee-info-base">
                        <div className="avatar-base">
                          {(item.employeeName || item.fullName || "H").split(" ").pop()?.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{item.employeeName || item.fullName || "Hệ thống"}</span>
                      </div>
                    </td>
                    <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>{new Date(item.createdAt || item.requestDate || item.planDate).toLocaleDateString("vi-VN")}</td>
                    <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{getDetailText(item)}</td>
                    <td>
                      <div className={`status-pill ${item.status === "Đã phê duyệt" ? "status-active" : "status-pending"}`}>
                        {item.status}
                      </div>
                    </td>
                    {activeTab !== "all" && (
                      <td style={{ textAlign: "right", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              setDropdownDirection(spaceBelow < 180 ? "up" : "down");
                              setOpenMenuId(openMenuId === `${item.moduleType}-${item.id}` ? null : `${item.moduleType}-${item.id}`);
                            }}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </div>

                        {openMenuId === `${item.moduleType}-${item.id}` && (
                          <div className={`action-dropdown ${dropdownDirection === "up" ? "open-up" : ""}`} onClick={(e) => e.stopPropagation()}>
                            <div className="dropdown-item success"
                              onClick={() => { handleAction(item.id, item.moduleType, 'approve', `${item.moduleLabel} - ${item.employeeName || item.fullName}`); setOpenMenuId(null); }}
                            >
                              <CheckCircle size={14} /> Phê duyệt
                            </div>
                            <div className="dropdown-item danger"
                              onClick={() => { handleAction(item.id, item.moduleType, 'reject', `${item.moduleLabel} - ${item.employeeName || item.fullName}`); setOpenMenuId(null); }}
                            >
                              <XCircle size={14} /> Từ chối
                            </div>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Modal */}
        {viewingItem && (
          <div
            className="modal-overlay"
            onClick={() => setViewingItem(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1rem"
            }}
          >
            <div
              className="card"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "700px",
                maxHeight: "90vh",
                overflowY: "auto",
                margin: "auto",
                padding: "2rem",
                position: "relative",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid #eee", paddingBottom: "1rem", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
                <h3 style={{ margin: 0 }}>🔍 Chi tiết phê duyệt</h3>
                <button className="btn-icon" onClick={() => setViewingItem(null)} style={{ fontSize: "1.5rem" }}>×</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Phân hệ</label>
                  <div style={{ fontWeight: 600, marginTop: "0.25rem" }}>{viewingItem.moduleLabel}</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Mã/Số hồ sơ</label>
                  <div style={{ fontWeight: 600, marginTop: "0.25rem", color: "var(--primary-color)" }}>
                    {viewingItem.contractNumber ||
                      viewingItem.leaveCode ||
                      viewingItem.resignationCode ||
                      viewingItem.payrollCode ||
                      viewingItem.changeCode ||
                      viewingItem.planNumber ||
                      viewingItem.employeeCode ||
                      viewingItem.orderCode ||
                      viewingItem.poCode || "—"}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Nhân viên liên quan</label>
                  <div style={{ fontWeight: 600, marginTop: "0.25rem" }}>{viewingItem.employeeName || viewingItem.fullName || "—"}</div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Ngày tạo</label>
                  <div style={{ marginTop: "0.25rem" }}>{new Date(viewingItem.createdAt || viewingItem.requestDate || viewingItem.planDate || viewingItem.requestedDate).toLocaleString("vi-VN")}</div>
                </div>
              </div>

              <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "0.75rem" }}>Nội dung chi tiết</label>
                <div style={{ fontSize: "0.95rem", lineHeight: "1.6" }}>
                  {viewingItem.moduleType === "LaborContract" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div style={{ gridColumn: "span 2", fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>Thông tin hợp đồng</div>
                      <div><strong>Số HĐ:</strong> {viewingItem.contractNumber}</div>
                      <div><strong>Loại HĐ:</strong> {viewingItem.contractType}</div>
                      <div><strong>Vị trí:</strong> {viewingItem.position}</div>
                      <div><strong>Phòng ban:</strong> {viewingItem.department}</div>
                      <div><strong>Ngày ký:</strong> {new Date(viewingItem.contractDate).toLocaleDateString("vi-VN")}</div>
                      <div><strong>Ngày bắt đầu:</strong> {new Date(viewingItem.startDate).toLocaleDateString("vi-VN")}</div>
                      {viewingItem.endDate && <div><strong>Ngày kết thúc:</strong> {new Date(viewingItem.endDate).toLocaleDateString("vi-VN")}</div>}

                      <div style={{ gridColumn: "span 2", fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "1rem" }}>Lương & Phụ cấp</div>
                      <div><strong>Bậc lương:</strong> {viewingItem.salaryLevel}</div>
                      <div><strong>Lương CB:</strong> {viewingItem.salaryBase?.toLocaleString("vi-VN")}</div>
                      <div><strong>Chuyên cần:</strong> {viewingItem.attendanceAllowance?.toLocaleString("vi-VN")}</div>
                      <div><strong>Hiệu quả:</strong> {viewingItem.performanceAllowance?.toLocaleString("vi-VN")}</div>
                      <div><strong>Trách nhiệm:</strong> {viewingItem.responsibilityAllowance?.toLocaleString("vi-VN")}</div>
                      <div><strong>Thu hút:</strong> {viewingItem.attractionAllowance?.toLocaleString("vi-VN")}</div>
                      <div><strong>Chức vụ:</strong> {viewingItem.positionAllowance?.toLocaleString("vi-VN")}</div>
                      <div><strong>Khác:</strong> {viewingItem.otherAllowance?.toLocaleString("vi-VN")}</div>
                      <div><strong>BHXH:</strong> {viewingItem.socialInsurance?.toLocaleString("vi-VN")}</div>
                      <div style={{ gridColumn: "span 2" }}><strong>Ghi chú:</strong> {viewingItem.note || "—"}</div>
                    </div>
                  )}
                  {viewingItem.moduleType === "LeaveRequest" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div><strong>Lý do nghỉ:</strong> {viewingItem.reason}</div>
                      <div><strong>Tổng số ngày:</strong> {viewingItem.totalDays} ngày</div>
                      <div><strong>Từ ngày:</strong> {new Date(viewingItem.startDate).toLocaleDateString("vi-VN")}</div>
                      <div><strong>Đến ngày:</strong> {new Date(viewingItem.endDate).toLocaleDateString("vi-VN")}</div>
                      <div style={{ gridColumn: "span 2" }}><strong>Ghi chú:</strong> {viewingItem.note || "—"}</div>
                    </div>
                  )}
                  {viewingItem.moduleType === "SalaryChange" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div><strong>Loại đề nghị:</strong> {viewingItem.type}</div>
                      <div><strong>Lý do:</strong> {viewingItem.reason}</div>
                      <div><strong>Bậc lương cũ:</strong> {viewingItem.currentSalaryLevel || "—"}</div>
                      <div><strong>Bậc lương mới:</strong> {viewingItem.proposedSalaryLevel}</div>
                      <div><strong>Tháng áp dụng:</strong> {viewingItem.effectiveMonth}</div>
                      <div><strong>Năm áp dụng:</strong> {viewingItem.effectiveYear}</div>
                      <div><strong>Người lập:</strong> {viewingItem.creator}</div>
                      <div style={{ gridColumn: "span 2" }}><strong>Ghi chú:</strong> {viewingItem.note || "—"}</div>
                    </div>
                  )}
                  {viewingItem.moduleType === "TransferPromotion" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div><strong>Chức vụ cũ:</strong> {viewingItem.currentPosition}</div>
                      <div><strong>Chức vụ mới:</strong> {viewingItem.newPosition}</div>
                      <div><strong>Phòng ban cũ:</strong> {viewingItem.currentDepartment}</div>
                      <div><strong>Phòng ban mới:</strong> {viewingItem.newDepartment}</div>
                      <div><strong>Bậc lương cũ:</strong> {viewingItem.currentSalaryLevel || "—"}</div>
                      <div><strong>Bậc lương mới:</strong> {viewingItem.newSalaryLevel || "—"}</div>
                      <div><strong>Ngày hiệu lực:</strong> {new Date(viewingItem.effectiveDate).toLocaleDateString("vi-VN")}</div>
                      <div><strong>Người lập:</strong> {viewingItem.creator}</div>
                      <div style={{ gridColumn: "span 2" }}><strong>Ghi chú:</strong> {viewingItem.note || "—"}</div>
                    </div>
                  )}
                  {viewingItem.moduleType === "Resignation" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div><strong>Ngày đăng ký:</strong> {new Date(viewingItem.requestDate).toLocaleDateString("vi-VN")}</div>
                      <div><strong>Ngày nghỉ việc:</strong> {new Date(viewingItem.resignationDate).toLocaleDateString("vi-VN")}</div>
                      <div style={{ gridColumn: "span 2" }}><strong>Lý do nghỉ:</strong> {viewingItem.reason}</div>
                      <div style={{ gridColumn: "span 2" }}><strong>Ghi chú:</strong> {viewingItem.note || "—"}</div>
                    </div>
                  )}
                  {viewingItem.moduleType === "Payroll" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div><strong>Kỳ lương:</strong> Tháng {viewingItem.month}/{viewingItem.year}</div>
                      <div><strong>Người lập:</strong> {viewingItem.creator}</div>
                      <div><strong>Chi nhánh:</strong> {viewingItem.branch || "Tất cả"}</div>
                      <div style={{ gridColumn: "span 2" }}><strong>Ghi chú:</strong> {viewingItem.note || "—"}</div>
                    </div>
                  )}
                  {viewingItem.moduleType === "PurchaseOrder" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div><strong>Người lập:</strong> {viewingItem.creator}</div>
                      <div><strong>Chi nhánh:</strong> {viewingItem.branch || "—"}</div>
                      <div><strong>Ngày đề nghị:</strong> {new Date(viewingItem.requestedDate).toLocaleDateString("vi-VN")}</div>
                      <div><strong>Mục đích:</strong> {viewingItem.purpose}</div>
                      <div style={{ gridColumn: "span 2" }}><strong>Ghi chú:</strong> {viewingItem.note || "—"}</div>

                      <div style={{ gridColumn: "span 2", fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginTop: "1rem" }}>Chi tiết hàng hóa</div>
                      <div style={{ gridColumn: "span 2" }}>
                        <table className="table" style={{ fontSize: "0.85rem" }}>
                          <thead>
                            <tr>
                              <th>Mã hàng</th>
                              <th>Tên hàng</th>
                              <th>Số lượng</th>
                              <th>Nơi giao</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewingItem.details?.map((d: any) => (
                              <tr key={d.id}>
                                <td>{d.productCode}</td>
                                <td>{d.productName}</td>
                                <td>{d.requestedQuantity}</td>
                                <td>{d.deliveryLocation}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "1rem", position: "sticky", bottom: 0, background: "#fff", paddingTop: "1rem", borderTop: "1px solid #eee" }}>
                <button className="btn" onClick={() => setViewingItem(null)}>Đóng</button>
                {activeTab !== "all" && (
                  <>
                    <button className="btn btn-danger" style={{ background: "#ef4444", border: "none", fontWeight: 700 }} onClick={() => { handleAction(viewingItem.id, viewingItem.moduleType, 'reject', `${viewingItem.moduleLabel} - ${viewingItem.employeeName || viewingItem.fullName}`); setViewingItem(null); }}>Từ chối</button>
                    <button className="btn btn-primary" style={{ background: "#2563eb", border: "none", fontWeight: 700 }} onClick={() => { handleAction(viewingItem.id, viewingItem.moduleType, 'approve', `${viewingItem.moduleLabel} - ${viewingItem.employeeName || viewingItem.fullName}`); setViewingItem(null); }}>Phê duyệt</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Confirmation Modal */}
        {confirmState.show && (
          <div className="modal-overlay" style={{
            position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, backdropFilter: "blur(4px)"
          }}>
            <div className="card" style={{
              width: "100%", maxWidth: "400px", padding: "2rem", textAlign: "center",
              borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "1.25rem" }}>
                {confirmState.action === 'approve' ? "✅" : "❌"}
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.75rem", fontFamily: "'Segoe UI', sans-serif" }}>
                {confirmState.action === 'approve' ? "Phê duyệt hồ sơ" : "Từ chối hồ sơ"}
              </h3>
              <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "1.5rem", lineHeight: "1.6", fontFamily: "'Segoe UI', sans-serif" }}>
                Bạn có chắc chắn muốn {confirmState.action === 'approve' ? "phê duyệt" : "từ chối"} <strong>{confirmState.label}</strong>?
              </p>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, height: "42px", borderRadius: "10px", fontWeight: 600, border: "1px solid #e2e8f0" }}
                  onClick={() => setConfirmState(prev => ({ ...prev, show: false }))}
                >
                  Hủy
                </button>
                <button
                  className="btn btn-primary"
                  style={{
                    flex: 1, height: "42px", borderRadius: "10px", fontWeight: 700,
                    background: confirmState.action === 'approve' ? "#2563eb" : "#ef4444",
                    border: "none", boxShadow: confirmState.action === 'approve' ? "0 4px 6px -1px rgba(37, 99, 235, 0.2)" : "0 4px 6px -1px rgba(239, 68, 68, 0.2)"
                  }}
                  onClick={executeAction}
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
