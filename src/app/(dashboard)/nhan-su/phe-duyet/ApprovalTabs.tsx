"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateApprovalStatus } from "./actions";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";

interface ApprovalTabsProps {
  pending: any;
  approved: any;
}

export default function ApprovalTabs({ pending, approved }: ApprovalTabsProps) {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<"pending" | "approved">("pending");
  const [isPending, startTransition] = useTransition();

  // Helper to flatten and label data
  const flattenData = (data: any) => {
    const list: any[] = [];
    if (data.contracts) data.contracts.forEach((item: any) => list.push({ ...item, moduleLabel: "Hợp đồng", moduleType: "LaborContract" }));
    if (data.leaves) data.leaves.forEach((item: any) => list.push({ ...item, moduleLabel: "Nghỉ phép", moduleType: "LeaveRequest" }));
    if (data.salaryChanges) data.salaryChanges.forEach((item: any) => list.push({ ...item, moduleLabel: "Lương/Phụ cấp", moduleType: "SalaryChange" }));
    if (data.transfers) data.transfers.forEach((item: any) => list.push({ ...item, moduleLabel: "Điều động", moduleType: "TransferPromotion" }));
    if (data.resignations) data.resignations.forEach((item: any) => list.push({ ...item, moduleLabel: "Nghỉ việc", moduleType: "Resignation" }));
    if (data.payrolls) data.payrolls.forEach((item: any) => list.push({ ...item, moduleLabel: "Bảng lương", moduleType: "Payroll" }));
    if (data.purchaseOrders) data.purchaseOrders.forEach((item: any) => list.push({ ...item, moduleLabel: "Lệnh mua", moduleType: "PurchaseOrder" }));
    
    return list.sort((a, b) => new Date(b.createdAt || b.requestDate || b.planDate).getTime() - new Date(a.createdAt || a.requestDate || a.planDate).getTime());
  };

  const currentList = flattenData(mainTab === "pending" ? pending : approved);

  async function handleAction(id: string, type: string, action: string) {
    const confirmMsg = action === 'approve' ? 'Phê duyệt' : 'Trả lại';
    if (!confirm(`Bạn có chắc chắn muốn ${confirmMsg} bản ghi này?`)) return;
    
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Main Tabs */}
      <div style={{ display: "flex", gap: "1rem" }}>
        <button 
          onClick={() => setMainTab("pending")} 
          className={`btn ${mainTab === "pending" ? "btn-primary" : "btn-outline"}`}
          style={{ padding: "0.75rem 2rem", borderRadius: "12px" }}
        >
          ⏳ Chờ phê duyệt ({flattenData(pending).length})
        </button>
        <button 
          onClick={() => setMainTab("approved")} 
          className={`btn ${mainTab === "approved" ? "btn-primary" : "btn-outline"}`}
          style={{ padding: "0.75rem 2rem", borderRadius: "12px" }}
        >
          ✅ Đã phê duyệt ({flattenData(approved).length})
        </button>
      </div>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                {mainTab === "pending" && <th style={{ width: "180px", textAlign: "center" }}>Thao tác</th>}
                <th style={{ width: "50px", textAlign: "center" }}>STT</th>
                <th>Phân hệ</th>
                <th>Mã/Số</th>
                <th>Nhân viên</th>
                <th>Ngày</th>
                <th>Chi tiết</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={mainTab === "pending" ? 8 : 7} style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{mainTab === "pending" ? "🎉" : "📋"}</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>
                      {mainTab === "pending" ? "Tất cả hồ sơ đã được xử lý xong!" : "Chưa có hồ sơ nào được phê duyệt"}
                    </div>
                  </td>
                </tr>
              ) : (
                currentList.map((item, idx) => (
                  <tr 
                    key={`${item.moduleType}-${item.id}`} 
                    onClick={() => setViewingItem(item)}
                    style={{ cursor: "pointer" }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {mainTab === "pending" && (
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                          <button 
                            className="btn btn-sm btn-success" 
                            onClick={() => handleAction(item.id, item.moduleType, 'approve')}
                            disabled={isPending}
                          >
                            Duyệt
                          </button>
                          <button 
                            className="btn btn-sm btn-danger" 
                            onClick={() => handleAction(item.id, item.moduleType, 'reject')}
                            disabled={isPending}
                          >
                            Trả lại
                          </button>
                        </div>
                      </td>
                    )}
                    <td style={{ textAlign: "center" }}>{idx + 1}</td>
                    <td>
                      <span className="badge" style={{ background: "#f1f5f9", color: "#475569", fontWeight: 600 }}>{item.moduleLabel}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {item.contractNumber || 
                       item.leaveCode || 
                       item.resignationCode || 
                       item.payrollCode || 
                       item.changeCode || 
                       item.planNumber || 
                       item.employeeCode || 
                       item.orderCode || 
                       item.poCode || "—"}
                    </td>
                    <td style={{ fontWeight: 500 }}>{item.employeeName || item.fullName || "Hệ thống"}</td>
                    <td>{new Date(item.createdAt || item.requestDate || item.planDate).toLocaleDateString("vi-VN")}</td>
                    <td style={{ fontSize: "0.9rem" }}>{getDetailText(item)}</td>
                    <td>
                      <span className={`badge ${item.status === "Đã phê duyệt" ? "badge-success" : "badge-warning"}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
              {mainTab === "pending" && (
                <>
                  <button className="btn btn-danger" onClick={() => { handleAction(viewingItem.id, viewingItem.moduleType, 'reject'); setViewingItem(null); }}>Trả lại</button>
                  <button className="btn btn-primary" onClick={() => { handleAction(viewingItem.id, viewingItem.moduleType, 'approve'); setViewingItem(null); }}>Phê duyệt ngay</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
