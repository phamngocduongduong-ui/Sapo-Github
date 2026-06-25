"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { 
  CheckCircle, X, RefreshCw, Eye, FileText, Calendar, 
  Plus, Search, Trash2, Check, DollarSign
} from "lucide-react";
import { 
  getReceiptVouchers, createReceiptVoucher, updateVoucherStatus, 
  deleteReceiptVoucher, generateNextVoucherNumber, getCurrentUser
} from "./actions";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";

export default function ReceiptVouchersPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; username: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Form states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);
  const [nextVoucherNum, setNextVoucherNum] = useState("");

  // Form inputs
  const [payer, setPayer] = useState("");
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");

  // Sync real-time
  useRealTimeSync("receipt-vouchers", vouchers, setVouchers, 3000, isCreateOpen || selectedVoucher !== null);

  // Load initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [vData, uData] = await Promise.all([
        getReceiptVouchers(),
        getCurrentUser()
      ]);
      setVouchers(vData);
      setCurrentUser(uData);
      if (uData) {
        setReceiver(uData.name);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    startTransition(async () => {
      await fetchData();
    });
  };

  // Generate sequence number when opening create form
  const handleOpenCreate = async () => {
    try {
      const num = await generateNextVoucherNumber();
      setNextVoucherNum(num);
      setPayer("");
      setReceiver(currentUser?.name || "");
      setAmount(0);
      setNote("");
      setIsCreateOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveVoucher = async () => {
    if (!payer.trim()) {
      alert("Vui lòng điền Đối tượng nộp.");
      return;
    }
    if (!receiver.trim()) {
      alert("Vui lòng điền Người thu.");
      return;
    }
    if (amount <= 0) {
      alert("Số tiền phải lớn hơn 0.");
      return;
    }

    try {
      setLoading(true);
      const res = await createReceiptVoucher({
        receiver,
        payer,
        amount,
        note
      });

      if (res.success) {
        alert("Tạo phiếu thu thành công.");
        setIsCreateOpen(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  // Status transitions
  const handleStatusChange = async (id: string, nextStatus: string) => {
    const labels: Record<string, string> = {
      "Chờ duyệt": "gửi duyệt",
      "Đã duyệt": "phê duyệt",
      "Từ chối": "từ chối",
      "Đã hủy": "hủy"
    };
    if (!confirm(`Bạn có chắc chắn muốn ${labels[nextStatus] || nextStatus} phiếu thu này?`)) return;

    try {
      setLoading(true);
      const res = await updateVoucherStatus(id, nextStatus);
      if (res.success) {
        alert("Cập nhật trạng thái thành công.");
        if (selectedVoucher && selectedVoucher.id === id) {
          setSelectedVoucher(null);
        }
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVoucher = async (id: string, num: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa phiếu thu ${num}?`)) return;
    try {
      setLoading(true);
      const res = await deleteReceiptVoucher(id);
      if (res.success) {
        alert("Xóa phiếu thu thành công.");
        fetchData();
      }
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  // Filter vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const matchSearch = !searchQuery || 
        v.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.receiver.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.payer.toLowerCase().includes(searchQuery.toLowerCase());

      const slipDate = new Date(v.date || v.createdAt);
      slipDate.setHours(0, 0, 0, 0);

      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);

      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(0, 0, 0, 0);

      const matchStart = !start || slipDate >= start;
      const matchEnd = !end || slipDate <= end;

      return matchSearch && matchStart && matchEnd;
    });
  }, [vouchers, searchQuery, startDate, endDate]);

  const isUserApprover = useMemo(() => {
    return currentUser?.role === "Admin" || currentUser?.role?.includes("Trưởng phòng") || currentUser?.username === "admin";
  }, [currentUser]);

  return (
    <div className="maintenance-page-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .maintenance-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px;
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
        .maintenance-page-container .breadcrumb-banner {
          font-size: 13px !important;
        }
        .breadcrumb-banner {
          background-color: #003466;
          color: white;
          padding: 6px 15px;
          font-weight: 700;
          display: block;
          border-radius: 0 !important;
          margin-top: 0;
          margin-left: -10px;
          margin-right: -10px;
        }
        .panel-full {
          flex: 1 1 100%;
          width: 100%;
          min-width: 0;
        }
        .blue-panel {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
        }
        .blue-panel-header {
          background-color: #003466;
          color: #ffffff;
          padding: 6px 15px;
          font-weight: 700;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #ff5c00;
        }
        .blue-panel-body {
          padding: 10px;
        }
        .sapo-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background-color: #003466;
          color: white;
          padding: 6px 15px;
          border-radius: 4px;
          font-weight: 400;
          font-size: 13px !important;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          border: none;
        }
        .sapo-btn:hover {
          background-color: #002244;
        }
        .sapo-btn:active {
          transform: scale(0.98);
        }
        .sapo-btn-secondary {
          background-color: #475569;
        }
        .sapo-btn-secondary:hover {
          background-color: #334155;
        }
        .sapo-btn-success {
          background-color: #22c55e;
        }
        .sapo-btn-success:hover {
          background-color: #16a34a;
        }
        .sapo-btn-danger {
          background-color: #ef4444;
        }
        .sapo-btn-danger:hover {
          background-color: #dc2626;
        }
        .sapo-btn-sm {
          padding: 4px 8px !important;
          font-size: 12px !important;
          border-radius: 4px !important;
          font-weight: 400 !important;
        }
        .sapo-btn-sm svg {
          width: 14px !important;
          height: 14px !important;
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
          height: auto !important;
          min-height: unset !important;
          overflow-y: hidden !important;
          overflow-x: auto !important;
          padding-bottom: 0px !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          table-layout: auto !important;
          border-collapse: collapse !important;
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
          border-bottom: 1px solid #cbd5e1 !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
        .row-hoverable:hover {
          background-color: #f8fafc;
        }
        .base-filters {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          padding: 10px !important;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .filter-label {
          display: block;
          margin-bottom: 0.4rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #003466;
        }
        .input-base {
          height: 30px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 4px 10px;
          box-sizing: border-box;
          outline: none;
          background: #ffffff;
        }
        .input-base:focus {
          border-color: #ff5c00;
        }
        .badge {
          display: inline-block;
          padding: 0.25em 0.6em;
          font-size: 75% !important;
          font-weight: 700;
          line-height: 1;
          text-align: center;
          white-space: nowrap;
          vertical-align: baseline;
          border-radius: 0.25rem;
        }
        .badge-secondary {
          color: #475569;
          background-color: #e2e8f0;
          border: 1px solid #cbd5e1;
        }
        .badge-warning {
          color: #d97706;
          background-color: #fef3c7;
          border: 1px solid #fde68a;
        }
        .badge-success {
          color: #15803d;
          background-color: #dcfce7;
          border: 1px solid #bbf7d0;
        }
        .badge-danger {
          color: #b91c1c;
          background-color: #fee2e2;
          border: 1px solid #fecaca;
        }
      ` }} />

      {/* Header Banner */}
      <div className="breadcrumb-banner">
        PHÂN HỆ PHIẾU THU (RECEIPT VOUCHERS)
      </div>

      <div className="maintenance-layout">
        <div className="panel-full blue-panel">
          <div className="blue-panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>DANH SÁCH PHIẾU THU</span>
          </div>

          <div className="blue-panel-body">
            {/* Filter Panel */}
            <div className="base-filters">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                <Search size={14} style={{ color: "#94a3b8" }} />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm theo số phiếu, người thu, đối tượng nộp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-base"
                  style={{ width: "100%", maxWidth: "350px" }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "#003466" }}>Từ ngày:</span>
                <input type="date" className="input-base" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span style={{ fontWeight: 700, color: "#003466" }}>Đến ngày:</span>
                <input type="date" className="input-base" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Toolbar Buttons right above the data table */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px", justifyContent: "flex-start" }}>
              <button className="sapo-btn sapo-btn-sm btn-outline" onClick={handleRefresh} disabled={isPending}>
                <RefreshCw size={12} className={isPending ? "animate-spin" : ""} />
                <span>Cập nhật</span>
              </button>
              <button className="sapo-btn sapo-btn-sm sapo-btn-success" onClick={handleOpenCreate}>
                <Plus size={12} />
                <span>Lập phiếu thu mới</span>
              </button>
            </div>

            {/* Table */}
            <div className="base-table-wrapper">
              {loading ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Đang tải dữ liệu...</div>
              ) : (
                <table className="base-table">
                  <thead>
                    <tr>
                      <th style={{ width: "140px" }}>Số phiếu</th>
                      <th style={{ width: "120px" }}>Ngày tạo</th>
                      <th style={{ width: "180px" }}>Người thu</th>
                      <th>Đối tượng nộp</th>
                      <th style={{ width: "160px" }}>Số tiền (VNĐ)</th>
                      <th style={{ width: "140px" }}>Trạng thái</th>
                      <th>Ghi chú</th>
                      <th style={{ width: "150px" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", color: "#94a3b8", padding: "1.5rem" }}>Không tìm thấy phiếu thu nào.</td>
                      </tr>
                    ) : (
                      filteredVouchers.map(v => (
                        <tr key={v.id} className="row-hoverable">
                          <td style={{ fontWeight: 700, color: "#003466", textAlign: "center" }}>{v.voucherNumber}</td>
                          <td style={{ textAlign: "center" }}>{new Date(v.date || v.createdAt).toLocaleDateString("vi-VN")}</td>
                          <td>{v.receiver}</td>
                          <td style={{ fontWeight: 600 }}>{v.payer}</td>
                          <td style={{ fontWeight: 700, color: "#16a34a", textAlign: "right" }}>{v.amount.toLocaleString()}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`badge ${
                              v.status === "Tạo mới" ? "badge-secondary" :
                              v.status === "Chờ duyệt" ? "badge-warning" :
                              v.status === "Đã duyệt" ? "badge-success" : "badge-danger"
                            }`}>
                              {v.status}
                            </span>
                          </td>
                          <td style={{ color: "#64748b" }}>{v.note || "—"}</td>
                          <td style={{ textAlign: "center" }}>
                            <button className="action-icon-btn" title="Xem chi tiết" onClick={() => setSelectedVoucher(v)}>
                              <Eye size={13} />
                            </button>
                            {v.status === "Tạo mới" && (
                              <>
                                <button 
                                  className="action-icon-btn" 
                                  style={{ borderColor: "#bbf7d0", color: "#16a34a" }}
                                  title="Gửi duyệt"
                                  onClick={() => handleStatusChange(v.id, "Chờ duyệt")}
                                >
                                  <Check size={13} />
                                </button>
                                <button 
                                  className="action-icon-btn delete" 
                                  title="Xóa phiếu"
                                  onClick={() => handleDeleteVoucher(v.id, v.voucherNumber)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                            {v.status === "Chờ duyệt" && isUserApprover && (
                              <>
                                <button 
                                  className="action-icon-btn" 
                                  style={{ borderColor: "#bbf7d0", color: "#16a34a" }}
                                  title="Duyệt phiếu"
                                  onClick={() => handleStatusChange(v.id, "Đã duyệt")}
                                >
                                  <CheckCircle size={13} />
                                </button>
                                <button 
                                  className="action-icon-btn delete" 
                                  title="Từ chối"
                                  onClick={() => handleStatusChange(v.id, "Từ chối")}
                                >
                                  <X size={13} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="custom-modal-overlay">
          <div 
            className="custom-modal-content-responsive" 
            style={{
              width: "95%",
              maxWidth: "650px",
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
            <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "12px 24px", margin: 0, background: "#fff", fontSize: "16px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>LẬP PHIẾU THU MỚI:</span>
              <span style={{ color: "#ff5c00" }}>{nextVoucherNum}</span>
            </h3>

            <div className="scrollable-body" style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>I. Thông tin phiếu thu</h4>
              
              <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "12px", columnGap: "1.25rem", marginBottom: "1.5rem" }}>
                <div>
                  <label className="filter-label">Số phiếu</label>
                  <input type="text" className="input-base" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={nextVoucherNum} readOnly />
                </div>
                <div>
                  <label className="filter-label">Người thu *</label>
                  <input type="text" className="input-base" style={{ width: "100%" }} value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Tên người thu..." />
                </div>
                <div>
                  <label className="filter-label">Đối tượng nộp *</label>
                  <input type="text" className="input-base" style={{ width: "100%" }} value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="Tên người nộp..." />
                </div>
                <div>
                  <label className="filter-label">Số tiền thu * (VNĐ)</label>
                  <input 
                    type="number" 
                    className="input-base" 
                    style={{ width: "100%", fontWeight: 700, color: "#16a34a" }} 
                    value={amount} 
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} 
                    placeholder="Nhập số tiền..."
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <label className="filter-label">Ghi chú lý do thu</label>
                <textarea className="input-base" rows={3} style={{ width: "100%", height: "auto" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mô tả lý do thu tiền..." />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", padding: "12px 24px", background: "#f8fafc" }}>
              <button className="sapo-btn sapo-btn-secondary" onClick={() => setIsCreateOpen(false)}>Hủy</button>
              <button className="sapo-btn sapo-btn-success" onClick={handleSaveVoucher}>Lưu phiếu thu</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedVoucher && (
        <div className="custom-modal-overlay">
          <div 
            className="custom-modal-content-responsive" 
            style={{
              width: "90%",
              maxWidth: "650px",
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
            <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "12px 24px", margin: 0, background: "#fff", fontSize: "16px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>CHI TIẾT PHIẾU THU:</span>
              <span style={{ color: "#ff5c00" }}>{selectedVoucher.voucherNumber}</span>
            </h3>

            <div className="scrollable-body" style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>I. Thông tin phiếu thu</h4>
              <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "12px", columnGap: "1.25rem", marginBottom: "1.5rem" }}>
                <div>
                  <label className="filter-label">Số phiếu</label>
                  <input type="text" className="input-base" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedVoucher.voucherNumber} readOnly />
                </div>
                <div>
                  <label className="filter-label">Người thu</label>
                  <input type="text" className="input-base" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedVoucher.receiver} readOnly />
                </div>
                <div>
                  <label className="filter-label">Đối tượng nộp</label>
                  <input type="text" className="input-base" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedVoucher.payer} readOnly />
                </div>
                <div>
                  <label className="filter-label">Ngày lập</label>
                  <input type="text" className="input-base" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={new Date(selectedVoucher.date || selectedVoucher.createdAt).toLocaleString("vi-VN")} readOnly />
                </div>
                <div>
                  <label className="filter-label">Trạng thái</label>
                  <input type="text" className="input-base" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed", fontWeight: 700 }} value={selectedVoucher.status} readOnly />
                </div>
                <div>
                  <label className="filter-label">Số tiền thu (VNĐ)</label>
                  <input type="text" className="input-base" style={{ width: "100%", fontWeight: 700, color: "#16a34a", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedVoucher.amount.toLocaleString()} readOnly />
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label className="filter-label">Ghi chú lý do thu</label>
                <textarea className="input-base" rows={2} style={{ width: "100%", height: "auto", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedVoucher.note || "—"} readOnly />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", padding: "12px 24px", background: "#f8fafc" }}>
              <button className="sapo-btn sapo-btn-secondary" onClick={() => setSelectedVoucher(null)}>Đóng</button>
              {selectedVoucher.status === "Tạo mới" && (
                <>
                  <button className="sapo-btn btn-outline" style={{ borderColor: "#bbf7d0", color: "#16a34a" }} onClick={() => handleStatusChange(selectedVoucher.id, "Chờ duyệt")}>Gửi duyệt</button>
                  <button className="sapo-btn sapo-btn-danger" onClick={() => handleDeleteVoucher(selectedVoucher.id, selectedVoucher.voucherNumber)}>Xóa phiếu</button>
                </>
              )}
              {selectedVoucher.status === "Chờ duyệt" && isUserApprover && (
                <>
                  <button className="sapo-btn sapo-btn-danger" onClick={() => handleStatusChange(selectedVoucher.id, "Từ chối")}>Từ chối</button>
                  <button className="sapo-btn sapo-btn-success" onClick={() => handleStatusChange(selectedVoucher.id, "Đã duyệt")}>Duyệt phiếu</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
