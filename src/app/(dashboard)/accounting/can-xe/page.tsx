"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { 
  CheckCircle, X, RefreshCw, Eye, AlertTriangle, FileText, Calendar, 
  ChevronDown, Truck, Plus, Search, Trash2, Edit, Wifi, SlidersHorizontal
} from "lucide-react";
import { 
  getWeighingSlips, deleteWeighingSlip, seedMockWeighingSlips
} from "./actions";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";

export default function WeighingSlipsPage() {
  const [slips, setSlips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("2026-05-30");
  const [endDate, setEndDate] = useState("2026-05-31");

  // Sync with background
  useRealTimeSync("weighing-slips", slips, setSlips, 3000, false);

  // Load Slips
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        // Seed mock slips if database is empty to guarantee a great demo
        await seedMockWeighingSlips();
        const slipsData = await getWeighingSlips();
        setSlips(slipsData);
      } catch (err) {
        console.error("Failed to load slips:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Filtering slips
  const filteredSlips = useMemo(() => {
    return slips.filter(slip => {
      const matchSearch = !searchQuery || 
        slip.slipNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        slip.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        slip.driverName.toLowerCase().includes(searchQuery.toLowerCase());

      const slipDate = new Date(slip.createdAt);
      slipDate.setHours(0, 0, 0, 0);

      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);

      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(0, 0, 0, 0);

      const matchStart = !start || slipDate >= start;
      const matchEnd = !end || slipDate <= end;

      return matchSearch && matchStart && matchEnd;
    });
  }, [slips, searchQuery, startDate, endDate]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const paginatedSlips = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredSlips.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredSlips, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredSlips.length / itemsPerPage));

  // Open separate form page handlers
  const handleOpenCreate = () => {
    if (typeof window !== "undefined") {
      window.open("/accounting/phieu-can", "_blank");
    }
  };

  const handleOpenEdit = (slip: any) => {
    if (typeof window !== "undefined") {
      window.open(`/accounting/phieu-can?id=${slip.id}`, "_blank");
    }
  };

  const handleOpenView = (slip: any) => {
    if (typeof window !== "undefined") {
      window.open(`/accounting/phieu-can?id=${slip.id}&mode=view`, "_blank");
    }
  };

  // Delete slip record
  const handleDelete = (id: string, slipNumber: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa phiếu cân ${slipNumber}?`)) return;

    startTransition(async () => {
      try {
        await deleteWeighingSlip(id);
        const data = await getWeighingSlips();
        setSlips(data);
      } catch (err: any) {
        alert(err.message || "Lỗi xóa dữ liệu");
      }
    });
  };

  return (
    <div className="weighing-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .weighing-container {
          width: 100%;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
        }
        .weighing-container input,
        .weighing-container select,
        .weighing-container textarea,
        .weighing-container button,
        .weighing-container table,
        .weighing-container td,
        .weighing-container th,
        .weighing-container label {
          font-size: 13px !important;
        }
        .breadcrumb-banner {
          background-color: #003466;
          color: white;
          padding: 8px 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 0;
          margin-top: 0;
          margin-left: -10px;
          margin-right: -10px;
          margin-bottom: 12px;
          width: calc(100% + 20px);
          box-sizing: border-box;
        }
        .sapo-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background-color: #003466;
          color: white;
          padding: 6px 15px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          border: none;
          height: 32px;
        }
        .sapo-btn:hover {
          background-color: #002244;
        }
        .sapo-btn-outline {
          background-color: white;
          color: #003466;
          border: 1px solid #cbd5e1;
        }
        .sapo-btn-outline:hover {
          background-color: #f8fafc;
          border-color: #94a3b8;
        }
        .sapo-btn-success {
          background-color: #22c55e;
        }
        .sapo-btn-success:hover {
          background-color: #16a34a;
        }
        .online-badge {
          background-color: #22c55e;
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .filter-panel {
          background-color: white;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 15px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          box-shadow: 0 1px 3px 0 rgba(0,0,0,0.05);
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .form-control {
          height: 32px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 4px 10px;
          box-sizing: border-box;
          outline: none;
          min-width: 140px;
        }
        .form-control:focus {
          border-color: #003466;
        }
        .main-table-card {
          background-color: white;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .weighing-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .weighing-table th {
          background-color: #f1f5f9;
          color: #003466;
          font-weight: 700;
          padding: 8px 12px;
          border-bottom: 2px solid #ff5c00;
          text-transform: uppercase;
        }
        .weighing-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }
        .weighing-table tr:hover {
          background-color: #f8fafc;
        }
        .status-badge {
          padding: 3px 8px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 11px !important;
          display: inline-block;
        }
        .status-active-1 {
          background-color: #fef3c7;
          color: #d97706;
          border: 1px solid #fde68a;
        }
        .status-active-2 {
          background-color: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }
        .action-icon-btn {
          width: 26px;
          height: 26px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          background: white;
          color: #64748b;
          cursor: pointer;
          margin-right: 4px;
          transition: all 0.15s;
        }
        .action-icon-btn:hover {
          border-color: #94a3b8;
          color: #003466;
          background-color: #f8fafc;
        }
        .action-icon-btn.delete:hover {
          border-color: #fecaca;
          color: #ef4444;
          background-color: #fef2f2;
        }
        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 15px;
          background-color: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }
        .pagination-btn {
          padding: 4px 12px;
          border: 1px solid #cbd5e1;
          background-color: white;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          color: #334155;
        }
        .pagination-btn:hover:not(:disabled) {
          background-color: #f1f5f9;
        }
        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      ` }} />

      {/* Header Banner */}
      <div className="breadcrumb-banner">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Truck size={18} />
          <span>PHÂN HỆ CÂN XE TRẠM CÂN 80 TẤN</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div className="online-badge">
            <Wifi size={14} />
            <span>Chế độ online</span>
          </div>
          <button 
            className="sapo-btn sapo-btn-outline" 
            onClick={() => startTransition(async () => {
              const data = await getWeighingSlips();
              setSlips(data);
            })}
            style={{ background: "#fff", height: "30px" }}
          >
            <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
            <span>Cập nhật</span>
          </button>
          <button className="sapo-btn sapo-btn-success" onClick={handleOpenCreate} style={{ height: "30px" }}>
            <Plus size={14} />
            <span>Tạo mới phiếu cân</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="filter-panel">
        <div className="filter-group">
          <Search size={14} style={{ color: "#94a3b8" }} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Nhập số phiếu cân, biển số..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "240px" }}
          />
        </div>
        <div className="filter-group">
          <SlidersHorizontal size={14} style={{ color: "#94a3b8" }} />
          <input 
            type="date" 
            className="form-control" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ color: "#cbd5e1" }}>—</span>
          <input 
            type="date" 
            className="form-control" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Main List Table */}
      <div className="main-table-card">
        <table className="weighing-table">
          <thead>
            <tr>
              <th style={{ width: "50px", textAlign: "center" }}>STT</th>
              <th style={{ width: "130px" }}>Số phiếu cân</th>
              <th style={{ width: "120px" }}>Nhà máy</th>
              <th style={{ width: "100px", textAlign: "center" }}>Loại phiếu</th>
              <th>Khách hàng/NCC</th>
              <th>Sản phẩm</th>
              <th style={{ width: "110px", textAlign: "center" }}>Số xe</th>
              <th style={{ width: "100px", textAlign: "center" }}>Ngày tạo</th>
              <th style={{ width: "95px", textAlign: "right" }}>Cân lần 1</th>
              <th style={{ width: "95px", textAlign: "right" }}>Cân lần 2</th>
              <th style={{ width: "105px", textAlign: "right" }}>TL phiếu cân</th>
              <th style={{ width: "120px", textAlign: "center" }}>Trạng thái</th>
              <th style={{ width: "110px", textAlign: "center" }}>Chức năng</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                  Đang tải dữ liệu phiếu cân...
                </td>
              </tr>
            ) : paginatedSlips.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                  Không tìm thấy phiếu cân nào thỏa mãn bộ lọc
                </td>
              </tr>
            ) : (
              paginatedSlips.map((slip, idx) => {
                const seq = (currentPage - 1) * itemsPerPage + idx + 1;
                return (
                  <tr 
                    key={slip.id} 
                    onDoubleClick={() => handleOpenEdit(slip)}
                    style={{ cursor: "pointer" }}
                    title="Kích đúp chuột để chỉnh sửa"
                  >
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{seq}</td>
                    <td style={{ fontWeight: 700, color: "#0072bc" }}>{slip.slipNumber}</td>
                    <td style={{ fontWeight: 600 }}>{slip.branch}</td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ 
                        color: slip.type === "Nhập hàng" ? "#2563eb" : "#ef4444", 
                        fontWeight: 700 
                      }}>
                        {slip.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{slip.customerSupplier}</td>
                    <td>{slip.productGroup}</td>
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{slip.licensePlate}</td>
                    <td style={{ textAlign: "center" }}>
                      {new Date(slip.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {slip.weight1.toFixed(3)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                      {slip.weight2.toFixed(3)}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: slip.netWeight > 0 ? "#16a34a" : "#64748b" }}>
                      {slip.netWeight > 0 ? slip.netWeight.toFixed(3) : "N/A"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`status-badge ${
                        slip.status === "Đã cân lần 2" ? "status-active-2" : "status-active-1"
                      }`}>
                        {slip.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button 
                        className="action-icon-btn" 
                        title="Xem chi tiết"
                        onClick={(e) => { e.stopPropagation(); handleOpenView(slip); }}
                      >
                        <Eye size={13} />
                      </button>
                      <button 
                        className="action-icon-btn" 
                        title="Chỉnh sửa"
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(slip); }}
                      >
                        <Edit size={13} />
                      </button>
                      <button 
                        className="action-icon-btn delete" 
                        title="Xóa phiếu"
                        onClick={(e) => { e.stopPropagation(); handleDelete(slip.id, slip.slipNumber); }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination footer */}
        <div className="pagination-container">
          <div style={{ color: "#64748b", fontWeight: 500 }}>
            Hiển thị {filteredSlips.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
            {Math.min(currentPage * itemsPerPage, filteredSlips.length)} của {filteredSlips.length} bản ghi
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ color: "#64748b", fontSize: "12px" }}>
              Trang {currentPage} / {totalPages} ({itemsPerPage} mục/trang)
            </span>
            <button 
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              &lt;&lt; Trước
            </button>
            <button 
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{ background: "#22c55e", color: "white", borderColor: "#22c55e" }}
            >
              Sau &gt;&gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
