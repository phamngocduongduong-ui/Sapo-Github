"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  CheckCircle2, X, Clock, FileText, Search, 
  ChevronRight, Calendar, User, Building2, Package, History, RefreshCw,
  MoreHorizontal, Eye, Check
} from "lucide-react";
import { getPheDuyetPurchaseOrders, updatePOStatus } from "../lenh-mua/actions";
import HistoryModal from "../../HistoryModal";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";

export default function PurchasingApprovalPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "processed">("pending");
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useRealTimeSync("purchase-orders", items, (newData: any[]) => {
    const filtered = newData.filter((po: any) => 
      ["Chờ phê duyệt", "Chờ thực hiện", "Đã phê duyệt"].includes(po.status)
    );
    setItems(filtered);
  }, 3000, openMenuId !== null);

  useEffect(() => {
    fetchData();
    fetchUser();
  }, []);

  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
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
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} đơn mua hàng này?`)) return;
    
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
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
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
        .horizontal-action-dropdown {
          background: white !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
          padding: 4px !important;
          position: absolute !important;
          z-index: 50 !important;
          display: flex !important;
          gap: 4px !important;
        }
        .icon-action-btn {
          border: 1px solid #cbd5e1 !important;
          background: white !important;
          border-radius: 4px !important;
          padding: 4px !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .icon-action-btn:hover {
          background: #f1f5f9 !important;
        }
        .action-btn {
          border: 1px solid #cbd5e1 !important;
          background: white !important;
          border-radius: 4px !important;
          padding: 4px 8px !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .action-btn:hover {
          background: #f1f5f9 !important;
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
        `
      }} />
      {!isEmbedded && (
        <div className="breadcrumb-banner">
          PHÊ DUYỆT MUA HÀNG
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "0", width: "100%", minHeight: isEmbedded ? "auto" : "calc(100vh - 140px)", height: "auto" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "nowrap", overflowX: "auto", padding: "4px 2px" }}>
          <button 
            onClick={() => setActiveTab("pending")}
            className={`sapo-btn ${activeTab === "pending" ? "" : "btn-outline"}`}
            style={{ height: "32px", padding: "0 12px", borderRadius: "6px", fontWeight: 500 }}
          >
            Chờ phê duyệt ({pendingItems.length})
          </button>
          <button 
            onClick={() => setActiveTab("processed")}
            className={`sapo-btn ${activeTab === "processed" ? "" : "btn-outline"}`}
            style={{ height: "32px", padding: "0 12px", borderRadius: "6px", fontWeight: 500 }}
          >
            Đã xử lý ({processedItems.length})
          </button>

          {!isEmbedded && (
            <button 
              className="sapo-btn btn-outline" 
              onClick={() => fetchData()} 
              style={{ height: "32px", padding: "0 12px", borderRadius: "6px", fontWeight: 500 }}
            >
              Làm mới
            </button>
          )}
        </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedPO ? "1fr 450px" : "1fr", gap: "1.5rem" }}>
        {/* Table Column */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div className="base-table-wrapper" style={{ margin: 0, overflow: "visible" }}>
            <table className="base-table" style={{ overflow: "visible" }}>
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
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "10px", color: "#64748b", fontWeight: 600 }}>
                      Hiện không có dữ liệu cần phê duyệt
                    </td>
                  </tr>
                ) : (
                  currentItems.map(item => (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedPO(item)}
                      className={`row-hoverable ${selectedPO?.id === item.id ? "row-selected" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ textAlign: "center", position: "relative" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === item.id ? null : item.id);
                            }}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </div>

                        {openMenuId === item.id && (
                          <div className="horizontal-action-dropdown" style={{ left: "50%", transform: "translateX(-50%)" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="icon-action-btn"
                              title="Xem chi tiết"
                              onClick={() => { setSelectedPO(item); setOpenMenuId(null); }}
                            >
                              <Eye size={15} style={{ color: "#3b82f6" }} />
                            </button>
                            
                            {activeTab === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  className="icon-action-btn"
                                  title="Phê duyệt"
                                  onClick={() => { handleAction(item.id, "Chờ mua hàng"); setOpenMenuId(null); }}
                                >
                                  <Check size={15} style={{ color: "#22c55e" }} />
                                </button>
                                <button
                                  type="button"
                                  className="icon-action-btn danger"
                                  title="Từ chối"
                                  onClick={() => { handleAction(item.id, "Tạo mới"); setOpenMenuId(null); }}
                                >
                                  <X size={15} style={{ color: "#ef4444" }} />
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: "0.85rem", padding: "0 0.5rem", color: "#64748b", whiteSpace: "nowrap" }}>
                                {(item.status === "Chờ mua hàng" || item.status === "Đã phê duyệt") ? "Đã duyệt" : "Từ chối"}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: "#2563eb" }}>{item.poCode}</span>
                      </td>
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
              <h3 style={{ margin: 0 }}>Chi tiết đơn mua hàng</h3>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button className="btn btn-sm btn-outline" onClick={() => setHistoryRecordId(selectedPO.id)}>
                  <History size={14} style={{ marginRight: "4px" }} /> Lịch sử
                </button>
                <button className="btn-icon" onClick={() => setSelectedPO(null)}><X size={20} /></button>
              </div>
            </div>
            <div style={{ padding: "1.25rem" }}>
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
                  style={{ flex: 1, fontWeight: 500 }} 
                  onClick={() => handleAction(selectedPO.id, "Chờ thực hiện")}
                  disabled={isPending}
                >
                  Phê duyệt
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1, color: "#e11d48", borderColor: "#fecaca", fontWeight: 500 }} 
                  onClick={() => handleAction(selectedPO.id, "Tạo mới")}
                  disabled={isPending}
                >
                  Từ chối
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

    </div>
    </>
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
