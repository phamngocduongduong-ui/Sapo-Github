"use client";

import { Pencil, Trash2, Send, RotateCcw, Check, X } from "lucide-react";

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
}

export default function SalaryChangeTable({ 
  items, onStatusChange, onEdit, onAdd,
  filters, setFilters, types, employees, statuses, availableYears, currentYear
}: SalaryChangeTableProps) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Danh sách Tăng/Giảm lương</h3>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-primary" onClick={onAdd}>+ Thêm đề nghị</button>
        </div>
      </div>

      {/* Filter Bar integrated below the header */}
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

      <div className="table-container" style={{ overflowX: "auto" }}>

      <table className="table">
        <thead>
          <tr>
            <th style={{ width: "50px", textAlign: "center" }}>STT</th>
            <th>Ngày đề nghị</th>
            <th>Loại đề nghị</th>
            <th>Nhân viên</th>
            <th>Bậc hiện tại</th>
            <th>Bậc đề nghị</th>
            <th>Kỳ áp dụng</th>
            <th>Lý do</th>
            <th>Trạng thái</th>
            <th>Người tạo</th>
            <th style={{ width: "120px", textAlign: "center" }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={11} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Chưa có đề nghị nào</td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
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
                    {item.status === "Đã phê duyệt" && (
                      <span style={{ fontSize: "0.8rem", color: "#10b981", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                        <Check size={14} /> Hoàn tất
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

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
