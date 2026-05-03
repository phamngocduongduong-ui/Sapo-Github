"use client";
import React from "react";

import { Pencil, Trash2, Send, RotateCcw, Check, X, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import HistoryModal from "../../HistoryModal";

interface SalaryChangeTableProps {
  items: any[];
  onStatusChange: (id: string, newStatus: string) => void;
  onEdit: (item: any) => void;
  onAdd: () => void;
  filters: any;
  setFilters: (filters: any) => void;
  types: string[];
  employees: string[];
  statuses: string[];
  availableYears: string[];
  currentYear: string;
  isAdmin?: boolean;
}

export default function SalaryChangeTable({ 
  items, onStatusChange, onEdit, onAdd,
  filters, setFilters, types, employees, statuses, availableYears, currentYear,
  isAdmin
}: SalaryChangeTableProps) {
  const router = useRouter();
  const [showFilters, setShowFilters] = React.useState(false);
  const [historyRecordId, setHistoryRecordId] = React.useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Pagination logic
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Danh sách Tăng/Giảm lương</h3>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-outline" onClick={() => router.refresh()}>
            <RotateCcw size={18} style={{ marginRight: "6px" }} /> Làm mới
          </button>
          <button className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} style={{ marginRight: "6px" }} /> {showFilters ? "Ẩn lọc" : "Lọc"}
          </button>
          <button className="btn btn-primary" onClick={onAdd}>+ Thêm đề nghị</button>
        </div>
      </div>

      {/* Filter Bar integrated below the header */}
      {showFilters && (
        <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1.25rem", alignItems: "end", flexWrap: "wrap", background: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
        <div className="form-group" style={{ minWidth: "180px", marginBottom: 0 }}>
          <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem", display: "block" }}>Loại đề nghị</label>
          <select className="form-control" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} style={{ borderRadius: "8px", height: "38px" }}>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: "200px", marginBottom: 0 }}>
          <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem", display: "block" }}>Nhân viên</label>
          <select className="form-control" value={filters.employeeName} onChange={(e) => setFilters({ ...filters, employeeName: e.target.value })} style={{ borderRadius: "8px", height: "38px" }}>
            {employees.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: "150px", marginBottom: 0 }}>
          <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem", display: "block" }}>Trạng thái</label>
          <select className="form-control" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={{ borderRadius: "8px", height: "38px" }}>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: "120px", marginBottom: 0 }}>
          <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem", display: "block" }}>Năm áp dụng</label>
          <select className="form-control" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} style={{ borderRadius: "8px", height: "38px" }}>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button 
          className="btn btn-outline btn-icon" 
          style={{ height: "38px", width: "38px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", background: "#fff" }} 
          title="Reset bộ lọc"
          onClick={() => setFilters({
            type: "Tất cả",
            employeeName: "Tất cả",
            status: "Tất cả",
            year: currentYear
          })}
        >
          <RotateCcw size={18} />
        </button>
      </div>
      )}

      <div className="table-container" style={{ overflowX: "auto" }}>

      <table className="table">
        <thead>
          <tr>
            <th>Ngày đề nghị</th>
            <th>Loại đề nghị</th>
            <th>Nhân viên</th>
            <th>Bậc hiện tại</th>
            <th>Bậc đề nghị</th>
            <th>Kỳ áp dụng</th>
            <th>Lý do</th>
            <th>Trạng thái</th>
            <th>Người tạo</th>
            <th style={{ width: "200px", textAlign: "center" }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {paginatedItems.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Chưa có đề nghị nào</td>
            </tr>
          ) : (
            paginatedItems.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.requestDate).toLocaleDateString("vi-VN")}</td>
                <td>
                  <span className={`badge ${item.type === "Tăng lương" ? "badge-success" : "badge-warning"}`}>
                    {item.type}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{item.employeeName}</td>
                <td>{item.currentSalaryLevel || "—"}</td>
                <td style={{ fontWeight: 600, color: "var(--primary-color)" }}>{item.proposedSalaryLevel}</td>
                <td style={{ fontWeight: 500 }}>{item.effectiveMonth}/{item.effectiveYear}</td>
                <td style={{ fontSize: "0.9rem", color: "#64748b" }}>{item.reason || "—"}</td>
                <td>
                  <span className={`badge status-${item.status.toLowerCase().replace(/\s+/g, "-")}`}>
                    {item.status}
                  </span>
                </td>
                <td style={{ fontSize: "0.85rem" }}>{item.creator}</td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                    {(item.status === "Tạo mới" || item.status === "Từ chối") && (
                      <>
                        <button className="btn btn-sm btn-outline" onClick={() => onEdit(item)} style={{ gap: "4px" }} title="Chỉnh sửa">
                          <Pencil size={14} /> Sửa
                        </button>
                        <button className="btn btn-sm btn-primary" onClick={() => onStatusChange(item.id, "Chờ phê duyệt")} style={{ gap: "4px" }} title="Gửi phê duyệt">
                          <Send size={14} /> Gửi
                        </button>
                      </>
                    )}
                    {item.status === "Chờ phê duyệt" && (
                      <button className="btn btn-sm btn-warning" onClick={() => onStatusChange(item.id, "Tạo mới")} style={{ gap: "4px" }} title="Thu hồi">
                        <RotateCcw size={14} /> Thu hồi
                      </button>
                    )}
                    {item.status === "Chờ phê duyệt" && isAdmin && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => onStatusChange(item.id, "Đã phê duyệt")} style={{ gap: "4px" }} title="Duyệt">
                          <Check size={14} /> Duyệt
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => onStatusChange(item.id, "Từ chối")} style={{ gap: "4px" }} title="Từ chối">
                          <X size={14} /> Từ chối
                        </button>
                      </>
                    )}
                    {item.status === "Đã phê duyệt" && (
                      <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                        <Check size={14} /> Hoàn tất
                      </span>
                    )}
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => setHistoryRecordId(item.id)}
                      title="Lịch sử thay đổi"
                    >
                      Lịch sử
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
          <button 
            className="btn btn-sm btn-outline" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Trước
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button 
              key={i} 
              className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button 
            className="btn btn-sm btn-outline" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Sau
          </button>
        </div>
      )}

      {historyRecordId && (
        <HistoryModal 
          tableName="SalaryChange" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      <style jsx>{`
        .status-tạo-mới { background-color: #f1f5f9; color: #64748b; }
        .status-chờ-phê-duyệt { background-color: #fef3c7; color: #92400e; }
        .status-đã-phê-duyệt { background-color: #d1fae5; color: #065f46; }
        .status-từ-chối { background-color: #fee2e2; color: #b91c1c; }
        .status-hủy { background-color: #4b5563; color: #f3f4f6; }
      `}</style>
    </div>
    </>
  );
}
