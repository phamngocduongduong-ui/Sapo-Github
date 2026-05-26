"use client";

import React, { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateApprovalStatus } from "./actions";
import { RotateCcw } from "lucide-react";

interface ApprovalTabsProps {
  pending: any;
  approved: any;
  isEmbedded?: boolean;
}

export default function ApprovalTabs({ pending, approved, isEmbedded = false }: ApprovalTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"contract" | "leave" | "resignation" | "transfer" | "salary" | "all" >("contract");
  const [isPending, startTransition] = useTransition();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Clear selection on tab change
  useEffect(() => {
    setSelectedItemId(null);
    setExpandedId(null);
  }, [activeTab]);

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

  // Helper to flatten and label data
  const flattenData = (data: any) => {
    const list: any[] = [];
    if (data.contracts) data.contracts.forEach((item: any) => list.push({ ...item, moduleLabel: "Hợp đồng", moduleType: "LaborContract" }));
    if (data.leaves) data.leaves.forEach((item: any) => list.push({ ...item, moduleLabel: "Nghỉ phép", moduleType: "LeaveRequest" }));
    if (data.salaryChanges) data.salaryChanges.forEach((item: any) => list.push({ ...item, moduleLabel: "Tăng, giảm lương", moduleType: "SalaryChange" }));
    if (data.transfers) data.transfers.forEach((item: any) => list.push({ ...item, moduleLabel: "Thuyên chuyển, bổ nhiệm", moduleType: "TransferPromotion" }));
    if (data.resignations) data.resignations.forEach((item: any) => list.push({ ...item, moduleLabel: "Nghỉ việc", moduleType: "Resignation" }));
    if (data.payrolls) data.payrolls.forEach((item: any) => list.push({ ...item, moduleLabel: "Bảng lương", moduleType: "Payroll" }));
    if (data.purchaseOrders) data.purchaseOrders.forEach((item: any) => list.push({ ...item, moduleLabel: "Đơn mua hàng", moduleType: "PurchaseOrder" }));

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
  const selectedItemKey = selectedItemId;
  const selectedItem = currentList.find(item => `${item.moduleType}-${item.id}` === selectedItemKey) || null;

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
        setSelectedItemId(null);
        setExpandedId(null);
        router.refresh();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

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

  function renderItemDetails(item: any) {
    switch (item.moduleType) {
      case "LaborContract":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", maxWidth: "800px" }}>
            <div style={{ gridColumn: "span 2", fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", color: "#003466" }}>THÔNG TIN HỢP ĐỒNG</div>
            <div><span style={{ color: "#64748b" }}>Số HĐ:</span> <strong>{item.contractNumber}</strong></div>
            <div><span style={{ color: "#64748b" }}>Loại HĐ:</span> <strong>{item.contractType}</strong></div>
            <div><span style={{ color: "#64748b" }}>Vị trí:</span> <strong>{item.position}</strong></div>
            <div><span style={{ color: "#64748b" }}>Phòng ban:</span> <strong>{item.department}</strong></div>
            <div><span style={{ color: "#64748b" }}>Ngày ký:</span> <strong>{new Date(item.contractDate).toLocaleDateString("vi-VN")}</strong></div>
            <div><span style={{ color: "#64748b" }}>Ngày bắt đầu:</span> <strong>{new Date(item.startDate).toLocaleDateString("vi-VN")}</strong></div>
            {item.endDate && <div><span style={{ color: "#64748b" }}>Ngày kết thúc:</span> <strong>{new Date(item.endDate).toLocaleDateString("vi-VN")}</strong></div>}

            <div style={{ gridColumn: "span 2", fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", marginTop: "0.5rem", color: "#003466" }}>LƯƠNG & PHỤ CẤP</div>
            <div><span style={{ color: "#64748b" }}>Bậc lương:</span> <strong>{item.salaryLevel}</strong></div>
            <div><span style={{ color: "#64748b" }}>Lương CB:</span> <strong>{item.salaryBase?.toLocaleString("vi-VN")}đ</strong></div>
            <div><span style={{ color: "#64748b" }}>Chuyên cần:</span> <strong>{item.attendanceAllowance?.toLocaleString("vi-VN")}đ</strong></div>
            <div><span style={{ color: "#64748b" }}>Hiệu quả:</span> <strong>{item.performanceAllowance?.toLocaleString("vi-VN")}đ</strong></div>
            <div><span style={{ color: "#64748b" }}>Trách nhiệm:</span> <strong>{item.responsibilityAllowance?.toLocaleString("vi-VN")}đ</strong></div>
            <div><span style={{ color: "#64748b" }}>Thu hút:</span> <strong>{item.attractionAllowance?.toLocaleString("vi-VN")}đ</strong></div>
            <div><span style={{ color: "#64748b" }}>Chức vụ:</span> <strong>{item.positionAllowance?.toLocaleString("vi-VN")}đ</strong></div>
            <div><span style={{ color: "#64748b" }}>Khác:</span> <strong>{item.otherAllowance?.toLocaleString("vi-VN")}đ</strong></div>
            <div><span style={{ color: "#64748b" }}>BHXH:</span> <strong>{item.socialInsurance?.toLocaleString("vi-VN")}đ</strong></div>
            <div style={{ gridColumn: "span 2" }}><span style={{ color: "#64748b" }}>Ghi chú:</span> <strong>{item.note || "—"}</strong></div>
          </div>
        );
      case "LeaveRequest":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", maxWidth: "800px" }}>
            <div style={{ gridColumn: "span 2", fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", color: "#003466" }}>ĐƠN NGHỈ PHÉP</div>
            <div><span style={{ color: "#64748b" }}>Lý do nghỉ:</span> <strong>{item.reason}</strong></div>
            <div><span style={{ color: "#64748b" }}>Tổng số ngày:</span> <strong>{item.totalDays} ngày</strong></div>
            <div><span style={{ color: "#64748b" }}>Từ ngày:</span> <strong>{new Date(item.startDate).toLocaleDateString("vi-VN")}</strong></div>
            <div><span style={{ color: "#64748b" }}>Đến ngày:</span> <strong>{new Date(item.endDate).toLocaleDateString("vi-VN")}</strong></div>
            <div style={{ gridColumn: "span 2" }}><span style={{ color: "#64748b" }}>Ghi chú:</span> <strong>{item.note || "—"}</strong></div>
          </div>
        );
      case "SalaryChange":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", maxWidth: "800px" }}>
            <div style={{ gridColumn: "span 2", fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", color: "#003466" }}>ĐỀ NGHỊ ĐỔI LƯƠNG</div>
            <div><span style={{ color: "#64748b" }}>Loại đề nghị:</span> <strong>{item.type}</strong></div>
            <div><span style={{ color: "#64748b" }}>Lý do:</span> <strong>{item.reason}</strong></div>
            <div><span style={{ color: "#64748b" }}>Bậc lương cũ:</span> <strong>{item.currentSalaryLevel || "—"}</strong></div>
            <div><span style={{ color: "#64748b" }}>Bậc lương mới:</span> <strong>{item.proposedSalaryLevel}</strong></div>
            <div><span style={{ color: "#64748b" }}>Tháng áp dụng:</span> <strong>{item.effectiveMonth}</strong></div>
            <div><span style={{ color: "#64748b" }}>Năm áp dụng:</span> <strong>{item.effectiveYear}</strong></div>
            <div><span style={{ color: "#64748b" }}>Người lập:</span> <strong>{item.creator}</strong></div>
            <div style={{ gridColumn: "span 2" }}><span style={{ color: "#64748b" }}>Ghi chú:</span> <strong>{item.note || "—"}</strong></div>
          </div>
        );
      case "TransferPromotion":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", maxWidth: "800px" }}>
            <div style={{ gridColumn: "span 2", fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", color: "#003466" }}>THÔNG TIN THUYÊN CHUYỂN, BỔ NHIỆM</div>
            <div><span style={{ color: "#64748b" }}>Chức vụ cũ:</span> <strong>{item.currentPosition}</strong></div>
            <div><span style={{ color: "#64748b" }}>Chức vụ mới:</span> <strong>{item.newPosition}</strong></div>
            <div><span style={{ color: "#64748b" }}>Phòng ban cũ:</span> <strong>{item.currentDepartment}</strong></div>
            <div><span style={{ color: "#64748b" }}>Phòng ban mới:</span> <strong>{item.newDepartment}</strong></div>
            <div><span style={{ color: "#64748b" }}>Bậc lương cũ:</span> <strong>{item.currentSalaryLevel || "—"}</strong></div>
            <div><span style={{ color: "#64748b" }}>Bậc lương mới:</span> <strong>{item.newSalaryLevel || "—"}</strong></div>
            <div><span style={{ color: "#64748b" }}>Ngày hiệu lực:</span> <strong>{new Date(item.effectiveDate).toLocaleDateString("vi-VN")}</strong></div>
            <div><span style={{ color: "#64748b" }}>Người lập:</span> <strong>{item.creator}</strong></div>
            <div style={{ gridColumn: "span 2" }}><span style={{ color: "#64748b" }}>Ghi chú:</span> <strong>{item.note || "—"}</strong></div>
          </div>
        );
      case "Resignation":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", maxWidth: "800px" }}>
            <div style={{ gridColumn: "span 2", fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", color: "#003466" }}>ĐƠN XIN NGHỈ VIỆC</div>
            <div><span style={{ color: "#64748b" }}>Ngày đăng ký:</span> <strong>{new Date(item.requestDate).toLocaleDateString("vi-VN")}</strong></div>
            <div><span style={{ color: "#64748b" }}>Ngày nghỉ việc:</span> <strong>{new Date(item.resignationDate).toLocaleDateString("vi-VN")}</strong></div>
            <div style={{ gridColumn: "span 2" }}><span style={{ color: "#64748b" }}>Lý do nghỉ:</span> <strong>{item.reason}</strong></div>
            <div style={{ gridColumn: "span 2" }}><span style={{ color: "#64748b" }}>Ghi chú:</span> <strong>{item.note || "—"}</strong></div>
          </div>
        );
      case "Payroll":
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", maxWidth: "800px" }}>
            <div style={{ gridColumn: "span 2", fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", color: "#003466" }}>THÔNG TIN BẢNG LƯƠNG</div>
            <div><span style={{ color: "#64748b" }}>Kỳ lương:</span> <strong>Tháng {item.month}/{item.year}</strong></div>
            <div><span style={{ color: "#64748b" }}>Người lập:</span> <strong>{item.creator}</strong></div>
            <div><span style={{ color: "#64748b" }}>Chi nhánh:</span> <strong>{item.branch || "Tất cả"}</strong></div>
            <div style={{ gridColumn: "span 2" }}><span style={{ color: "#64748b" }}>Ghi chú:</span> <strong>{item.note || "—"}</strong></div>
          </div>
        );
      case "PurchaseOrder":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "800px" }}>
            <div style={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", color: "#003466" }}>ĐƠN MUA HÀNG</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem" }}>
              <div><span style={{ color: "#64748b" }}>Người lập:</span> <strong>{item.creator}</strong></div>
              <div><span style={{ color: "#64748b" }}>Chi nhánh:</span> <strong>{item.branch || "—"}</strong></div>
              <div><span style={{ color: "#64748b" }}>Ngày đề nghị:</span> <strong>{new Date(item.requestedDate).toLocaleDateString("vi-VN")}</strong></div>
              <div><span style={{ color: "#64748b" }}>Mục đích:</span> <strong>{item.purpose}</strong></div>
              <div style={{ gridColumn: "span 2" }}><span style={{ color: "#64748b" }}>Ghi chú:</span> <strong>{item.note || "—"}</strong></div>
            </div>
            
            <div style={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", marginTop: "0.5rem", color: "#003466" }}>CHI TIẾT HÀNG HÓA</div>
            <table className="base-table" style={{ fontSize: "12px", border: "1px solid #cbd5e1" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ color: "#003466", padding: "4px" }}>Mã hàng</th>
                  <th style={{ color: "#003466", padding: "4px" }}>Tên hàng</th>
                  <th style={{ color: "#003466", padding: "4px" }}>Số lượng</th>
                  <th style={{ color: "#003466", padding: "4px" }}>Nơi giao</th>
                </tr>
              </thead>
              <tbody>
                {item.details?.map((d: any) => (
                  <tr key={d.id}>
                    <td style={{ padding: "4px" }}>{d.productCode}</td>
                    <td style={{ padding: "4px" }}>{d.productName}</td>
                    <td style={{ padding: "4px" }}>{d.requestedQuantity}</td>
                    <td style={{ padding: "4px" }}>{d.deliveryLocation}</td>
                  </tr>
                ))}
                {(!item.details || item.details.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "4px", color: "#64748b" }}>Không có chi tiết hàng hóa</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .breadcrumb-banner {
          background: #003466 !important;
          color: white !important;
          padding: 6px 15px !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          margin-top: 0px !important;
          margin-bottom: 10px !important;
          font-family: "Segoe UI", sans-serif !important;
        }
        .sapo-btn {
          background: #003466 !important;
          color: white !important;
          border: none !important;
          padding: 6px 12px !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          border-radius: 4px !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 32px !important;
          font-family: "Segoe UI", sans-serif !important;
          transition: background-color 0.2s !important;
        }
        .sapo-btn:hover {
          background: #002447 !important;
        }
        .sapo-btn.btn-outline {
          background: white !important;
          color: #003466 !important;
          border: 1px solid #003466 !important;
        }
        .sapo-btn.btn-outline:hover {
          background: #f0f7ff !important;
        }
        .base-table-wrapper {
          background: white !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          overflow-x: auto !important;
          margin-top: 10px !important;
        }
        .base-table {
          width: 100% !important;
          border-collapse: collapse !important;
          font-family: "Segoe UI", sans-serif !important;
          font-size: 13px !important;
        }
        .base-table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          background: #f1f5f9 !important;
          border-bottom: 2px solid #ff5c00 !important;
          text-align: center !important;
          height: 35px !important;
          padding: 6px 12px !important;
        }
        .base-table td {
          padding: 6px 12px !important;
          vertical-align: middle !important;
          color: #000 !important;
          font-weight: 600 !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .base-table tbody tr.row-hoverable:hover {
          background-color: #f0f7ff !important;
        }
        .base-table tbody tr.row-selected {
          background-color: #eff6ff !important;
        }
        .code-pill {
          background: #e2e8f0 !important;
          color: #475569 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-weight: 700 !important;
          font-family: monospace !important;
        }
        .avatar-base {
          width: 28px !important;
          height: 28px !important;
          border-radius: 50% !important;
          background: #003466 !important;
          color: white !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-weight: 700 !important;
          font-size: 12px !important;
          margin-right: 8px !important;
        }
        .employee-info-base {
          display: flex !important;
          align-items: center !important;
        }
      ` }} />

      {!isEmbedded && (
        <div className="breadcrumb-banner">
          PHÊ DUYỆT HỒ SƠ
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0px" }}>
        
        {/* Module Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "nowrap", alignItems: "center", overflowX: "auto" }}>
          <button
            onClick={() => setActiveTab("contract")}
            className={`sapo-btn ${activeTab === "contract" ? "" : "btn-outline"}`}
            style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
          >
            📄 Hợp đồng <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.contracts?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("leave")}
            className={`sapo-btn ${activeTab === "leave" ? "" : "btn-outline"}`}
            style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
          >
            🏖️ Nghỉ phép <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.leaves?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("resignation")}
            className={`sapo-btn ${activeTab === "resignation" ? "" : "btn-outline"}`}
            style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
          >
            🚪 Nghỉ việc <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.resignations?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("transfer")}
            className={`sapo-btn ${activeTab === "transfer" ? "" : "btn-outline"}`}
            style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
          >
            🔄 Thuyên chuyển, bổ nhiệm <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.transfers?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("salary")}
            className={`sapo-btn ${activeTab === "salary" ? "" : "btn-outline"}`}
            style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
          >
            💰 Tăng, giảm lương <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.salaryChanges?.length || 0})</span>
          </button>
          
          <div style={{ flex: 1 }} />
          
          <button
            onClick={() => setActiveTab("all")}
            className={`sapo-btn ${activeTab === "all" ? "" : "btn-outline"}`}
            style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
          >
            ✅ Tất cả <span style={{ marginLeft: "4px", opacity: 0.85 }}>({flattenData(approved).length})</span>
          </button>
        </div>

        {/* Toolbar Container */}
        <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center", marginTop: "5px" }}>
          {selectedItem && activeTab !== "all" && (
            <>
              <button
                type="button"
                className="sapo-btn"
                onClick={() => handleAction(selectedItem.id, selectedItem.moduleType, 'approve', `${selectedItem.moduleLabel} - ${selectedItem.employeeName || selectedItem.fullName}`)}
              >
                Phê duyệt
              </button>
              <button
                type="button"
                className="sapo-btn"
                style={{ backgroundColor: "#ef4444" }}
                onClick={() => handleAction(selectedItem.id, selectedItem.moduleType, 'reject', `${selectedItem.moduleLabel} - ${selectedItem.employeeName || selectedItem.fullName}`)}
              >
                Từ chối
              </button>
            </>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              className="sapo-btn"
              onClick={() => router.refresh()}
            >
              Làm mới
            </button>
          </div>
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
                <th className="th-last" style={{ textAlign: "center" }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {currentList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{activeTab !== "all" ? "🎉" : "📋"}</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>
                      {activeTab !== "all" ? "Tất cả hồ sơ đã được xử lý xong!" : "Chưa có hồ sơ nào được phê duyệt"}
                    </div>
                  </td>
                </tr>
              ) : (
                currentList.map((item, idx) => {
                  const itemKey = `${item.moduleType}-${item.id}`;
                  const isSelected = selectedItemId === itemKey;
                  const isExpanded = expandedId === itemKey;

                  let statusColor = "#f59e0b"; // Pending/Tạo mới
                  if (item.status === "Chờ phê duyệt") statusColor = "#2563eb";
                  if (item.status === "Đã phê duyệt") statusColor = "#10b981";
                  if (item.status === "Đã hủy" || item.status === "Từ chối") statusColor = "#ef4444";

                  return (
                    <React.Fragment key={itemKey}>
                      <tr
                        onClick={() => {
                          const nextKey = selectedItemId === itemKey ? null : itemKey;
                          setSelectedItemId(nextKey);
                          setExpandedId(nextKey);
                        }}
                        style={{ cursor: "pointer" }}
                        className={`row-hoverable ${isSelected ? "row-selected" : ""}`}
                      >
                        <td style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{idx + 1}</td>
                        <td>
                          <span style={{ color: "#003466", fontWeight: 700, fontSize: "12px" }}>{item.moduleLabel}</span>
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
                            <span style={{ fontWeight: 600, whiteSpace: "nowrap", color: "#000" }}>{item.employeeName || item.fullName || "Hệ thống"}</span>
                          </div>
                        </td>
                        <td style={{ color: "#000", whiteSpace: "nowrap", fontWeight: 600 }}>{new Date(item.createdAt || item.requestDate || item.planDate).toLocaleDateString("vi-VN")}</td>
                        <td style={{ fontWeight: 600, whiteSpace: "nowrap", color: "#000" }}>{getDetailText(item)}</td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ color: statusColor, fontWeight: 700 }}>
                            {item.status}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: "0", background: "#f8fafc" }}>
                            <div style={{
                              padding: "1rem",
                              position: "sticky",
                              left: 0,
                              width: "min-content",
                              minWidth: "100%",
                              maxWidth: "calc(100vw - 280px)",
                              borderBottom: "2px solid var(--primary-color)",
                              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)"
                            }}>
                              <div style={{ background: "white", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                {renderItemDetails(item)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Action Confirmation Modal */}
        {confirmState.show && (
          <div className="modal-overlay" style={{
            position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, backdropFilter: "blur(2px)"
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
                  className="sapo-btn btn-outline"
                  style={{ flex: 1, height: "42px", borderRadius: "10px", fontWeight: 600 }}
                  onClick={() => setConfirmState(prev => ({ ...prev, show: false }))}
                >
                  Hủy
                </button>
                <button
                  className="sapo-btn"
                  style={{
                    flex: 1, height: "42px", borderRadius: "10px", fontWeight: 700,
                    backgroundColor: confirmState.action === 'approve' ? "#003466" : "#ef4444",
                    border: "none"
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
