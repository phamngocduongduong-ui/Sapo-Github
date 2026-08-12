"use client";

import React, { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { updateApprovalStatus } from "./actions";
import { RotateCcw, CheckCircle2, XCircle, User } from "lucide-react";

interface ApprovalTabsProps {
  pending: any;
  approved: any;
  isEmbedded?: boolean;
  showNhanSuOnly?: boolean;
  showHopDongLaoDongOnly?: boolean;
  showHopDongBanHangOnly?: boolean;
  showLuongThuongOnly?: boolean;
  showThanhToanOnly?: boolean;
}

export default function ApprovalTabs({
  pending,
  approved,
  isEmbedded = false,
  showNhanSuOnly = false,
  showHopDongLaoDongOnly = false,
  showHopDongBanHangOnly = false,
  showLuongThuongOnly = false,
  showThanhToanOnly = false
}: ApprovalTabsProps) {
  const router = useRouter();
  const isLegacy = !showNhanSuOnly && !showHopDongLaoDongOnly && !showHopDongBanHangOnly && !showLuongThuongOnly && !showThanhToanOnly;

  const [activeTab, setActiveTab] = useState<"contract" | "leave" | "resignation" | "transfer" | "salary" | "sales_contract" | "payroll" | "purchase_order" | "all">(
    showNhanSuOnly ? "leave" : 
    showHopDongLaoDongOnly ? "contract" : 
    showHopDongBanHangOnly ? "sales_contract" :
    showLuongThuongOnly ? "payroll" :
    showThanhToanOnly ? "purchase_order" : "contract"
  );
  const [isPending, startTransition] = useTransition();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mobileApprovalTab, setMobileApprovalTab] = useState<"pending" | "approved">("pending");

  // Clear selection on tab change
  useEffect(() => {
    setSelectedItemId(null);
    setExpandedId(null);
  }, [activeTab]);

  const [rejectReason, setRejectReason] = useState("");

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

    if (showHopDongLaoDongOnly || isLegacy) {
      if (data.contracts) data.contracts.forEach((item: any) => list.push({ ...item, moduleLabel: "HĐ Lao động", moduleType: "LaborContract" }));
    }
    if (showNhanSuOnly || isLegacy) {
      if (data.leaves) data.leaves.forEach((item: any) => list.push({ ...item, moduleLabel: "Nghỉ phép", moduleType: "LeaveRequest" }));
      if (data.salaryChanges) data.salaryChanges.forEach((item: any) => list.push({ ...item, moduleLabel: "Tăng, giảm lương", moduleType: "SalaryChange" }));
      if (data.transfers) data.transfers.forEach((item: any) => list.push({ ...item, moduleLabel: "Thuyên chuyển, bổ nhiệm", moduleType: "TransferPromotion" }));
      if (data.resignations) data.resignations.forEach((item: any) => list.push({ ...item, moduleLabel: "Nghỉ việc", moduleType: "Resignation" }));
    }
    if (showHopDongBanHangOnly) {
      if (data.salesContracts) data.salesContracts.forEach((item: any) => list.push({ ...item, moduleLabel: "HĐ Bán hàng", moduleType: "Contract" }));
    }
    if (showLuongThuongOnly || isLegacy) {
      if (data.payrolls) data.payrolls.forEach((item: any) => list.push({ ...item, moduleLabel: "Bảng lương", moduleType: "Payroll" }));
    }
    if (showThanhToanOnly || isLegacy) {
      if (data.purchaseOrders) data.purchaseOrders.forEach((item: any) => list.push({ ...item, moduleLabel: "Đơn mua hàng", moduleType: "PurchaseOrder" }));
    }

    return list.sort((a, b) => {
      const aDate = new Date(a.createdAt || a.contractDate || a.requestDate || a.planDate || 0).getTime();
      const bDate = new Date(b.createdAt || b.contractDate || b.requestDate || b.planDate || 0).getTime();
      return bDate - aDate;
    });
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
      case "sales_contract":
        return flattenData({ salesContracts: pending.salesContracts || [] });
      case "payroll":
        return flattenData({ payrolls: pending.payrolls || [] });
      case "purchase_order":
        return flattenData({ purchaseOrders: pending.purchaseOrders || [] });
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
    setRejectReason("");
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
    if (action === 'reject' && !rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }

    setConfirmState(prev => ({ ...prev, show: false }));

    startTransition(async () => {
      try {
        const newStatus = action === 'approve' ? "Đã phê duyệt" : "Từ chối";
        await updateApprovalStatus(id, type, newStatus, action === 'reject' ? rejectReason.trim() : undefined);
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
      case "Contract": return `Bên mua: ${item.buyer} - NV: ${item.salesEmployee || "—"}`;
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
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "#64748b", fontWeight: 400 }}>
            <div>Lý do nghỉ phép: {item.reason || "—"}</div>
            <div>Ghi chú: {item.note || "—"}</div>
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
      case "Contract":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "800px" }}>
            <div style={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", color: "#003466" }}>THÔNG TIN HỢP ĐỒNG BÁN HÀNG</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem" }}>
              <div><span style={{ color: "#64748b" }}>Số HĐ:</span> <strong>{item.contractNumber}</strong></div>
              <div><span style={{ color: "#64748b" }}>Ngày ký:</span> <strong>{new Date(item.contractDate).toLocaleDateString("vi-VN")}</strong></div>
              <div><span style={{ color: "#64748b" }}>Bên bán:</span> <strong>{item.seller}</strong></div>
              <div><span style={{ color: "#64748b" }}>Bên mua:</span> <strong>{item.buyer}</strong></div>
              <div><span style={{ color: "#64748b" }}>Nhân viên phụ trách:</span> <strong>{item.salesEmployee || "—"}</strong></div>
              <div><span style={{ color: "#64748b" }}>Phương thức thanh toán:</span> <strong>{item.paymentMethod || "—"}</strong></div>
              {item.deliveryDate && <div><span style={{ color: "#64748b" }}>Ngày giao hàng:</span> <strong>{item.deliveryDate}</strong></div>}
              {item.expiryDate && <div><span style={{ color: "#64748b" }}>Ngày hết hạn:</span> <strong>{new Date(item.expiryDate).toLocaleDateString("vi-VN")}</strong></div>}
              <div style={{ gridColumn: "span 2" }}><span style={{ color: "#64748b" }}>Ghi chú:</span> <strong>{item.note || "—"}</strong></div>
            </div>
            
            <div style={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", marginTop: "0.5rem", color: "#003466" }}>DANH SÁCH SẢN PHẨM / DỊCH VỤ</div>
            <table className="base-table" style={{ fontSize: "12px", border: "1px solid #cbd5e1" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ color: "#003466", padding: "4px" }}>Mã SP</th>
                  <th style={{ color: "#003466", padding: "4px" }}>Tên sản phẩm</th>
                  <th style={{ color: "#003466", padding: "4px" }}>Đơn vị</th>
                  <th style={{ color: "#003466", padding: "4px" }}>Số lượng</th>
                  <th style={{ color: "#003466", padding: "4px" }}>Đơn giá</th>
                  <th style={{ color: "#003466", padding: "4px" }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {item.contractitem?.map((d: any) => (
                  <tr key={d.id}>
                    <td style={{ padding: "4px" }}>{d.productCode || "—"}</td>
                    <td style={{ padding: "4px" }}>{d.productName}</td>
                    <td style={{ padding: "4px" }}>{d.unit || "—"}</td>
                    <td style={{ padding: "4px", textAlign: "right" }}>{d.quantity?.toLocaleString("vi-VN")}</td>
                    <td style={{ padding: "4px", textAlign: "right" }}>{d.price?.toLocaleString("vi-VN")}đ</td>
                    <td style={{ padding: "4px", textAlign: "right" }}>{d.amount?.toLocaleString("vi-VN")}đ</td>
                  </tr>
                ))}
                {(!item.contractitem || item.contractitem.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "4px", color: "#64748b" }}>Không có chi tiết sản phẩm</td>
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
    <div style={{ padding: isEmbedded ? "10px 8px" : "0px", width: "100%", boxSizing: "border-box" }}>
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
          margin-left: -10px !important;
          margin-right: -10px !important;
          margin-bottom: 10px !important;
          width: calc(100% + 20px) !important;
          box-sizing: border-box !important;
          font-family: "Segoe UI", sans-serif !important;
        }
        .sapo-btn {
          background: #003466 !important;
          color: white !important;
          border: none !important;
          padding: 6px 12px !important;
          font-size: 13px !important;
          font-weight: 500 !important;
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
          min-height: unset !important;
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
        ${isEmbedded ? `
          .desktop-table-wrapper { display: none !important; }
          .mobile-cards-view { display: flex !important; }
          .breadcrumb-banner { display: none !important; }
          .module-tabs-scroll { display: none !important; }
        ` : ""}
        @media (max-width: 768px) {
          .breadcrumb-banner {
            display: none !important;
          }
          .module-tabs-scroll {
            display: none !important;
          }
          .desktop-table-wrapper {
            display: none !important;
          }
          .mobile-cards-view {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .desktop-table-wrapper {
            display: ${isEmbedded ? "none" : "block"} !important;
          }
          .mobile-cards-view {
            display: ${isEmbedded ? "flex" : "none"} !important;
          }
        }
      ` }} />

      {!isEmbedded && (
        <div className="breadcrumb-banner">
          {showNhanSuOnly ? "PHÊ DUYỆT NHÂN SỰ" : 
           showHopDongLaoDongOnly ? "PHÊ DUYỆT HỢP ĐỒNG LAO ĐỘNG" :
           showHopDongBanHangOnly ? "PHÊ DUYỆT HỢP ĐỒNG BÁN HÀNG" :
           showLuongThuongOnly ? "PHÊ DUYỆT BẢNG LƯƠNG/THƯỞNG" :
           showThanhToanOnly ? "PHÊ DUYỆT THANH TOÁN" : "PHÊ DUYỆT HỒ SƠ"}
        </div>
      )}

      {!isEmbedded && (
        <div className="module-tabs-scroll" style={{ display: "flex", gap: "0.5rem", flexWrap: "nowrap", alignItems: "center", overflowX: "auto", padding: "4px 2px" }}>
          {(showHopDongLaoDongOnly || isLegacy) && (
            <button
              onClick={() => setActiveTab("contract")}
              className={`sapo-btn ${activeTab === "contract" ? "" : "btn-outline"}`}
              style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
            >
              HĐ Lao động <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.contracts?.length || 0})</span>
            </button>
          )}

          {(showNhanSuOnly || isLegacy) && (
            <>
              <button
                onClick={() => setActiveTab("leave")}
                className={`sapo-btn ${activeTab === "leave" ? "" : "btn-outline"}`}
                style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
              >
                Nghỉ phép <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.leaves?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab("resignation")}
                className={`sapo-btn ${activeTab === "resignation" ? "" : "btn-outline"}`}
                style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
              >
                Nghỉ việc <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.resignations?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab("transfer")}
                className={`sapo-btn ${activeTab === "transfer" ? "" : "btn-outline"}`}
                style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
              >
                Thuyên chuyển, bổ nhiệm <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.transfers?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab("salary")}
                className={`sapo-btn ${activeTab === "salary" ? "" : "btn-outline"}`}
                style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
              >
                Tăng, giảm lương <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.salaryChanges?.length || 0})</span>
              </button>
            </>
          )}

          {showHopDongBanHangOnly && (
            <button
              onClick={() => setActiveTab("sales_contract")}
              className={`sapo-btn ${activeTab === "sales_contract" ? "" : "btn-outline"}`}
              style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
            >
              HĐ Bán hàng <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.salesContracts?.length || 0})</span>
            </button>
          )}

          {showLuongThuongOnly && (
            <button
              onClick={() => setActiveTab("payroll")}
              className={`sapo-btn ${activeTab === "payroll" ? "" : "btn-outline"}`}
              style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
            >
              Bảng lương/thưởng <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.payrolls?.length || 0})</span>
            </button>
          )}

          {showThanhToanOnly && (
            <button
              onClick={() => setActiveTab("purchase_order")}
              className={`sapo-btn ${activeTab === "purchase_order" ? "" : "btn-outline"}`}
              style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
            >
              Thanh toán <span style={{ marginLeft: "4px", opacity: 0.85 }}>({pending.purchaseOrders?.length || 0})</span>
            </button>
          )}
          
          <button
            onClick={() => setActiveTab("all")}
            className={`sapo-btn ${activeTab === "all" ? "" : "btn-outline"}`}
            style={{ height: "32px", padding: "0 12px", borderRadius: "6px" }}
          >
            Tất cả <span style={{ marginLeft: "4px", opacity: 0.85 }}>({flattenData(approved).length})</span>
          </button>

          <button
            type="button"
            className="sapo-btn btn-outline"
            onClick={() => router.refresh()}
            style={{ height: "32px", padding: "0 12px", borderRadius: "6px", fontWeight: 500 }}
          >
            Làm mới
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "0" }}>

        {/* Toolbar Container */}
        {selectedItem && activeTab !== "all" && (
          <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center", marginTop: "5px" }}>
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
          </div>
        )}

        {/* Mobile Native Card View (Auto active on mobile or embedded mode) */}
        <div className="mobile-cards-view" style={{ display: isEmbedded ? "flex" : undefined, flexDirection: "column", gap: "6px", marginTop: "4px" }}>
          
          {/* 2-Tab Selector Bar: Cần phê duyệt vs Đã phê duyệt (Scale 1.02x khi active/hover) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px",
            background: "#f1f5f9",
            padding: "3px",
            borderRadius: "10px",
            marginBottom: "6px"
          }}>
            {/* Tab 1: Cần phê duyệt */}
            <button
              onClick={() => setMobileApprovalTab("pending")}
              style={{
                background: mobileApprovalTab === "pending" ? "#ffffff" : "transparent",
                border: "none",
                color: mobileApprovalTab === "pending" ? "#ea580c" : "#64748b",
                borderRadius: "7px",
                padding: "6px 8px",
                fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                fontSize: "13px",
                fontWeight: mobileApprovalTab === "pending" ? 600 : 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                boxShadow: mobileApprovalTab === "pending" ? "0 2px 6px rgba(234, 88, 12, 0.12)" : "none",
                transform: mobileApprovalTab === "pending" ? "scale(1.02)" : "scale(1)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
            >
              <span style={{ fontSize: "12px" }}>⏳</span>
              <span>Cần phê duyệt</span>
              <span style={{
                background: mobileApprovalTab === "pending" ? "#fee2e2" : "#e2e8f0",
                color: mobileApprovalTab === "pending" ? "#dc2626" : "#64748b",
                fontSize: "10.5px",
                fontWeight: 600,
                padding: "0px 5px",
                borderRadius: "8px",
                lineHeight: "1.2"
              }}>
                {flattenData(pending).length}
              </span>
            </button>

            {/* Tab 2: Đã phê duyệt */}
            <button
              onClick={() => setMobileApprovalTab("approved")}
              style={{
                background: mobileApprovalTab === "approved" ? "#ffffff" : "transparent",
                border: "none",
                color: mobileApprovalTab === "approved" ? "#059669" : "#64748b",
                borderRadius: "7px",
                padding: "6px 8px",
                fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                fontSize: "13px",
                fontWeight: mobileApprovalTab === "approved" ? 600 : 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                boxShadow: mobileApprovalTab === "approved" ? "0 2px 6px rgba(5, 150, 105, 0.12)" : "none",
                transform: mobileApprovalTab === "approved" ? "scale(1.02)" : "scale(1)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
            >
              <span style={{ fontSize: "12px" }}>✅</span>
              <span>Đã phê duyệt</span>
              <span style={{
                background: mobileApprovalTab === "approved" ? "#d1fae5" : "#e2e8f0",
                color: mobileApprovalTab === "approved" ? "#059669" : "#64748b",
                fontSize: "10.5px",
                fontWeight: 600,
                padding: "0px 5px",
                borderRadius: "8px",
                lineHeight: "1.2"
              }}>
                {flattenData(approved).length}
              </span>
            </button>
          </div>

          {((mobileApprovalTab === "pending" ? flattenData(pending) : flattenData(approved)).length === 0) ? (
            <div style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
              color: "#64748b",
              fontWeight: 600,
              fontSize: "13px",
              border: "1px solid #e2e8f0"
            }}>
              {mobileApprovalTab === "pending" ? "Hiện không có dữ liệu cần phê duyệt" : "Hiện chưa có dữ liệu đã phê duyệt"}
            </div>
          ) : (
            (mobileApprovalTab === "pending" ? flattenData(pending) : flattenData(approved)).map((item) => {
              const itemKey = `${item.moduleType}-${item.id}`;
              const isSelected = selectedItemId === itemKey;
              const isExpanded = expandedId === itemKey;

              const empName = item.employeeName || item.fullName || "Hệ thống";
              
              // 2-Letter Initials for Avatar
              const initialsParts = empName.trim().split(/\s+/);
              const initials = initialsParts.length >= 2 
                ? (initialsParts[0].charAt(0) + initialsParts[initialsParts.length - 1].charAt(0)).toUpperCase()
                : empName.slice(0, 2).toUpperCase();

              // Color map for avatar circles
              const avatarColors = ["#ea580c", "#ef4444", "#2563eb", "#059669", "#7c3aed", "#d97706"];
              let hash = 0;
              for (let i = 0; i < empName.length; i++) hash += empName.charCodeAt(i);
              const avatarBg = avatarColors[hash % avatarColors.length];

              const codeText = item.contractNumber || item.leaveCode || item.resignationCode || item.payrollCode || item.changeCode || item.planNumber || item.employeeCode || item.orderCode || item.poCode || item.id || "—";
              const dateText = new Date(item.createdAt || item.requestDate || item.planDate || Date.now()).toLocaleDateString("vi-VN");

              // Title Text Logic
              let titleText = item.moduleLabel;
              if (item.moduleType === "LeaveRequest") {
                titleText = "Đơn xin nghỉ phép";
              } else if (item.moduleType === "Resignation") {
                titleText = "Đơn xin nghỉ việc";
              } else if (item.moduleType === "SalaryChange") {
                titleText = "Đề xuất tăng/giảm lương";
              } else if (item.moduleType === "TransferPromotion") {
                titleText = "Đề xuất thuyên chuyển, bổ nhiệm";
              } else if (item.moduleType === "LaborContract") {
                titleText = "Hợp đồng lao động";
              } else if (item.moduleType === "Payroll") {
                titleText = `Bảng lương/thưởng Tháng ${item.month}/${item.year}`;
              } else if (item.moduleType === "PurchaseOrder") {
                titleText = "Đề nghị thanh toán đơn mua hàng";
              } else if (item.moduleType === "Contract") {
                titleText = "Hợp đồng bán hàng";
              }

              // Leave / Subtitle Detail Logic
              let leaveDetailText = dateText;
              if (item.moduleType === "LeaveRequest") {
                const startStr = item.startDate ? new Date(item.startDate).toLocaleDateString("vi-VN") : dateText;
                const endStr = item.endDate ? new Date(item.endDate).toLocaleDateString("vi-VN") : startStr;
                leaveDetailText = `Từ ngày ${startStr} đến ngày ${endStr}`;
              } else if (item.moduleType === "Resignation") {
                const resDateStr = item.resignationDate ? new Date(item.resignationDate).toLocaleDateString("vi-VN") : dateText;
                leaveDetailText = `Ngày sẽ nghỉ: ${resDateStr}`;
              } else {
                leaveDetailText = getDetailText(item);
              }

              return (
                <div
                  key={itemKey}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    border: isSelected ? "2px solid #ea580c" : (mobileApprovalTab === "approved" ? "1px solid #d1fae5" : "1px solid #ffedd5"),
                    boxShadow: mobileApprovalTab === "approved" ? "0 2px 8px rgba(5, 150, 105, 0.04)" : "0 2px 8px rgba(234, 88, 12, 0.04)",
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}
                >
                  {/* Row 1: Pill Badge on Left + Status Badge (e.g., Đã phê duyệt) on Right (CÙNG DÒNG) */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", width: "100%", marginBottom: "2px" }}>
                    <span style={{
                      fontSize: "9.5px",
                      fontWeight: 600,
                      background: (mobileApprovalTab === "approved" || item.status === "Đã phê duyệt") ? "#059669" : "#ea580c",
                      color: "#ffffff",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.2px",
                      whiteSpace: "nowrap",
                      display: "inline-block"
                    }}>
                      {item.moduleLabel}
                    </span>

                    {/* Status badge for non-pending items (Đã phê duyệt / Từ chối) on the SAME LINE as Orange Badge */}
                    {(item.status === "Đã phê duyệt" || item.status === "Đã hủy" || item.status === "Từ chối") && (
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 400,
                        color: item.status === "Đã phê duyệt" ? "#059669" : "#dc2626",
                        background: item.status === "Đã phê duyệt" ? "#ecfdf5" : "#fef2f2",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        whiteSpace: "nowrap",
                        flexShrink: 0
                      }}>
                        {item.status}
                      </span>
                    )}
                  </div>

                  {/* Row 2: Main Info Column (Title + NV + Duration) & Right Action Buttons (Bố trí như cũ) */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    {/* Left Info Column */}
                    <div style={{ flex: 1 }}>
                      {/* Main Title Text */}
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", lineHeight: "1.3" }}>
                        {titleText}
                      </div>

                      {/* Line 1: Employee Name */}
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px", fontWeight: 400 }}>
                        NV: {empName}
                      </div>

                      {/* Line 2: Branch Name */}
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px", fontWeight: 400 }}>
                        Chi nhánh: {item.branchName || item.branch || item.department || "Buôn Ma Thuột"}
                      </div>

                      {/* Line 3: Leave duration / details */}
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px", fontWeight: 400, lineHeight: "1.35" }}>
                        {leaveDetailText}
                      </div>
                    </div>

                    {/* Right Side Buttons (Duyệt ngay & Từ chối) (Chữ không in đậm, fontWeight 400) */}
                    {item.status !== "Đã phê duyệt" && item.status !== "Đã hủy" && item.status !== "Từ chối" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-end", flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(item.id, item.moduleType, 'approve', `${item.moduleLabel} - ${empName}`);
                          }}
                          style={{
                            background: "linear-gradient(135deg, #ff5c00 0%, #ea580c 100%)",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            fontSize: "11px",
                            fontWeight: 400,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            boxShadow: "0 2px 6px rgba(234, 88, 12, 0.2)"
                          }}
                        >
                          Duyệt ngay →
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction(item.id, item.moduleType, 'reject', `${item.moduleLabel} - ${empName}`);
                          }}
                          style={{
                            background: "#ffffff",
                            color: "#dc2626",
                            border: "1px solid #fca5a5",
                            borderRadius: "8px",
                            padding: "5px 10px",
                            fontSize: "11px",
                            fontWeight: 400,
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          ✕ Từ chối
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Toggle Expand Details (Chữ không in đậm, fontWeight 400) */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : itemKey)}
                    style={{
                      fontSize: "11px",
                      fontWeight: 400,
                      color: mobileApprovalTab === "approved" ? "#059669" : "#ea580c",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px 0",
                      cursor: "pointer",
                      borderTop: mobileApprovalTab === "approved" ? "1px dashed #a7f3d0" : "1px dashed #fed7aa",
                      marginTop: "2px"
                    }}
                  >
                    {isExpanded ? "▲ Thu gọn chi tiết" : "▼ Xem chi tiết đầy đủ"}
                  </div>

                  {/* Expanded Detail Body */}
                  {isExpanded && (
                    <div style={{ background: "#fff7ed", padding: "10px", borderRadius: "10px", fontSize: "12px", border: "1px solid #ffedd5" }}>
                      {renderItemDetails(item)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-wrapper base-table-wrapper" style={{ overflow: "visible", display: isEmbedded ? "none" : undefined }}>
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
                  <td colSpan={7} style={{ textAlign: "center", padding: "10px", color: "#64748b", fontWeight: 600 }}>
                    Hiện không có dữ liệu cần phê duyệt
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
        {confirmState.show && typeof window !== "undefined" && createPortal(
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999999,
            backdropFilter: "blur(2px)",
            padding: "16px"
          }}>
            <div style={{
              width: "100%",
              maxWidth: "300px",
              padding: "18px 16px 14px 16px",
              textAlign: "center",
              borderRadius: "16px",
              background: "#ffffff",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              transform: "translateY(-45px)"
            }}>
              {/* Centered Circular Icon */}
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: confirmState.action === 'approve' ? "#e0f2fe" : "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 10px auto"
              }}>
                {confirmState.action === 'approve' ? (
                  <CheckCircle2 size={22} color="#003466" strokeWidth={2.2} />
                ) : (
                  <XCircle size={22} color="#ef4444" strokeWidth={2.2} />
                )}
              </div>

              {/* Simple content text */}
              <div style={{
                fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                fontSize: "13px",
                fontWeight: 400,
                color: "#334155",
                marginBottom: confirmState.action === 'reject' ? "10px" : "14px",
                lineHeight: "1.3"
              }}>
                {confirmState.action === 'approve' ? "Bạn có chắc chắn phê duyệt không?" : "Bạn có chắc chắn từ chối không?"}
              </div>

              {confirmState.action === 'reject' && (
                <div style={{ marginBottom: "14px", textAlign: "left" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px", fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}>
                    Lý do từ chối <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    style={{
                      width: "100%",
                      height: "34px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      padding: "0 10px",
                      fontSize: "12px",
                      fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                      outline: "none"
                    }}
                    placeholder="Nhập lý do từ chối..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Action Buttons: Thoát & Đồng ý */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    height: "36px",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    color: "#334155",
                    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                    fontSize: "13px",
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer"
                  }}
                  onClick={() => setConfirmState(prev => ({ ...prev, show: false }))}
                >
                  Thoát
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    height: "36px",
                    borderRadius: "8px",
                    background: confirmState.action === 'approve' ? "#003466" : "#ef4444",
                    color: "#ffffff",
                    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                    fontSize: "13px",
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer"
                  }}
                  onClick={executeAction}
                >
                  Đồng ý
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
