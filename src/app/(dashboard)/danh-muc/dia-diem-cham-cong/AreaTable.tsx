"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Search, Info, MapPin, Target, X, Check, Eye } from "lucide-react";
import { upsertCheckInArea, deleteCheckInArea } from "./actions";

type Area = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  status: string;
};

export default function AreaTable({ initialData }: { initialData: any[] }) {
  const [areas, setAreas] = useState<any[]>(initialData);
  const [showModal, setShowModal] = useState(false);
  const [currentArea, setCurrentArea] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selection state
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const selectedArea = areas.find(a => a.id === selectedAreaId) || null;

  useEffect(() => {
    fetch("/api/user-permissions")
      .then(res => res.json())
      .then(data => setIsAdmin(data.isAdmin || false))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setAreas(initialData);
  }, [initialData]);

  const filteredAreas = areas.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.address || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredAreas.length / itemsPerPage);
  const paginatedAreas = filteredAreas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  function handleClose() {
    setShowModal(false);
    setCurrentArea(null);
    setIsViewOnly(false);
    setError(null);
  }

  function handleEdit(area: any) {
    setCurrentArea({ ...area });
    setIsViewOnly(false);
    setShowModal(true);
  }

  function handleAddNew() {
    setCurrentArea({
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      radius: 100,
      status: "ACTIVE"
    });
    setIsViewOnly(false);
    setError(null);
    setShowModal(true);
  }

  function handleView(area: any) {
    setCurrentArea({ ...area });
    setIsViewOnly(true);
    setError(null);
    setShowModal(true);
  }

  const handleDelete = async (area: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa địa điểm "${area.name}"?`)) return;
    startTransition(async () => {
      try {
        const res = await deleteCheckInArea(area.id);
        if (res && !res.success) {
          alert(res.error || "Có lỗi xảy ra khi xóa.");
        } else {
          setSelectedAreaId(null);
          window.location.reload();
        }
      } catch (err: any) {
        alert(err.message || "Có lỗi xảy ra khi xóa.");
      }
    });
  };

  const toggleStatus = async (area: any) => {
    const newStatus = area.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      try {
        await upsertCheckInArea({
          ...area,
          status: newStatus
        });
        window.location.reload();
      } catch (err: any) {
        alert(err.message || "Có lỗi xảy ra khi cập nhật trạng thái.");
      }
    });
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isViewOnly) return;
    setError(null);
    startTransition(async () => {
      try {
        await upsertCheckInArea(currentArea);
        handleClose();
        window.location.reload();
      } catch (err: any) {
        setError(err.message || "Có lỗi xảy ra.");
      }
    });
  }

  return (
    <div className="employee-page-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        .employee-page-container {
          width: 100%;
          min-width: 0;
        }
        .employee-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px 10px 0px;
        }
        .employee-layout input,
        .employee-layout select,
        .employee-layout textarea,
        .employee-layout button,
        .employee-layout table,
        .employee-layout td,
        .employee-layout th,
        .employee-layout label,
        .employee-layout .badge,
        .employee-page-container .breadcrumb-banner {
          font-size: 13px !important;
        }
        .breadcrumb-banner {
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
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
        .search-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 5px 0px 10px 0px;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .sapo-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
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
        .row-hoverable:hover {
          background-color: #f8fafc;
        }
        .row-selected {
          background-color: #eff6ff !important;
        }
        .inactive-row {
          background-color: #fff5f5 !important;
        }
        .inactive-row td {
          border-top: 1px solid #fca5a5 !important;
          border-bottom: 1px solid #fca5a5 !important;
        }
        .base-table-wrapper {
          height: auto !important;
          min-height: unset !important;
          overflow-y: hidden !important;
          padding-bottom: 0px !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          table-layout: auto !important;
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
          padding: 2px 0.75rem !important;
          vertical-align: middle !important;
          color: #000 !important;
          font-weight: 600 !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
        .nowrap, .base-table .nowrap {
          white-space: nowrap !important;
        }
        .search-box-base {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
        }
        .search-box-base input {
          width: 220px !important;
          padding: 6px 10px 6px 30px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          outline: none !important;
          font-weight: 500 !important;
        }
        .search-box-base .search-icon {
          position: absolute !important;
          left: 10px !important;
          color: #94a3b8 !important;
        }
        .form-group-base label {
          display: block !important;
          margin-bottom: 0.25rem !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          color: #003466 !important;
          text-transform: uppercase !important;
        }
        .custom-modal-content .input-base,
        .custom-modal-content select.input-base {
          color: #000000 !important;
          font-weight: 600 !important;
        }
        .custom-modal-content input[type="text"] {
          text-transform: uppercase !important;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @media (max-width: 768px) {
          .base-table-wrapper {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding-bottom: 0px !important;
          }
          .base-table {
            display: block !important;
            width: 100% !important;
          }
          .base-table thead {
            display: none !important;
          }
          .base-table tbody {
            display: block !important;
            width: 100% !important;
          }
          .base-table tbody tr {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
            padding: 8px 12px !important;
            margin-bottom: 8px !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02) !important;
            box-sizing: border-box !important;
          }
          .base-table td {
            display: flex !important;
            align-items: center !important;
            width: 100% !important;
            padding: 4px 0 !important;
            border-bottom: 1px dashed #f1f5f9 !important;
            box-sizing: border-box !important;
            height: auto !important;
            text-align: left !important;
          }
          .base-table td:last-child {
            border-bottom: none !important;
          }
          .base-table td::before {
            content: attr(data-label);
            font-weight: 700 !important;
            color: #003466 !important;
            width: 120px !important;
            min-width: 120px !important;
            font-size: 12px !important;
            text-transform: uppercase !important;
            text-align: left !important;
          }
          .base-table td > div {
            max-width: none !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
        }
      `
      }} />

      <div className="breadcrumb-banner">
        DANH MỤC ĐỊA ĐIỂM CHẤM CÔNG
      </div>

      <div className="employee-layout">
        <div className="panel-full">
          <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center" }}>
            <button
              type="button"
              className="sapo-btn"
              onClick={handleAddNew}
            >
              Thêm mới
            </button>

            {selectedArea && (
              <>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => handleView(selectedArea)}
                >
                  Xem chi tiết
                </button>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => handleEdit(selectedArea)}
                >
                  Sửa
                </button>
                {selectedArea.status === "ACTIVE" ? (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => toggleStatus(selectedArea)}
                  >
                    Ngưng kích hoạt
                  </button>
                ) : (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => toggleStatus(selectedArea)}
                  >
                    Kích hoạt
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    className="sapo-btn sapo-btn-danger"
                    onClick={() => handleDelete(selectedArea)}
                  >
                    Xóa
                  </button>
                )}
              </>
            )}

            <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <div className="search-box-base">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Tìm kiếm địa điểm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="base-table-wrapper" style={paginatedAreas.length === 0 ? { height: "auto" } : undefined}>
            <table className="base-table" style={{ tableLayout: "fixed", width: "100%" }}>
              <thead>
                <tr>
                  <th className="th-first nowrap" style={{ width: "50px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>STT</th>
                  <th className="nowrap" style={{ width: "250px", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Tên địa điểm</th>
                  <th className="nowrap" style={{ color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Địa chỉ</th>
                  <th className="nowrap" style={{ width: "250px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Tọa độ (Lat, Lng)</th>
                  <th className="nowrap" style={{ width: "150px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Bán kính (m)</th>
                  <th className="th-last nowrap" style={{ width: "150px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAreas.map((area, index) => (
                  <tr
                    key={area.id}
                    onClick={() => setSelectedAreaId(selectedAreaId === area.id ? null : area.id)}
                    className={`row-hoverable ${selectedAreaId === area.id ? "row-selected" : ""} ${area.status !== "ACTIVE" ? "inactive-row" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <td data-label="STT" className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td data-label="Tên địa điểm" style={{ fontWeight: 600, color: "#000" }}>
                      <div 
                        title={area.name}
                        style={{ 
                          maxWidth: "230px", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          whiteSpace: "nowrap" 
                        }}
                      >
                        {area.name}
                      </div>
                    </td>
                    <td data-label="Địa chỉ">
                      <div 
                        title={area.address || ""}
                        style={{ 
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          whiteSpace: "nowrap",
                          color: "#64748b"
                        }}
                      >
                        {area.address || "—"}
                      </div>
                    </td>
                    <td data-label="Tọa độ" style={{ textAlign: "center" }}>
                      <span className="code-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', border: '1px solid #0284c7', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        <MapPin size={12} /> {area.latitude.toFixed(6)}, {area.longitude.toFixed(6)}
                      </span>
                    </td>
                    <td data-label="Bán kính" style={{ textAlign: "center" }}>
                      <span className="code-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', border: '1px solid #d97706', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        <Target size={12} /> {area.radius}m
                      </span>
                    </td>
                    <td data-label="Trạng thái" className="nowrap" style={{ textAlign: "center" }}>
                      <span style={{
                        color: area.status === "ACTIVE" ? "#10b981" : "#ef4444",
                        fontWeight: 600
                      }}>
                        {area.status === "ACTIVE" ? "Đang hoạt động" : "Tạm dừng"}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredAreas.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                        <Info size={40} strokeWidth={1.5} />
                        <span>Không tìm thấy địa điểm chấm công nào khớp với tìm kiếm</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="base-pagination">
              <div className="pagination-info">
                Hiển thị <strong>{paginatedAreas.length}</strong> / {filteredAreas.length} địa điểm
              </div>
              <div className="pagination-controls">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`page-btn ${currentPage === i + 1 ? "active" : ""}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && currentArea && (
        <div className="custom-modal-overlay" style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1100,
          backdropFilter: "blur(3px)"
        }}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()} style={{
            background: "#ffffff",
            width: "95%",
            maxWidth: "500px",
            borderRadius: "12px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            animation: "modalFadeIn 0.25s ease-out"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                  {isViewOnly ? "👁️ Xem chi tiết địa điểm" : (currentArea.id ? "✏️ Hiệu chỉnh địa điểm" : "📍 Thêm địa điểm mới")}
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                  Danh mục địa điểm chấm công • {currentArea.id ? "Hiệu chỉnh" : "Mới"}
                </p>
              </div>
              <button onClick={handleClose} style={{
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#94a3b8",
                lineHeight: 1,
                padding: 0
              }}>&times;</button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: "20px",
              maxHeight: "75vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "15px"
            }}>
              {error && <div style={{
                background: "#fef2f2",
                border: "1px solid #fca5a5",
                color: "#b91c1c",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                marginBottom: "10px"
              }}>
                ⚠️ {error}
              </div>}

              <form id="area-form" onSubmit={handleSubmit} style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px"
              }}>
                <div className="form-section" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h4 className="section-title" style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#003466", textTransform: "uppercase" }}>Thông tin cơ bản</h4>
                  <div className="form-group-base full-width">
                    <label>Tên địa điểm <span className="required" style={{ color: "#ef4444" }}>*</span></label>
                    <input
                      type="text"
                      className="input-base"
                      placeholder="VD: Văn phòng chính, Nhà máy A..."
                      value={currentArea.name}
                      onChange={e => setCurrentArea({ ...currentArea, name: e.target.value })}
                      required
                      readOnly={isViewOnly}
                    />
                  </div>
                  <div className="form-group-base full-width">
                    <label>Địa chỉ</label>
                    <input
                      type="text"
                      className="input-base"
                      placeholder="Nhập địa chỉ cụ thể..."
                      value={currentArea.address || ""}
                      onChange={e => setCurrentArea({ ...currentArea, address: e.target.value })}
                      readOnly={isViewOnly}
                    />
                  </div>
                </div>

                <div className="form-section" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h4 className="section-title" style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#003466", textTransform: "uppercase" }}>Vị trí địa lý & Bán kính</h4>
                  {!isViewOnly && (
                    <div className="form-group-base full-width" style={{ marginBottom: "5px" }}>
                      <button
                        type="button"
                        className="sapo-btn"
                        style={{ width: "100%", justifyContent: "center" }}
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition((pos) => {
                              setCurrentArea({
                                ...currentArea,
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude
                              });
                            }, (err) => alert("Không thể lấy vị trí: " + err.message));
                          }
                        }}
                      >
                        <MapPin size={16} /> Lấy vị trí hiện tại của tôi (GPS)
                      </button>
                    </div>
                  )}

                  <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div className="form-group-base">
                      <label>Vĩ độ (Latitude) <span className="required" style={{ color: "#ef4444" }}>*</span></label>
                      <input
                        type="number"
                        step="any"
                        className="input-base"
                        placeholder="VD: 10.123456"
                        value={currentArea.latitude}
                        onChange={e => setCurrentArea({ ...currentArea, latitude: e.target.value })}
                        required
                        readOnly={isViewOnly}
                      />
                    </div>
                    <div className="form-group-base">
                      <label>Kinh độ (Longitude) <span className="required" style={{ color: "#ef4444" }}>*</span></label>
                      <input
                        type="number"
                        step="any"
                        className="input-base"
                        placeholder="VD: 105.123456"
                        value={currentArea.longitude}
                        onChange={e => setCurrentArea({ ...currentArea, longitude: e.target.value })}
                        required
                        readOnly={isViewOnly}
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div className="form-group-base" style={!currentArea.id ? { gridColumn: "span 2" } : undefined}>
                      <label>Bán kính (m) <span className="required" style={{ color: "#ef4444" }}>*</span></label>
                      <input
                        type="number"
                        className="input-base"
                        placeholder="VD: 100"
                        value={currentArea.radius}
                        onChange={e => setCurrentArea({ ...currentArea, radius: e.target.value })}
                        required
                        readOnly={isViewOnly}
                        min="1"
                      />
                    </div>
                    {currentArea.id && (
                      <div className="form-group-base">
                        <label>Trạng thái</label>
                        <select
                          className="input-base"
                          value={currentArea.status}
                          onChange={e => setCurrentArea({ ...currentArea, status: e.target.value })}
                          disabled={isViewOnly}
                        >
                          <option value="ACTIVE">Đang hoạt động</option>
                          <option value="INACTIVE">Tạm dừng</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "12px 20px",
              borderTop: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px"
            }}>
              {isViewOnly ? (
                <button type="button" className="sapo-btn sapo-btn-secondary" onClick={handleClose}>Đóng</button>
              ) : (
                <>
                  <button type="button" className="sapo-btn sapo-btn-secondary" onClick={handleClose}>Hủy bỏ</button>
                  <button type="submit" form="area-form" className="sapo-btn" disabled={isPending}>
                    {isPending ? "Đang xử lý..." : (currentArea.id ? "Cập nhật" : "Lưu lại")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
