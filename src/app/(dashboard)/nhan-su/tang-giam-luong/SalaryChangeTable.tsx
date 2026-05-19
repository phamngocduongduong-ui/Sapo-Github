"use client";
import React from "react";

import { Pencil, Trash2, Send, RotateCcw, Check, X, Filter, MoreHorizontal, History, CheckCircle, PowerOff, Mail, Clock } from "lucide-react";
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
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);
  const [confirmUpdate, setConfirmUpdate] = React.useState<{ id: string, status: string, info: string } | null>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

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

  function handleStatusChange(id: string, newStatus: string, info?: string) {
    setConfirmUpdate({ id, status: newStatus, info: info || "" });
  }

  function executeStatusChange() {
    if (!confirmUpdate) return;
    const { id, status: newStatus } = confirmUpdate;
    setConfirmUpdate(null);
    onStatusChange(id, newStatus);
  }

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
                <td style={{ textAlign: "right", position: "relative" }}>
                  <button 
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === item.id ? null : item.id);
                    }}
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {openMenuId === item.id && (
                    <div className="action-dropdown" onClick={(e) => e.stopPropagation()}>
                      {(item.status === "Tạo mới" || item.status === "Từ chối") && (
                        <div className="dropdown-item" onClick={() => { onEdit(item); setOpenMenuId(null); }}>
                          <Pencil size={14} /> Chỉnh sửa
                        </div>
                      )}
                      <div className="dropdown-item" onClick={() => { setHistoryRecordId(item.id); setOpenMenuId(null); }}>
                        <History size={14} /> Lịch sử
                      </div>
                      
                      {(item.status === "Tạo mới" || item.status === "Từ chối") && (
                        <div className="dropdown-item success" onClick={() => handleStatusChange(item.id, "Chờ phê duyệt", `của NV ${item.employeeName}`)}>
                          <Mail size={14} /> Gửi duyệt
                        </div>
                      )}

                      {item.status === "Chờ phê duyệt" && (
                        <div className="dropdown-item warning" onClick={() => handleStatusChange(item.id, "Tạo mới", `của NV ${item.employeeName}`)}>
                          <RotateCcw size={14} /> Thu hồi
                        </div>
                      )}

                      {item.status === "Chờ phê duyệt" && isAdmin && (
                        <>
                          <div className="dropdown-item success" onClick={() => handleStatusChange(item.id, "Đã phê duyệt", `của NV ${item.employeeName}`)}>
                            <CheckCircle size={14} /> Duyệt đơn
                          </div>
                          <div className="dropdown-item danger" onClick={() => handleStatusChange(item.id, "Từ chối", `của NV ${item.employeeName}`)}>
                            <PowerOff size={14} /> Từ chối
                          </div>
                        </>
                      )}
                    </div>
                  )}
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

      {/* Custom Confirmation Modal */}
      {confirmUpdate && (
        <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
          <div className="modal-content-base" style={{ maxWidth: "450px", textAlign: "center", padding: "2rem" }}>
            <div style={{ 
              width: "60px", 
              height: "60px", 
              borderRadius: "50%", 
              background: "#fff7ed", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto 1.5rem",
              color: "#f97316"
            }}>
              <Clock size={32} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#1e293b", textAlign: "center", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? "Gửi phê duyệt" : 
               confirmUpdate.status === "Tạo mới" ? "Thu hồi hồ sơ" : 
               confirmUpdate.status === "Đã phê duyệt" ? "Phê duyệt hồ sơ" : 
               "Xác nhận thay đổi"}
            </h3>
            <div style={{ color: "#475569", marginBottom: "2rem", lineHeight: "1.6", textAlign: "center", padding: "0 0.5rem", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc muốn gửi hồ sơ để chờ phê duyệt không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                    <PowerOff size={16} /> Hồ sơ sẽ không được chỉnh sửa trong thời gian chờ phê duyệt.
                  </p>
                </>
              ) : confirmUpdate.status === "Tạo mới" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc chắn muốn thu hồi hồ sơ không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                    <RotateCcw size={16} /> Hồ sơ sẽ không trong danh sách chờ phê duyệt.
                  </p>
                </>
              ) : confirmUpdate.status === "Đã phê duyệt" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc chắn đồng ý phê duyệt không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                    <CheckCircle size={16} /> Hồ sơ sẽ có giá trị kể từ thời điểm phê duyệt.
                  </p>
                </>
              ) : (
                <p>Bạn có chắc chắn muốn chuyển trạng thái hồ sơ này sang <strong>"{confirmUpdate.status}"</strong> không?</p>
              )}
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmUpdate(null)}>Hủy bỏ</button>
              <button className="btn btn-primary" style={{ flex: 1, background: confirmUpdate.status === "Từ chối" || confirmUpdate.status === "Hủy" ? "#ef4444" : "#2563eb" }} onClick={executeStatusChange}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
