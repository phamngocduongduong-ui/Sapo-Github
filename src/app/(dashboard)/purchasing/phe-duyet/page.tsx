"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  CheckCircle2, X, Clock, FileText, Search, 
  ChevronRight, Calendar, User, Building2, Package, History, RefreshCw
} from "lucide-react";
import { getPheDuyetPurchaseOrders, updatePOStatus } from "../lenh-mua/actions";
import HistoryModal from "../../HistoryModal";

export default function PurchasingApprovalPage() {
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "processed">("pending");
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchData();
    fetchUser();
  }, []);

  async function fetchData() {
    const data = await getPheDuyetPurchaseOrders();
    setItems(data);
  }

  async function fetchUser() {
    const res = await fetch("/api/user-permissions");
    const data = await res.json();
    setCurrentUser(data);
  }

  const handleAction = (id: string, status: string) => {
    const actionText = status === "Chờ thực hiện" ? "phê duyệt" : "từ chối";
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} lệnh mua này?`)) return;
    
    startTransition(async () => {
      await updatePOStatus(id, status);
      fetchData();
      setSelectedPO(null);
    });
  };

  const pendingItems = items.filter(i => i.status === "Chờ phê duyệt");
  const processedItems = items.filter(i => i.status === "Chờ thực hiện" || i.status === "Đã phê duyệt");
  const currentItems = activeTab === "pending" ? pendingItems : processedItems;

  return (
    <div style={{ padding: "1.5rem", width: "100%", height: "calc(100vh - 60px)", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>✅ Phê duyệt Lệnh mua</h1>
          <p style={{ color: "#64748b", marginTop: "0.25rem" }}>Xét duyệt các yêu cầu mua hàng từ các chi nhánh</p>
        </div>
        <button className="btn btn-outline" onClick={() => fetchData()} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <RefreshCw size={18} /> Làm mới
        </button>
      </div>

      <div style={{ display: "flex", gap: "2rem", borderBottom: "1px solid #e2e8f0" }}>
        <button 
          onClick={() => setActiveTab("pending")}
          style={{ 
            padding: "0.75rem 0", 
            borderBottom: activeTab === "pending" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "pending" ? "#2563eb" : "#64748b",
            fontWeight: 600,
            background: "none",
            borderLeft: "none",
            borderRight: "none",
            borderTop: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <Clock size={18} /> Chờ phê duyệt ({pendingItems.length})
        </button>
        <button 
          onClick={() => setActiveTab("processed")}
          style={{ 
            padding: "0.75rem 0", 
            borderBottom: activeTab === "processed" ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === "processed" ? "#2563eb" : "#64748b",
            fontWeight: 600,
            background: "none",
            borderLeft: "none",
            borderRight: "none",
            borderTop: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <CheckCircle2 size={18} /> Đã xử lý ({processedItems.length})
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedPO ? "1fr 450px" : "1fr", gap: "1.5rem", flex: 1, overflow: "hidden" }}>
        {/* List Column */}
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="table-container" style={{ margin: 0, borderRadius: 0, flex: 1, overflowY: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ textAlign: "center", width: "160px" }}>Thao tác</th>
                  <th>Mã lệnh</th>
                  <th>Người tạo</th>
                  <th>Chi nhánh</th>
                  <th>Ngày đề nghị</th>
                  <th>Mục đích</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>Không có lệnh mua nào {activeTab === "pending" ? "đang chờ" : "đã xử lý"}</td></tr>
                ) : (
                  currentItems.map(item => (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedPO(item)}
                      style={{ 
                        cursor: "pointer", 
                        background: selectedPO?.id === item.id ? "#f0f7ff" : "transparent"
                      }}
                    >
                      <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                          {activeTab === "pending" ? (
                            <>
                              <button className="btn btn-sm btn-success" onClick={() => handleAction(item.id, "Chờ mua hàng")}>Duyệt</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleAction(item.id, "Tạo mới")}>Từ chối</button>
                            </>
                          ) : (
                            <span className={`badge ${(item.status === "Chờ mua hàng" || item.status === "Đã phê duyệt") ? "badge-success" : "badge-danger"}`}>
                              {(item.status === "Chờ mua hàng" || item.status === "Đã phê duyệt") ? "Đã duyệt" : "Từ chối"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: "#2563eb" }}>{item.poCode}</td>
                      <td>{item.creator}</td>
                      <td>{item.branch}</td>
                      <td>{new Date(item.requestedDate).toLocaleDateString("vi-VN")}</td>
                      <td>{item.purpose}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Column */}
        {selectedPO && (
          <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, animation: "slideInRight 0.3s ease" }}>
            <div style={{ padding: "1.25rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <h3 style={{ margin: 0 }}>Chi tiết lệnh mua</h3>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button className="btn btn-sm btn-outline" onClick={() => setHistoryRecordId(selectedPO.id)}>
                  <History size={14} style={{ marginRight: "4px" }} /> Lịch sử
                </button>
                <button className="btn-icon" onClick={() => setSelectedPO(null)}><X size={20} /></button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <DetailItem icon={<FileText size={14}/>} label="Mã lệnh" value={selectedPO.poCode} color="#2563eb" />
                <DetailItem icon={<Calendar size={14}/>} label="Ngày đề nghị" value={new Date(selectedPO.requestedDate).toLocaleDateString("vi-VN")} />
                <DetailItem icon={<User size={14}/>} label="Người tạo" value={selectedPO.creator} />
                <DetailItem icon={<Building2 size={14}/>} label="Chi nhánh" value={selectedPO.branch} />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Mục đích</label>
                <div style={{ marginTop: "0.25rem", fontWeight: 500 }}>{selectedPO.purpose}</div>
              </div>

              {selectedPO.note && (
                <div style={{ marginBottom: "1.5rem", padding: "0.75rem", background: "#fffbeb", borderRadius: "8px", borderLeft: "4px solid #f59e0b" }}>
                  <label style={{ fontSize: "0.7rem", color: "#92400e", fontWeight: 700, textTransform: "uppercase" }}>Ghi chú</label>
                  <div style={{ marginTop: "0.25rem", fontSize: "0.85rem", color: "#92400e" }}>{selectedPO.note}</div>
                </div>
              )}

              <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}><Package size={18} /> Danh sách hàng hóa</h4>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                {selectedPO.purchaseorderdetail?.map((d: any, idx: number) => (
                  <div key={idx} style={{ padding: "0.75rem", borderBottom: idx === selectedPO.purchaseorderdetail.length - 1 ? "none" : "1px solid #f1f5f9" }}>
                    <div style={{ fontWeight: 600 }}>{d.productName}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#64748b", marginTop: "0.25rem" }}>
                      <span>Mã: {d.productCode}</span>
                      <span style={{ fontWeight: 700, color: "#2563eb" }}>{d.requestedQuantity} {d.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {activeTab === "pending" && (
              <div style={{ padding: "1.25rem", borderTop: "1px solid #f1f5f9", display: "flex", gap: "0.75rem", background: "#f8fafc" }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }} 
                  onClick={() => handleAction(selectedPO.id, "Chờ thực hiện")}
                  disabled={isPending}
                >
                  <CheckCircle2 size={18} /> Phê duyệt
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1, color: "#e11d48", borderColor: "#fecaca" }} 
                  onClick={() => handleAction(selectedPO.id, "Tạo mới")}
                  disabled={isPending}
                >
                  <X size={18} /> Từ chối
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {historyRecordId && (
        <HistoryModal 
          tableName="PurchaseOrder" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function DetailItem({ icon, label, value, color }: any) {
  return (
    <div>
      <label style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        {icon} {label}
      </label>
      <div style={{ marginTop: "0.25rem", fontWeight: 600, color: color || "#1e293b" }}>{value}</div>
    </div>
  );
}
