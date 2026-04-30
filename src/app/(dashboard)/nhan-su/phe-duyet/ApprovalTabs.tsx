"use client";

import { useState, useTransition, useEffect } from "react";
import { updateApprovalStatus } from "./actions";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";

interface ApprovalTabsProps {
  contracts: any[];
  leaves: any[];
  salaryChanges: any[];
  transfers: any[];
  resignations: any[];
  payrolls: any[];
}

export default function ApprovalTabs(props: ApprovalTabsProps) {
  const [data, setData] = useState({
    contracts: props.contracts,
    leaves: props.leaves,
    salaryChanges: props.salaryChanges,
    transfers: props.transfers,
    resignations: props.resignations,
    payrolls: props.payrolls
  });

  // Real-time sync for all approval categories
  useRealTimeSync("approvals", [], (newData: any) => {
    setData(newData);
  });

  const allTabs = [
    { key: "contracts", label: "Hợp đồng lao động", data: data.contracts, type: "LaborContract" },
    { key: "leaves", label: "Nghỉ phép", data: data.leaves, type: "LeaveRequest" },
    { key: "salaryChanges", label: "Tăng/Giảm lương", data: data.salaryChanges, type: "SalaryChange" },
    { key: "transfers", label: "Thuyên chuyển/Bổ nhiệm", data: data.transfers, type: "TransferPromotion" },
    { key: "resignations", label: "Nghỉ việc", data: data.resignations, type: "Resignation" },
    { key: "payrolls", label: "Bảng lương", data: data.payrolls, type: "Payroll" },
  ];

  const tabs = allTabs.filter(t => t.data.length > 0);
  
  // Set default active tab to the first non-empty tab
  const [activeTab, setActiveTab] = useState(() => tabs[0]?.key || "contracts");

  // If current active tab is empty and hidden, switch to the first available tab
  if (activeTab !== "contracts" && tabs.length > 0 && !tabs.some(t => t.key === activeTab)) {
    setActiveTab(tabs[0].key);
  }

  const [isPending, startTransition] = useTransition();

  const activeData = tabs.find(t => t.key === activeTab);

  async function handleAction(id: string, type: string, action: string) {
    const confirmMsg = action === 'approve' ? 'Phê duyệt' : 'Trả lại';
    if (!confirm(`Bạn có chắc chắn muốn ${confirmMsg} bản ghi này?`)) return;
    
    startTransition(async () => {
      try {
        const newStatus = action === 'approve' ? "Đã phê duyệt" : "Tạo mới";
        await updateApprovalStatus(id, type, newStatus);
        window.location.reload();
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div className="tabs" style={{ display: "flex", gap: "1rem", borderBottom: "1px solid #e2e8f0", marginBottom: "1.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "0.75rem 1rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.key ? "3px solid var(--primary-color)" : "3px solid transparent",
              color: activeTab === tab.key ? "var(--primary-color)" : "#64748b",
              fontWeight: activeTab === tab.key ? "700" : "500",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontSize: "0.95rem"
            }}
          >
            {tab.label} ({tab.data.length})
          </button>
        ))}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "180px", textAlign: "center" }}>Thao tác</th>
              <th style={{ width: "50px", textAlign: "center" }}>STT</th>
              <th>Mã/Số</th>
              <th>Nhân viên</th>
              <th>Ngày</th>
              <th>Chi tiết</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {tabs.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "600" }}>Tất cả hồ sơ đã được xử lý xong!</div>
                  <div style={{ marginTop: "0.5rem" }}>Không có yêu cầu nào đang chờ phê duyệt.</div>
                </td>
              </tr>
            )}
            {activeData?.data.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center" }}>
                   <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                    <button 
                      className="btn btn-sm btn-success" 
                      onClick={() => handleAction(item.id, activeData.type, 'approve')}
                      disabled={isPending}
                    >
                      Phê duyệt
                    </button>
                    <button 
                      className="btn btn-sm btn-danger" 
                      onClick={() => handleAction(item.id, activeData.type, 'reject')}
                      disabled={isPending}
                    >
                      Trả lại
                    </button>
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{item.contractNumber || item.planNumber || item.employeeCode || "—"}</td>
                <td style={{ fontWeight: 500 }}>{item.employeeName || item.fullName || "Hệ thống"}</td>
                <td>{new Date(item.createdAt || item.requestDate || item.planDate).toLocaleDateString("vi-VN")}</td>
                <td style={{ fontSize: "0.9rem" }}>
                   {activeTab === "contracts" && `${item.contractType} - ${item.position}`}
                   {activeTab === "leaves" && `${item.reason} (${item.totalDays} ngày)`}
                   {activeTab === "salaryChanges" && `${item.type}: ${item.currentSalaryLevel} ➡️ ${item.proposedSalaryLevel}`}
                   {activeTab === "transfers" && `${item.currentPosition} ➡️ ${item.newPosition}`}
                   {activeTab === "resignations" && `Lý do: ${item.reason}`}
                   {activeTab === "payrolls" && `Tháng ${item.month}/${item.year}`}
                </td>
                <td>{item.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
