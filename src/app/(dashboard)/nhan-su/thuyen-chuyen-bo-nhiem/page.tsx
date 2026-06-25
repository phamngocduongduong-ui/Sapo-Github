"use client";

import React, { useState, useEffect, useTransition } from "react";
import { RotateCcw, Filter, AlertTriangle, Clock } from "lucide-react";
import { getTransferPromotions, createTransferPromotion, updateTransferStatus, getActiveDepartments, getActivePositions } from "./actions";
import { getEmployees } from "../tang-giam-luong/actions";

export default function TransferPromotionPage() {
  const [items, setItems] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmUpdate, setConfirmUpdate] = useState<{ id: string, status: string, info: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const selectedItem = items.find(item => item.id === selectedItemId) || null;

  // Filters state
  const [filters, setFilters] = useState({
    branch: "Tất cả",
    department: "Tất cả",
    position: "Tất cả"
  });

  const uniqueBranches = ["Tất cả", ...Array.from(new Set(items.map(i => i.branch).filter(Boolean)))];
  const uniqueDepartments = ["Tất cả", ...Array.from(new Set(items.map(i => i.newDepartment).filter(Boolean)))];
  const uniquePositions = ["Tất cả", ...Array.from(new Set(items.map(i => i.newPosition).filter(Boolean)))];

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtering logic
  const filteredItems = items.filter(item => {
    const matchBranch = filters.branch === "Tất cả" || item.branch === filters.branch;
    const matchDept = filters.department === "Tất cả" || item.newDepartment === filters.department;
    const matchPos = filters.position === "Tất cả" || item.newPosition === filters.position;
    return matchBranch && matchDept && matchPos;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [data, empData, permRes, deptData, posData] = await Promise.all([
      getTransferPromotions(),
      getEmployees(),
      fetch('/api/user-permissions').then(r => r.json()).catch(() => ({})),
      getActiveDepartments(),
      getActivePositions()
    ]);
    setItems(data);
    setEmployees(empData);
    setIsAdmin(permRes.isAdmin || false);
    setDepartments(deptData);
    setPositions(posData);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createTransferPromotion(formData);
      setIsModalOpen(false);
      fetchData();
    });
  }

  function handleStatusUpdate(id: string, status: string, info?: string) {
    setConfirmUpdate({ id, status, info: info || "" });
  }

  async function executeStatusUpdate() {
    if (!confirmUpdate) return;
    const { id, status } = confirmUpdate;
    setConfirmUpdate(null);
    startTransition(async () => {
      await updateTransferStatus(id, status);
      setSelectedItemId(null);
      setExpandedId(null);
      fetchData();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <style dangerouslySetInnerHTML={{__html: `
        .breadcrumb-banner {
          background: #003466 !important;
          color: white !important;
          padding: 6px 15px !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          margin-top: 0px !important;
          margin-bottom: 10px !important;
          font-family: "Segoe UI", sans-serif !important;
        }
        .sapo-btn {
          background: #003466 !important;
          color: white !important;
          border: none !important;
          padding: 6px 12px !important;
          font-size: 13px !important;
          font-weight: 700 !important;
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
        .base-filters {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          padding: 10px !important;
          margin-top: 10px !important;
        }
        .form-control {
          padding: 6px 10px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          outline: none !important;
          background: white !important;
          font-family: "Segoe UI", sans-serif !important;
          font-size: 13px !important;
          font-weight: 600 !important;
        }
        .filter-label {
          display: block;
          margin-bottom: 0.4rem;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }
        .drawer-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
      `}} />

      <div className="breadcrumb-banner">
        DANH SÁCH THUYÊN CHUYỂN, BỔ NHIỆM
      </div>

      <div style={{ padding: "0px" }}>
        <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center" }}>
          <button
            type="button"
            className="sapo-btn"
            onClick={() => {
              setIsModalOpen(true);
            }}
          >
            Thêm đề xuất
          </button>

          {selectedItem && (
            <>
              {selectedItem.status === "Tạo mới" && (
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => handleStatusUpdate(selectedItem.id, "Chờ phê duyệt", `của NV ${selectedItem.employeeName}`)}
                >
                  Gửi duyệt
                </button>
              )}
              {selectedItem.status === "Tạo mới" && (
                <button
                  type="button"
                  className="sapo-btn"
                  style={{ backgroundColor: "#ef4444" }}
                  onClick={() => handleStatusUpdate(selectedItem.id, "Đã hủy", `của NV ${selectedItem.employeeName}`)}
                >
                  Hủy đề xuất
                </button>
              )}
              {selectedItem.status === "Chờ phê duyệt" && (
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => handleStatusUpdate(selectedItem.id, "Tạo mới", `của NV ${selectedItem.employeeName}`)}
                >
                  Thu hồi
                </button>
              )}
              {selectedItem.status === "Chờ phê duyệt" && isAdmin && (
                <>
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusUpdate(selectedItem.id, "Đã phê duyệt", `của NV ${selectedItem.employeeName}`)}
                  >
                    Duyệt đề xuất
                  </button>
                  <button
                    type="button"
                    className="sapo-btn"
                    style={{ backgroundColor: "#ef4444" }}
                    onClick={() => handleStatusUpdate(selectedItem.id, "Từ chối", `của NV ${selectedItem.employeeName}`)}
                  >
                    Từ chối
                  </button>
                </>
              )}
            </>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              type="button"
              className="sapo-btn"
              onClick={() => fetchData()}
            >
              Làm mới
            </button>
            <button
              type="button"
              className="sapo-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              Lọc
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="base-filters">
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <select
                className="form-control"
                style={{ maxWidth: "200px" }}
                value={filters.branch}
                onChange={(e) => setFilters({...filters, branch: e.target.value})}
              >
                {uniqueBranches.map(b => <option key={b} value={b}>{b === "Tất cả" ? "Tất cả chi nhánh" : b}</option>)}
              </select>
              <select
                className="form-control"
                style={{ maxWidth: "200px" }}
                value={filters.department}
                onChange={(e) => setFilters({...filters, department: e.target.value})}
              >
                {uniqueDepartments.map(d => <option key={d} value={d}>{d === "Tất cả" ? "Tất cả bộ phận" : d}</option>)}
              </select>
              <select
                className="form-control"
                style={{ maxWidth: "200px" }}
                value={filters.position}
                onChange={(e) => setFilters({...filters, position: e.target.value})}
              >
                {uniquePositions.map(p => <option key={p} value={p}>{p === "Tất cả" ? "Tất cả chức vụ" : p}</option>)}
              </select>
              <button
                type="button"
                className="sapo-btn"
                onClick={() => {
                  setFilters({
                    branch: "Tất cả",
                    department: "Tất cả",
                    position: "Tất cả"
                  });
                }}
                style={{ padding: "6px 12px" }}
              >
                Đặt lại
              </button>
            </div>
          </div>
        )}

        <div className="base-table-wrapper">
          <table className="base-table">
            <thead>
              <tr>
                <th className="th-first nowrap" style={{ width: "50px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>STT</th>
                <th className="nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Nhân viên</th>
                <th className="nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Chi nhánh</th>
                <th className="nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Vị trí cũ</th>
                <th className="nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Vị trí mới</th>
                <th className="nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Ngày hiệu lực</th>
                <th className="th-last nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#888" }}>
                    Chưa có dữ liệu
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, idx) => {
                  const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  const isSelected = selectedItemId === item.id;
                  const isExpanded = expandedId === item.id;

                  let statusColor = "#f59e0b"; // "Tạo mới"
                  if (item.status === "Chờ phê duyệt") statusColor = "#2563eb";
                  if (item.status === "Đã phê duyệt") statusColor = "#10b981";
                  if (item.status === "Đã hủy" || item.status === "Từ chối") statusColor = "#ef4444";

                  return (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={`row-hoverable ${isSelected ? "row-selected" : ""}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          const nextId = selectedItemId === item.id ? null : item.id;
                          setSelectedItemId(nextId);
                          setExpandedId(nextId);
                        }}
                      >
                        <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{globalIdx}</td>
                        <td style={{ fontWeight: 700, color: "#000" }}>{item.employeeName}</td>
                        <td style={{ color: "#000", fontWeight: 600 }}>{item.branch || "—"}</td>
                        <td style={{ color: "#000", fontWeight: 600 }}>{item.currentPosition} ({item.currentDepartment})</td>
                        <td style={{ color: "var(--primary-color)", fontWeight: 700 }}>{item.newPosition} ({item.newDepartment})</td>
                        <td style={{ color: "#000", fontWeight: 600 }}>{new Date(item.effectiveDate).toLocaleDateString("vi-VN")}</td>
                        <td className="nowrap" style={{ textAlign: "center" }}>
                          <span style={{ color: statusColor, fontWeight: 700 }}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} style={{ padding: "0", background: "#f8fafc" }}>
                            <div style={{ 
                              padding: "0.75rem", 
                              position: "sticky",
                              left: 0,
                              width: "min-content",
                              minWidth: "100%",
                              maxWidth: "calc(100vw - 280px)",
                              borderBottom: "2px solid var(--primary-color)",
                              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
                            }}>
                              <div style={{ 
                                display: "flex", 
                                flexWrap: "wrap", 
                                gap: "0.75rem",
                                maxWidth: "850px"
                              }}>
                                {/* Details Card */}
                                <div style={{ 
                                  background: "white", 
                                  padding: "0.75rem", 
                                  borderRadius: "8px", 
                                  border: "1px solid #e2e8f0",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                                  flex: "1 1 400px",
                                  minWidth: "280px"
                                }}>
                                  <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--primary-color)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem" }}>
                                    🔄 Chi tiết thuyên chuyển, bổ nhiệm
                                  </h4>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem 1rem" }}>
                                    {[
                                      { label: "Nhân viên", value: item.employeeName, bold: true },
                                      { label: "Chi nhánh", value: item.branch || "—" },
                                      { label: "Bộ phận cũ", value: item.currentDepartment || "—" },
                                      { label: "Chức vụ cũ", value: item.currentPosition || "—" },
                                      { label: "Bộ phận mới", value: item.newDepartment || "—", bold: true },
                                      { label: "Chức vụ mới", value: item.newPosition || "—", bold: true },
                                      { label: "Bậc lương mới", value: item.newSalaryLevel || "—" },
                                      { label: "Ngày hiệu lực", value: new Date(item.effectiveDate).toLocaleDateString("vi-VN") },
                                      { label: "Người lập đề xuất", value: item.creator || "—" }
                                    ].map((field, i) => (
                                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", borderBottom: "1px solid #f8fafc", paddingBottom: "1px" }}>
                                        <span style={{ color: "#64748b" }}>{field.label}:</span>
                                        <span style={{ fontWeight: field.bold ? 700 : 600, color: field.bold ? "var(--primary-color)" : "inherit" }}>{field.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Note section */}
                                <div style={{ 
                                  background: "white", 
                                  padding: "0.6rem 0.75rem", 
                                  borderRadius: "8px", 
                                  border: "1px solid #e2e8f0",
                                  flex: "1 1 300px",
                                  minWidth: "260px"
                                }}>
                                  <span style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600 }}>📝 Ghi chú:</span>
                                  <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.75rem", color: "#475569", lineHeight: "1.2" }}>
                                    {item.note || "Không có ghi chú bổ sung."}
                                  </p>
                                </div>
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

        {/* Modern Pagination */}
        {totalPages > 1 && (
          <div className="base-pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", fontFamily: "Segoe UI, sans-serif" }}>
            <div className="pagination-info" style={{ fontSize: "13px", color: "#64748b" }}>
              Hiển thị <strong>{paginatedItems.length}</strong> / {filteredItems.length} đề xuất
            </div>
            <div className="pagination-controls" style={{ display: "flex", gap: "0.25rem" }}>
              <button
                className="sapo-btn btn-outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                style={{ padding: "2px 8px", height: "28px", fontSize: "12px" }}
              >
                Trước
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  className={`sapo-btn ${currentPage === i + 1 ? '' : 'btn-outline'}`}
                  onClick={() => setCurrentPage(i + 1)}
                  style={{ padding: "2px 8px", height: "28px", fontSize: "12px" }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="sapo-btn btn-outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                style={{ padding: "2px 8px", height: "28px", fontSize: "12px" }}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="drawer-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="drawer-header">
              <div className="header-titles">
                <h3>➕ THÊM ĐỀ XUẤT MỚI</h3>
                <div className="header-sub">Thuyên chuyển, bổ nhiệm nhân viên</div>
              </div>
              <button type="button" className="drawer-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div className="drawer-body">
                <div className="form-group-base">
                  <label className="filter-label">Nhân viên</label>
                  <select name="employeeName" className="input" required style={{ fontSize: "13px" }}>
                    <option value="">-- Chọn nhân viên --</option>
                    {employees.map(e => <option key={e.id} value={e.fullName}>{e.fullName} ({e.branch})</option>)}
                  </select>
                </div>
                
                <div className="drawer-form-row">
                  <div className="form-group-base">
                    <label className="filter-label">Bộ phận mới</label>
                    <select name="newDepartment" className="input" required style={{ fontSize: "13px" }}>
                      <option value="">-- Chọn bộ phận mới --</option>
                      {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group-base">
                    <label className="filter-label">Chức vụ mới</label>
                    <select name="newPosition" className="input" required style={{ fontSize: "13px" }}>
                      <option value="">-- Chọn chức vụ mới --</option>
                      {positions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="drawer-form-row">
                  <div className="form-group-base">
                    <label className="filter-label">Bậc lương mới</label>
                    <input type="text" name="newSalaryLevel" className="input" style={{ fontSize: "13px" }} />
                  </div>
                  <div className="form-group-base">
                    <label className="filter-label">Ngày hiệu lực</label>
                    <input type="date" name="effectiveDate" className="input" required style={{ fontSize: "13px" }} />
                  </div>
                </div>
                
                <div className="form-group-base">
                  <label className="filter-label">Ghi chú</label>
                  <textarea name="note" className="input" style={{ height: "100px", fontSize: "13px" }}></textarea>
                </div>
                
                <input type="hidden" name="creator" value="Admin" />
              </div>
              
              <div className="drawer-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" className="sapo-btn btn-outline" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="sapo-btn" disabled={isPending}>{isPending ? "Đang lưu..." : "Lưu đề xuất"}</button>
              </div>
            </form>
          </div>
        </div>
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
              margin: "0 auto 1.25rem",
              color: "#f97316"
            }}>
              <Clock size={32} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: "0 auto 0.75rem", color: "#1e293b", textAlign: "center", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? "Gửi phê duyệt" : 
               confirmUpdate.status === "Tạo mới" ? "Thu hồi hồ sơ" : 
               confirmUpdate.status === "Đã phê duyệt" ? "Phê duyệt hồ sơ" : 
               "Xác nhận thay đổi"}
            </h3>
            <div style={{ color: "#475569", margin: "0 auto 1.75rem", lineHeight: "1.6", textAlign: "center", padding: "0 0.5rem", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc muốn gửi hồ sơ để chờ phê duyệt không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                    <AlertTriangle size={16} /> Hồ sơ sẽ không được chỉnh sửa trong thời gian chờ phê duyệt.
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
                  <p style={{ fontSize: "0.875rem", color: "#10b981", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#f0fdf4", padding: "8px", borderRadius: "6px" }}>
                    ✅ Hồ sơ sẽ có giá trị kể từ thời điểm phê duyệt.
                  </p>
                </>
              ) : (
                <p>Bạn có chắc chắn muốn chuyển trạng thái hồ sơ này sang <strong>"{confirmUpdate.status}"</strong> không?</p>
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
                onClick={() => setConfirmUpdate(null)}
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                className="sapo-btn" 
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  backgroundColor: confirmUpdate.status === "Từ chối" || confirmUpdate.status === "Đã hủy" ? "#ef4444" : "#003466",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  justifyContent: "center",
                  height: "40px"
                }} 
                onClick={executeStatusUpdate}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
