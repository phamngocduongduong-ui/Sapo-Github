"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { 
  CheckCircle, X, RefreshCw, Eye, History, AlertTriangle, FileText, Calendar, ChevronDown, Package
} from "lucide-react";
import { getPheDuyetPurchaseOrders, updatePOStatus } from "../lenh-mua/actions";
import HistoryModal from "../../HistoryModal";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";

export default function PurchasingApprovalPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string, type: "APPROVE" | "REJECT", info: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useRealTimeSync("purchase-orders", items, (newData: any[]) => {
    const filtered = newData.filter((po: any) => po.status !== "Tạo mới");
    setItems(filtered);
  }, 3000, showModal);

  const selectedPOObj = useMemo(() => {
    return items.find((p) => p.id === selectedPOId) || null;
  }, [items, selectedPOId]);

  useEffect(() => {
    const handleClick = () => setSelectedPOId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    fetchData();
    fetchUser();
  }, []);

  async function fetchData() {
    const data = await getPheDuyetPurchaseOrders();
    setItems(data);
  }

  async function fetchUser() {
    try {
      const res = await fetch("/api/user-permissions");
      const data = await res.json();
      setCurrentUser(data);
    } catch (e) {
      console.error("Failed to fetch user permissions", e);
    }
  }

  // Active tab state: "pending" | "processed"
  const [activeTab, setActiveTab] = useState<"pending" | "processed">("pending");

  const pendingItems = items.filter(i => i.status === "Chờ phê duyệt");
  const processedItems = items.filter(i => i.status !== "Tạo mới" && i.status !== "Chờ phê duyệt");
  const currentItems = activeTab === "pending" ? pendingItems : processedItems;

  const openViewModal = (po: any) => {
    setSelectedPO(po);
    setDetails(po.purchaseorderdetail || []);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedPO(null);
    setDetails([]);
  };

  const handleApprove = (id: string, code: string) => {
    setConfirmAction({ id, type: "APPROVE", info: code });
  };

  const handleReject = (id: string, code: string) => {
    setConfirmAction({ id, type: "REJECT", info: code });
  };

  const executeAction = () => {
    if (!confirmAction) return;
    const { id, type } = confirmAction;

    setConfirmAction(null);
    startTransition(async () => {
      try {
        const nextStatus = type === "APPROVE" ? "Chờ thực hiện" : "Từ chối";
        await updatePOStatus(id, nextStatus);
        setSelectedPOId(null);
        fetchData();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  return (
    <>
      <div className="purchasing-approval-container" style={{ padding: isEmbedded ? "10px 8px" : "0px", boxSizing: "border-box" }}>
        <style dangerouslySetInnerHTML={{
          __html: `
          .purchasing-approval-container {
            width: 100%;
            min-width: 0;
          }
          .maintenance-layout {
            display: flex;
            gap: 1.5rem;
            width: 100%;
            min-width: 0;
            font-family: "Segoe UI", -apple-system, sans-serif;
            font-size: 13px;
            padding: 10px 0px 10px 0px;
          }
          .maintenance-layout input,
          .maintenance-layout select,
          .maintenance-layout textarea,
          .maintenance-layout button,
          .maintenance-layout table,
          .maintenance-layout td,
          .maintenance-layout th,
          .maintenance-layout label,
          .maintenance-layout .badge,
          .maintenance-layout .blue-panel-header,
          .purchasing-approval-container .breadcrumb-banner {
            font-size: 13px !important;
          }
          .breadcrumb-banner {
            background-color: #003466;
            color: white;
            padding: 6px 15px 6px 15px;
            font-weight: 700;
            display: block;
            border-radius: 0 !important;
            margin-top: 0px !important;
            margin-left: -10px !important;
            margin-right: -10px !important;
            margin-bottom: 10px !important;
            width: calc(100% + 20px) !important;
            box-sizing: border-box !important;
          }
          .panel-full {
            flex: 1 1 100%;
            width: 100%;
            min-width: 0;
          }
          .search-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 5px 0px 10px 0px;
            gap: 0.5rem;
            flex-wrap: wrap;
          }
          .sapo-btn {
            background: #003466 !important;
            color: white !important;
            border: none !important;
            padding: 6px 15px 6px 15px !important;
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
          .sapo-btn-success {
            background-color: #22c55e !important;
          }
          .sapo-btn-success:hover {
            background-color: #16a34a !important;
          }
          .sapo-btn-danger {
            background-color: #ef4444 !important;
          }
          .sapo-btn-danger:hover {
            background-color: #dc2626 !important;
          }
          .sapo-btn-secondary {
            background-color: #475569 !important;
          }
          .sapo-btn-secondary:hover {
            background-color: #334155 !important;
          }
          .row-hoverable:hover {
            background-color: #f8fafc;
          }
          .row-selected {
            background-color: #eff6ff !important;
          }
          .base-table-wrapper {
            height: auto !important;
            min-height: unset !important;
            overflow-y: hidden !important;
            overflow-x: auto !important;
            padding-bottom: 0px !important;
            margin-top: 10px !important;
          }
          .base-table {
            height: auto !important;
            width: 100% !important;
            min-width: 1200px !important;
            table-layout: auto !important;
            border-collapse: collapse !important;
            margin-bottom: 0px !important;
          }
          .base-table th {
            text-transform: uppercase !important;
            font-weight: 700 !important;
            color: #003466 !important;
            background: #f1f5f9 !important;
            border-bottom: 2px solid #ff5c00 !important;
            text-align: center !important;
            height: 35px !important;
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
          .base-table td {
            padding: 6px 0.75rem !important;
            vertical-align: middle !important;
            white-space: normal !important;
            word-break: break-word !important;
            border-bottom: none !important;
          }
          .base-table tbody tr {
            height: 45px !important;
          }
          .nowrap, .base-table .nowrap {
            white-space: nowrap !important;
          }
          .filter-label {
            display: block;
            margin-bottom: 0.4rem;
            font-size: 0.85rem;
            font-weight: 700;
            color: #003466;
            text-transform: uppercase;
          }
          .form-control {
            padding: 6px 10px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 4px !important;
            outline: none !important;
            background: white !important;
          }
          .base-table .status-pill {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            font-weight: 600 !important;
            font-size: 13px !important;
            border-radius: 0 !important;
          }
          .base-table .status-pill.status-active {
            color: #166534 !important;
          }
          .base-table .status-pill.status-pending {
            color: #d97706 !important;
          }
          .base-table .status-pill.status-new {
            color: #4f46e5 !important;
          }

          .custom-modal-overlay {
            position: fixed;
            background: rgba(15, 23, 42, 0.6) !important;
            backdrop-filter: blur(4px) !important;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999 !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
          }
          .custom-modal-overlay .filter-label {
            text-transform: uppercase !important;
            color: #003466 !important;
            font-weight: 700 !important;
            margin-bottom: 0.35rem !important;
            font-size: 0.85rem !important;
          }
          .custom-modal-overlay .scrollable-body::-webkit-scrollbar {
            display: none !important;
          }
          .custom-modal-overlay .scrollable-body {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
          .custom-modal-overlay .modal-footer-btn-secondary {
            background-color: #334155 !important;
            color: white !important;
            font-weight: 500 !important;
            border-radius: 6px !important;
            padding: 8px 20px !important;
            font-size: 14px !important;
            border: none !important;
            cursor: pointer !important;
            transition: background-color 0.2s, transform 0.1s !important;
          }
          .custom-modal-overlay .modal-footer-btn-secondary:hover {
            background-color: #1e293b !important;
          }
          .custom-modal-overlay .modal-footer-btn-success {
            background-color: #22c55e !important;
            color: white !important;
            font-weight: 500 !important;
            border-radius: 6px !important;
            padding: 8px 20px !important;
            font-size: 14px !important;
            border: none !important;
            cursor: pointer !important;
            transition: background-color 0.2s, transform 0.1s !important;
          }
          .custom-modal-overlay .modal-footer-btn-success:hover {
            background-color: #16a34a !important;
          }
          .custom-modal-overlay .input {
            border-radius: 8px !important;
            border: 1px solid #cbd5e1 !important;
            padding: 6px 12px !important;
            height: 34px !important;
            transition: border-color 0.2s, box-shadow 0.2s !important;
          }
          .custom-modal-overlay .input:focus {
            border-color: #ff5c00 !important;
            box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
          }
          .tab3-goods-table th {
            text-transform: uppercase !important;
            color: #003466 !important;
            font-weight: 700 !important;
            text-align: center !important;
          }
          .mobile-only {
            display: ${isEmbedded ? "flex" : "none"} !important;
            ${isEmbedded ? "flex-direction: column !important; gap: 6px !important;" : ""}
          }
          .desktop-only {
            display: ${isEmbedded ? "none" : "block"} !important;
          }
          @media (max-width: 768px) {
            .desktop-only {
              display: none !important;
            }
            .mobile-only {
              display: flex !important;
              flex-direction: column !important;
              gap: 6px !important;
            }
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
              onClick={() => {
                setActiveTab("pending");
                setSelectedPOId(null);
              }}
              className={`sapo-btn ${activeTab === "pending" ? "" : "btn-outline"}`}
              style={{ height: "32px", padding: "0 12px", borderRadius: "6px", fontWeight: 500 }}
            >
              Chờ phê duyệt ({pendingItems.length})
            </button>
            <button 
              onClick={() => {
                setActiveTab("processed");
                setSelectedPOId(null);
              }}
              className={`sapo-btn ${activeTab === "processed" ? "" : "btn-outline"}`}
              style={{ height: "32px", padding: "0 12px", borderRadius: "6px", fontWeight: 500 }}
            >
              Đã phê duyệt ({processedItems.length})
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

          <div className="desktop-only">
            <div className="maintenance-layout" style={{ paddingTop: "0px" }}>
              <div className="panel-full">
                {selectedPOObj && (
                  <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center", marginTop: "0px" }}>
                    <button
                      type="button"
                      className="sapo-btn"
                      onClick={() => openViewModal(selectedPOObj)}
                    >
                      Xem
                    </button>

                    {activeTab === "pending" && selectedPOObj.status === "Chờ phê duyệt" && (
                      <>
                        <button
                          type="button"
                          className="sapo-btn sapo-btn-success"
                          onClick={() => handleApprove(selectedPOObj.id, selectedPOObj.poCode)}
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          className="sapo-btn sapo-btn-danger"
                          onClick={() => handleReject(selectedPOObj.id, selectedPOObj.poCode)}
                        >
                          Từ chối
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      className="sapo-btn"
                      onClick={() => setHistoryRecordId(selectedPOObj.id)}
                    >
                      Lịch sử
                    </button>
                  </div>
                )}

                {/* Purchase Orders Table */}
                <div className="base-table-wrapper" style={currentItems.length === 0 ? { height: "auto" } : undefined}>
                  <table className="base-table">
                    <thead>
                      <tr>
                        <th className="nowrap" style={{ width: "50px" }}>STT</th>
                        <th className="nowrap" style={{ width: "120px" }}>Mã lệnh</th>
                        <th className="nowrap" style={{ width: "100px" }}>Ngày đề nghị</th>
                        <th style={{ width: "170px" }}>Người tạo</th>
                        <th style={{ width: "150px" }}>Chi nhánh</th>
                        <th style={{ width: "250px" }}>Mục đích</th>
                        <th className="nowrap" style={{ width: "120px" }}>Trạng thái</th>
                        <th style={{ minWidth: "250px" }}>Thông tin hàng hóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: "center", padding: "10px", color: "#64748b", fontWeight: 600 }}>
                            Hiện không có dữ liệu cần phê duyệt
                          </td>
                        </tr>
                      ) : (
                        currentItems.map((item, idx) => {
                          const isSelected = selectedPOId === item.id;
                          return (
                            <tr
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPOId(isSelected ? null : item.id);
                              }}
                              onDoubleClick={() => openViewModal(item)}
                              className={`row-hoverable ${isSelected ? "row-selected" : ""}`}
                              style={{ cursor: "pointer" }}
                            >
                              <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{idx + 1}</td>
                              <td className="nowrap" style={{ textAlign: "center", fontWeight: 600, color: "#2563eb" }}>{item.poCode}</td>
                              <td className="nowrap" style={{ textAlign: "center" }}>
                                {new Date(item.requestedDate).toLocaleDateString("vi-VN")}
                              </td>
                              <td style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{item.creator}</td>
                              <td style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{item.branch}</td>
                              <td style={{ textAlign: "left" }}>{item.purpose}</td>
                              <td className="nowrap" style={{ textAlign: "center" }}>
                                <span
                                  className={`status-pill ${
                                    item.status === "Đã giao hàng" || item.status === "Hoàn tất" || item.status === "Chờ giao hàng"
                                      ? "status-active"
                                      : item.status === "Chờ phê duyệt"
                                      ? "status-pending"
                                      : "status-new"
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td style={{ textAlign: "left", verticalAlign: "middle" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  {(item.purchaseorderdetail || []).map((goods: any, gIdx: number) => (
                                    <div key={goods.id} style={{ fontSize: "12px", borderBottom: gIdx < (item.purchaseorderdetail.length - 1) ? "1px dashed #cbd5e1" : "none", paddingBottom: "2px", color: "#334155" }}>
                                      {gIdx + 1}. {goods.productName} - Mã: {goods.productCode} - ĐVT: {goods.unit || "—"} - SL: {Number(goods.requestedQuantity).toLocaleString("en-US")}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE VIEW */}
          <div className="mobile-only" style={{ flexDirection: "column", gap: "6px", marginTop: "4px" }}>
            {currentItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 12px", color: "#64748b", background: "#ffffff", borderRadius: "14px", border: "1px solid #ffedd5", fontSize: "11px", fontWeight: 400 }}>
                {activeTab === "pending" ? "Hiện không có dữ liệu cần phê duyệt" : "Hiện chưa có dữ liệu đã phê duyệt"}
              </div>
            ) : (
              currentItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    border: activeTab === "processed" ? "1px solid #d1fae5" : "1px solid #ffedd5",
                    boxShadow: activeTab === "processed" ? "0 2px 8px rgba(5, 150, 105, 0.04)" : "0 2px 8px rgba(234, 88, 12, 0.04)",
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", width: "100%", marginBottom: "2px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{
                        fontSize: "9.5px",
                        fontWeight: 600,
                        background: activeTab === "processed" ? "#059669" : "#ea580c",
                        color: "#ffffff",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.2px",
                        whiteSpace: "nowrap"
                      }}>
                        LỆNH MUA
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
                        {item.poCode}
                      </span>
                    </div>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 400,
                      color: activeTab === "processed" ? "#059669" : "#d97706",
                      background: activeTab === "processed" ? "#ecfdf5" : "#fffbeb",
                      padding: "3px 10px",
                      borderRadius: "12px",
                      border: activeTab === "processed" ? "1px solid #a7f3d0" : "1px solid #fde68a"
                    }}>
                      {item.status}
                    </span>
                  </div>

                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                    {item.creator} <span style={{ fontSize: "11px", fontWeight: 400, color: "#64748b" }}>({item.branch})</span>
                  </div>

                  <div style={{ fontSize: "11px", color: "#475569" }}>
                    Ngày đề nghị: {new Date(item.requestedDate).toLocaleDateString("vi-VN")}
                  </div>

                  {item.purpose && (
                    <div style={{ fontSize: "11px", color: "#475569" }}>
                      Mục đích: {item.purpose}
                    </div>
                  )}

                  <div style={{ marginTop: "4px", background: "#f8fafc", padding: "6px 8px", borderRadius: "8px" }}>
                    {(item.purchaseorderdetail || []).map((goods: any, gIdx: number) => (
                      <div key={goods.id || gIdx} style={{ fontSize: "11px", color: "#334155", borderBottom: gIdx < (item.purchaseorderdetail.length - 1) ? "1px dashed #cbd5e1" : "none", paddingBottom: "2px", paddingTop: "2px" }}>
                        {gIdx + 1}. {goods.productName} - Mã: {goods.productCode} - SL: <strong>{Number(goods.requestedQuantity).toLocaleString("en-US")} {goods.unit || ""}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", paddingTop: "6px", borderTop: "1px solid #f1f5f9" }}>
                    <button
                      type="button"
                      className="sapo-btn btn-outline"
                      onClick={() => openViewModal(item)}
                      style={{ flex: 1, height: "30px", fontSize: "11px" }}
                    >
                      Xem chi tiết
                    </button>
                    {activeTab === "pending" && item.status === "Chờ phê duyệt" && (
                      <>
                        <button
                          type="button"
                          className="sapo-btn sapo-btn-success"
                          onClick={() => handleApprove(item.id, item.poCode)}
                          style={{ flex: 1, height: "30px", fontSize: "11px" }}
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          className="sapo-btn sapo-btn-danger"
                          onClick={() => handleReject(item.id, item.poCode)}
                          style={{ flex: 1, height: "30px", fontSize: "11px" }}
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* History Modal */}
        {historyRecordId && (
          <HistoryModal 
            tableName="PurchaseOrder" 
            recordId={historyRecordId} 
            onClose={() => setHistoryRecordId(null)} 
          />
        )}

        {/* View Detail Modal */}
        {showModal && selectedPO && (
          <div className="custom-modal-overlay">
            <div
              className="custom-modal-content-responsive"
              style={{
                width: "95%",
                maxWidth: "950px",
                maxHeight: "90%",
                margin: "auto",
                display: "flex",
                flexDirection: "column",
                padding: 0,
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #cbd5e1",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                overflow: "hidden"
              }}
            >
              {/* Header */}
              <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 24px", margin: 0, background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", fontSize: "16px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>🔍 Xem chi tiết đơn mua hàng:</span>
                <span style={{ color: "#ff5c00" }}>{selectedPO.poCode}</span>
              </h3>

              {/* Scrollable Body */}
              <div className="scrollable-body" style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
                {/* I. General Info */}
                <h4 style={{ margin: "0 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>I. Thông tin chung</h4>
                <div
                  className="responsive-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    rowGap: "10px",
                    columnGap: "1.25rem",
                    marginBottom: "1.5rem"
                  }}
                >
                  <div>
                    <label className="filter-label">Mã lệnh</label>
                    <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedPO.poCode} readOnly />
                  </div>
                  <div>
                    <label className="filter-label">Người tạo</label>
                    <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedPO.creator} readOnly />
                  </div>
                  <div>
                    <label className="filter-label">Chi nhánh</label>
                    <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedPO.branch} readOnly />
                  </div>
                  <div>
                    <label className="filter-label">Ngày đề nghị</label>
                    <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={new Date(selectedPO.requestedDate).toLocaleDateString("vi-VN")} readOnly />
                  </div>
                  <div>
                    <label className="filter-label">Mục đích</label>
                    <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedPO.purpose} readOnly />
                  </div>
                  <div>
                    <label className="filter-label">Kiểu thanh toán</label>
                    <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedPO.paymentType || "Phê duyệt trước, thanh toán sau"} readOnly />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label className="filter-label">Ghi chú</label>
                    <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedPO.note || ""} readOnly />
                  </div>
                </div>

                {/* II. Items details */}
                <h4 style={{ margin: "20px 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>II. Chi tiết hàng hóa</h4>
                <div className="responsive-table-wrapper" style={{ overflowX: "auto", overflowY: "hidden", border: "1px solid #e2e8f0", borderRadius: "8px", width: "100%" }}>
                  <table className="table tab3-goods-table" style={{ fontSize: "13px", width: "100%", minWidth: "900px", tableLayout: "fixed" }}>
                    <thead style={{ background: "#f8fafc" }}>
                      <tr>
                        <th style={{ width: "250px", padding: "5px 6px", textAlign: "center" }}>Tên hàng hóa</th>
                        <th style={{ width: "150px", padding: "5px 6px", textAlign: "center" }}>Mã hàng hóa</th>
                        <th style={{ width: "95px", padding: "5px 6px", textAlign: "center" }}>ĐVT</th>
                        <th style={{ width: "90px", padding: "5px 6px", textAlign: "center" }}>Số lượng</th>
                        <th style={{ width: "110px", padding: "5px 6px", textAlign: "center" }}>Đơn giá</th>
                        <th style={{ width: "120px", padding: "5px 6px", textAlign: "center" }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.map((d, index) => (
                        <tr key={index}>
                          <td style={{ padding: "5px 6px", color: "#000", fontWeight: 600 }}>
                            <div style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", width: "100%" }} title={d.productName}>
                              {d.productName}
                            </div>
                          </td>
                          <td style={{ padding: "5px 6px", textAlign: "center" }}>{d.productCode}</td>
                          <td style={{ padding: "5px 6px", textAlign: "center" }}>{d.unit || "—"}</td>
                          <td style={{ padding: "5px 6px", textAlign: "center" }}>{Number(d.requestedQuantity).toLocaleString("en-US")}</td>
                          <td style={{ padding: "5px 6px", textAlign: "right" }}>{Number(d.price).toLocaleString("en-US")}</td>
                          <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>{Number(d.amount).toLocaleString("en-US")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="sapo-btn sapo-btn-secondary" onClick={handleClose}>
                  Đóng
                </button>
                {activeTab === "pending" && selectedPO.status === "Chờ phê duyệt" && (
                  <>
                    <button 
                      className="sapo-btn sapo-btn-success" 
                      onClick={() => { handleApprove(selectedPO.id, selectedPO.poCode); handleClose(); }}
                    >
                      Phê duyệt
                    </button>
                    <button 
                      className="sapo-btn sapo-btn-danger" 
                      onClick={() => { handleReject(selectedPO.id, selectedPO.poCode); handleClose(); }}
                    >
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modals */}
        {confirmAction && (
          <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
            <div className="modal-content-base" style={{ maxWidth: "450px", width: "90%", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", textAlign: "center" }}>
              <div style={{ 
                width: "60px", 
                height: "60px", 
                borderRadius: "50%", 
                background: confirmAction.type === "APPROVE" ? "#ecfdf5" : "#fef2f2", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                margin: "0 auto 1.25rem",
                color: confirmAction.type === "APPROVE" ? "#10b981" : "#ef4444"
              }}>
                {confirmAction.type === "APPROVE" ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
              </div>
              
              <h3 style={{ fontSize: "18px", fontWeight: "700", margin: "0 auto 0.75rem", color: "#1e293b" }}>
                {confirmAction.type === "APPROVE" ? "Phê duyệt đơn mua hàng" : "Từ chối đơn mua hàng"}
              </h3>

              <div style={{ color: "#475569", lineHeight: "1.6", margin: "0 auto 1.75rem" }}>
                {confirmAction.type === "APPROVE" ? (
                  <>
                    <p style={{ margin: 0 }}>Bạn có chắc đồng ý phê duyệt đơn mua hàng <strong>{confirmAction.info}</strong>?</p>
                    <p style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "600", background: "#ecfdf5", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                      Đơn hàng sẽ chuyển sang trạng thái "Chờ thanh toán" hoặc "Chờ giao hàng".
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0 }}>Bạn có chắc muốn từ chối đơn mua hàng <strong>{confirmAction.info}</strong>?</p>
                    <p style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "600", background: "#fef2f2", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                      Đơn hàng sẽ chuyển ngược lại trạng thái "Tạo mới" (Đơn nháp).
                    </p>
                  </>
                )}
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button 
                  type="button"
                  className="sapo-btn sapo-btn-secondary" 
                  style={{
                    flex: 1,
                    padding: "10px 20px",
                    backgroundColor: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    justifyContent: "center",
                    height: "40px"
                  }} 
                  onClick={() => setConfirmAction(null)}
                >
                  Hủy bỏ
                </button>
                <button 
                  type="button"
                  className="sapo-btn" 
                  style={{
                    flex: 1,
                    padding: "10px 20px",
                    backgroundColor: confirmAction.type === "APPROVE" ? "#16a34a" : "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    justifyContent: "center",
                    height: "40px"
                  }} 
                  onClick={executeAction}
                  disabled={isPending}
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
