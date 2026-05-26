"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getProducts, createProduct, updateProduct, updateProductStatus, deleteProduct, getCategories, getUnits, getWarehouses } from "./actions";
import HistoryModal from "../../HistoryModal";
import { Search, Plus } from "lucide-react";

export default function ProductPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  
  // History state
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  // Row selection state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = items.find(item => item.id === selectedItemId) || null;

  useEffect(() => {
    fetchData();
    loadFormOptions();
    fetch("/api/user-permissions")
      .then(res => res.json())
      .then(data => setIsAdmin(data.isAdmin || false))
      .catch(() => {});
  }, []);

  async function fetchData() {
    const data = await getProducts();
    setItems(data);
  }

  async function loadFormOptions() {
    const [catData, unitData, whData] = await Promise.all([getCategories(), getUnits(), getWarehouses()]);
    setCategories(catData);
    setUnits(unitData);
    setWarehouses(whData);
  }

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    (item.englishName && item.englishName.toLowerCase().includes(search.toLowerCase())) ||
    item.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isViewOnly) return;
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        if (editingItem) {
          await updateProduct(editingItem.id, formData);
        } else {
          await createProduct(formData);
        }
        setIsModalOpen(false);
        setSelectedItemId(null);
        fetchData();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleStatusUpdate = (id: string, status: string) => {
    startTransition(async () => {
      await updateProductStatus(id, status);
      setSelectedItemId(null);
      fetchData();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;
    startTransition(async () => {
      try {
        await deleteProduct(id);
        setSelectedItemId(null);
        fetchData();
      } catch (err: any) {
        alert(err.message || "Đã xảy ra lỗi khi xóa sản phẩm!");
      }
    });
  };

  const openAddModal = () => {
    setEditingItem(null);
    setIsViewOnly(false);
    setSelectedItemId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setIsViewOnly(false);
    setIsModalOpen(true);
  };

  const openViewModal = (item: any) => {
    setEditingItem(item);
    setIsViewOnly(true);
    setIsModalOpen(true);
  };

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
        .row-hoverable:hover {
          background-color: #f8fafc;
        }
        .row-selected {
          background-color: #eff6ff !important;
        }
        .row-selected td {
          border-top: 1px solid #cbd5e1 !important;
          border-bottom: 1px solid #cbd5e1 !important;
        }
        .base-table-wrapper {
          height: auto !important;
          min-height: unset !important;
          overflow-y: hidden !important;
          padding-bottom: 0px !important;
          overflow-x: auto !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          min-width: 1220px !important;
          table-layout: fixed !important;
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
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .base-table td {
          padding: 2px 0.75rem !important;
          vertical-align: middle !important;
          color: #000 !important;
          font-weight: 600 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .base-table tbody tr {
          height: 45px !important;
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
        /* Optimize Drawer Form spacing */
        .drawer-header {
          padding: 0.65rem 1.25rem !important;
        }
        .drawer-body {
          padding: 0.75rem 1.25rem !important;
          gap: 0.65rem !important;
        }
        .drawer-form {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.65rem !important;
        }
        .form-section {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.4rem !important;
        }
        .form-row {
          display: flex !important;
          gap: 0.5rem !important;
          width: 100% !important;
        }
        .form-group-base {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.05rem !important;
          flex: 1 !important;
        }
        .form-group-base label {
          margin-bottom: 0.1rem !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #475569 !important;
        }
        .input-base, select.input-base {
          padding: 0.35rem 0.65rem !important;
          font-size: 13px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          width: 100% !important;
          background-color: #fff !important;
          color: #1e293b !important;
          outline: none !important;
        }
        .input-base:focus, select.input-base:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1) !important;
        }
        .section-title {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #1e293b !important;
          border-bottom: 1px solid #e2e8f0 !important;
          padding-bottom: 2px !important;
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.02em !important;
        }
        .drawer-footer {
          padding: 0.75rem 1.25rem !important;
          border-top: 1px solid #f1f5f9 !important;
          display: flex !important;
          justify-content: flex-end !important;
          gap: 0.75rem !important;
          background: #fdfdfd !important;
        }
        .drawer-content {
          max-width: 500px !important;
        }
        .required {
          color: #ef4444 !important;
          margin-left: 2px !important;
        }
      `
      }} />

      <div className="breadcrumb-banner">
        DANH SÁCH SẢN PHẨM
      </div>

      <div className="employee-layout">
        <div className="panel-full">
          <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center" }}>
            <button
              type="button"
              className="sapo-btn"
              onClick={openAddModal}
            >
              Thêm mới
            </button>

            {selectedItem && (
              <>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => openViewModal(selectedItem)}
                >
                  Xem chi tiết
                </button>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => openEditModal(selectedItem)}
                >
                  Sửa
                </button>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => handleStatusUpdate(selectedItem.id, selectedItem.status === "Hoạt động" ? "Ngưng hoạt động" : "Hoạt động")}
                >
                  {selectedItem.status === "Hoạt động" ? "Ngưng kích hoạt" : "Kích hoạt"}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="sapo-btn"
                    style={{ backgroundColor: "#ef4444" }}
                    onClick={() => handleDelete(selectedItem.id)}
                  >
                    Xóa
                  </button>
                )}
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => setHistoryRecordId(selectedItem.id)}
                >
                  Lịch sử
                </button>
              </>
            )}

            <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <div className="search-box-base">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã, tên sản phẩm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="sapo-btn" onClick={fetchData}>Làm mới</button>
            </div>
          </div>

          {/* Main Table */}
          <div className="base-table-wrapper" style={filteredItems.length === 0 ? { height: "auto" } : undefined}>
            <table className="base-table">
              <thead>
                <tr>
                  <th className="th-first" style={{ width: "50px", textAlign: "center" }}>STT</th>
                  <th style={{ width: "100px" }}>Mã SP</th>
                  <th style={{ width: "200px" }}>Tên sản phẩm</th>
                  <th style={{ width: "220px" }}>Tên tiếng Anh</th>
                  <th style={{ width: "150px" }}>Quy cách</th>
                  <th style={{ width: "150px" }}>Nhóm sản phẩm</th>
                  <th style={{ width: "150px" }}>Kho mặc định</th>
                  <th style={{ width: "100px" }}>Đơn vị tính</th>
                  <th className="th-last" style={{ width: "100px", textAlign: "center" }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr style={{ height: "45px" }}>
                    <td colSpan={9} style={{ textAlign: "center", color: "#64748b", verticalAlign: "middle", height: "45px" }}>
                      Chưa có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <tr 
                      key={item.id}
                      onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
                      className={`row-hoverable ${selectedItemId === item.id ? "row-selected" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ textAlign: "center", color: "#64748b" }}>{index + 1}</td>
                      <td className="cell-truncate" style={{ fontWeight: 600 }} title={item.code}>
                        <span className="code-pill">{item.code}</span>
                      </td>
                      <td className="cell-truncate" style={{ fontWeight: 500 }} title={item.name}>{item.name}</td>
                      <td className="cell-truncate" style={{ color: "#64748b" }} title={item.englishName || "—"}>{item.englishName || "—"}</td>
                      <td className="cell-truncate" style={{ color: "#475569" }} title={item.packaging || "—"}>{item.packaging || "—"}</td>
                      <td className="cell-truncate" title={item.productcategory?.name || "—"}>{item.productcategory?.name || "—"}</td>
                      <td className="cell-truncate" title={item.warehouse?.name || "—"}>{item.warehouse?.name || "—"}</td>
                      <td title={item.unit?.map((u: any) => u.name).join(", ") || "—"}>
                        {item.unit?.map((u: any) => u.name).join(", ") || "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          color: item.status === "Hoạt động" ? "#10b981" : "#ef4444",
                          fontWeight: 600
                        }}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="drawer-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="drawer-content animate-drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="header-titles">
                <h3>{isViewOnly ? "👁️ Chi tiết sản phẩm" : (editingItem ? "✏️ Hiệu chỉnh sản phẩm" : "📦 Tiếp nhận sản phẩm")}</h3>
                <p className="header-sub">Danh mục Sản phẩm • {editingItem ? editingItem.code : "Mới"}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="drawer-close-btn">&times;</button>
            </div>

            <div className="drawer-body">
              <form id="product-form" onSubmit={handleSubmit} className="drawer-form">
                {/* Section: Thông tin chung */}
                <div className="form-section">
                  <h4 className="section-title">Thông tin chung</h4>
                  
                  <div className="form-row">
                    <div className="form-group-base">
                      <label>Mã sản phẩm <span className="required">*</span></label>
                      <input type="text" name="code" className="input-base" required disabled={isViewOnly} defaultValue={editingItem?.code || ""} placeholder="Ví dụ: SP001" />
                    </div>
                    <div className="form-group-base">
                      <label>Nhóm sản phẩm <span className="required">*</span></label>
                      <select name="categoryId" className="input-base" required disabled={isViewOnly} defaultValue={editingItem?.categoryId || ""}>
                        <option value="" disabled>-- Chọn nhóm --</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group-base" style={{ width: "100%" }}>
                    <label>Tên sản phẩm <span className="required">*</span></label>
                    <input type="text" name="name" className="input-base" required disabled={isViewOnly} defaultValue={editingItem?.name || ""} placeholder="Ví dụ: Áo thun nam" />
                  </div>

                  <div className="form-group-base" style={{ width: "100%" }}>
                    <label>Tên tiếng Anh</label>
                    <input type="text" name="englishName" className="input-base" disabled={isViewOnly} defaultValue={editingItem?.englishName || ""} placeholder="Ví dụ: Men's T-shirt" />
                  </div>

                  <div className="form-group-base" style={{ width: "100%" }}>
                    <label>Quy cách <span className="required">*</span></label>
                    <input type="text" name="packaging" className="input-base" required disabled={isViewOnly} defaultValue={editingItem?.packaging || ""} placeholder="Ví dụ: Chai 500ml, Thùng 24 lon..." />
                  </div>

                  <div className="form-group-base" style={{ width: "100%" }}>
                    <label>Kho mặc định <span className="required">*</span></label>
                    <select name="warehouseId" className="input-base" required disabled={isViewOnly} defaultValue={editingItem?.warehouseId || ""}>
                      <option value="" disabled>-- Chọn kho mặc định --</option>
                      {warehouses.map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section: Đơn vị tính */}
                <div className="form-section">
                  <h4 className="section-title">Đơn vị tính (Chọn nhiều) <span className="required">*</span></h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.5rem", background: "#f8fafc", padding: "0.75rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    {units.map(unit => (
                      <label key={unit.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "13px", cursor: "pointer", fontWeight: 500, color: "#475569" }}>
                        <input 
                          type="checkbox" 
                          name="unitIds" 
                          value={unit.id} 
                          disabled={isViewOnly}
                          defaultChecked={editingItem?.unit?.some((u: any) => u.id === unit.id)}
                          style={{ cursor: "pointer" }}
                        />
                        {unit.name}
                      </label>
                    ))}
                    {units.length === 0 && <span style={{ color: "#888", fontSize: "12px" }}>Chưa có đơn vị tính nào hoạt động</span>}
                  </div>
                </div>

                {/* Section: Thông tin bổ sung */}
                <div className="form-section">
                  <h4 className="section-title">Thông tin bổ sung</h4>
                  {editingItem && (
                    <div className="form-group-base" style={{ width: "100%", marginBottom: "0.25rem" }}>
                      <label>Trạng thái</label>
                      <select name="status" className="input-base" disabled={isViewOnly} defaultValue={editingItem?.status || "Hoạt động"}>
                        <option value="Hoạt động">Hoạt động</option>
                        <option value="Ngưng hoạt động">Ngưng hoạt động</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group-base" style={{ width: "100%" }}>
                    <label>Ghi chú</label>
                    <textarea name="note" className="input-base" style={{ height: "70px", resize: "none", paddingTop: "0.35rem" }} disabled={isViewOnly} defaultValue={editingItem?.note || ""} placeholder="Nhập ghi chú..."></textarea>
                  </div>
                </div>
              </form>
            </div>

            <div className="drawer-footer">
              <button type="button" className="btn-base btn-outline" onClick={() => setIsModalOpen(false)}>{isViewOnly ? "Đóng" : "Hủy bỏ"}</button>
              {!isViewOnly && (
                <button type="submit" form="product-form" className="btn-base btn-primary" disabled={isPending}>
                  {isPending ? "Đang xử lý..." : (editingItem ? "Cập nhật sản phẩm" : "Lưu sản phẩm")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {historyRecordId && (
        <HistoryModal 
          tableName="Product" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}
    </div>
  );
}
