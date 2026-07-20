"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getProducts, createProduct, updateProduct, updateProductStatus, deleteProduct, getCategories, getUnits, getWarehouses, importProducts } from "./actions";
import HistoryModal from "../../HistoryModal";
import { Search, Plus, Upload } from "lucide-react";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

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
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formCode, setFormCode] = useState("");
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [formWarehouseId, setFormWarehouseId] = useState("");
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false);
  const [formStatus, setFormStatus] = useState("Hoạt động");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  
  // History state
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  // Excel Import state
  const [importProductsData, setImportProductsData] = useState<any[]>([]);
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [showImportModal, setShowImportModal] = useState(false);

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

  // --- EXCEL HANDLERS ---
  const fieldMapping: any = {
    "Tên sản phẩm": "name",
    "Tên tiếng Anh": "englishName",
    "Quy cách": "packaging",
    "Nhóm sản phẩm": "categoryName",
    "Kho mặc định": "warehouseName",
    "Đơn vị tính": "unitNames",
    "Ghi chú": "note"
  };

  const handleDownloadTemplate = async () => {
    const headers = ["Tên sản phẩm", "Tên tiếng Anh", "Quy cách", "Nhóm sản phẩm", "Kho mặc định", "Đơn vị tính", "Ghi chú"];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");

    // Add headers
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { name: "Segoe UI", bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF003466" } // Sapo Blue color
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;

    // Create hidden sheet for lists
    const dataListsSheet = workbook.addWorksheet("Data_Lists");
    dataListsSheet.state = "hidden";

    // Write options
    const activeCategories = categories.filter(c => c.status === "Hoạt động").map(c => c.name);
    activeCategories.forEach((val, idx) => {
      dataListsSheet.getCell(`A${idx + 1}`).value = val;
    });

    const activeWarehouses = warehouses.filter(w => w.status === "Hoạt động").map(w => w.name);
    activeWarehouses.forEach((val, idx) => {
      dataListsSheet.getCell(`B${idx + 1}`).value = val;
    });

    const activeUnits = units.filter(u => u.status === "Hoạt động").map(u => u.name);
    activeUnits.forEach((val, idx) => {
      dataListsSheet.getCell(`C${idx + 1}`).value = val;
    });

    // Add validation for "Nhóm sản phẩm" (Col D)
    if (activeCategories.length > 0) {
      (worksheet as any).dataValidations.add("D2:D500", {
        type: "list",
        allowBlank: true,
        formulae: [`=Data_Lists!$A$1:$A$${activeCategories.length}`],
        showErrorMessage: true,
        errorTitle: "Dữ liệu không hợp lệ",
        error: "Vui lòng chọn Nhóm sản phẩm trong danh sách."
      });
    }

    // Add validation for "Kho mặc định" (Col E)
    if (activeWarehouses.length > 0) {
      (worksheet as any).dataValidations.add("E2:E500", {
        type: "list",
        allowBlank: true,
        formulae: [`=Data_Lists!$B$1:$B$${activeWarehouses.length}`],
        showErrorMessage: true,
        errorTitle: "Dữ liệu không hợp lệ",
        error: "Vui lòng chọn Kho mặc định trong danh sách."
      });
    }

    // Add validation for "Đơn vị tính" (Col F)
    if (activeUnits.length > 0) {
      (worksheet as any).dataValidations.add("F2:F500", {
        type: "list",
        allowBlank: true,
        formulae: [`=Data_Lists!$C$1:$C$${activeUnits.length}`],
        showErrorMessage: true,
        errorTitle: "Dữ liệu không hợp lệ",
        error: "Vui lòng chọn Đơn vị tính trong danh sách hoặc tự nhập các đơn vị tính ngăn cách bằng dấu phẩy."
      });
    }

    // Auto-fit column widths
    worksheet.columns.forEach(column => {
      let maxLen = 0;
      column.eachCell?.({ includeEmpty: true }, cell => {
        const value = cell.value ? String(cell.value) : "";
        if (value.length > maxLen) {
          maxLen = value.length;
        }
      });
      column.width = Math.max(maxLen + 4, 15);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mau_san_pham.xlsx";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          alert("File Excel không có dữ liệu!");
          return;
        }

        const processedData = rawData.map(row => {
          const item: any = {};
          const normalizedRow: any = {};
          Object.keys(row).forEach(k => {
            normalizedRow[k.trim()] = row[k];
          });

          Object.keys(fieldMapping).forEach(header => {
            const mappedField = fieldMapping[header];
            const value = normalizedRow[header] || normalizedRow[header.trim()];
            if (value !== undefined && value !== null) {
              item[mappedField] = value;
            }
          });
          return item;
        }).filter(item => item.name);

        if (processedData.length === 0) {
          alert("Không tìm thấy dữ liệu hợp lệ (vui lòng kiểm tra tiêu đề cột trong file Excel)!");
          return;
        }

        setImportProductsData(processedData);
        setImportMode("append");
        setShowImportModal(true);
      } catch (err: any) {
        alert("Lỗi đọc file Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ""; // Reset input
  };

  const executeImport = () => {
    if (importProductsData.length === 0) return;

    startTransition(async () => {
      try {
        await importProducts(importProductsData, importMode);
        alert(`Import thành công ${importProductsData.length} sản phẩm!`);
        setShowImportModal(false);
        setImportProductsData([]);
        setSelectedItemId(null);
        fetchData();
      } catch (err: any) {
        alert("Lỗi lưu dữ liệu: " + err.message);
      }
    });
  };

  const openAddModal = () => {
    setEditingItem(null);
    setIsViewOnly(false);
    setSelectedItemId(null);
    setFormCategoryId("");
    setFormCode("");
    setFormWarehouseId("");
    setFormStatus("Hoạt động");
    setSelectedUnitIds([]);
    setIsUnitDropdownOpen(false);
    setIsCategoryDropdownOpen(false);
    setIsWarehouseDropdownOpen(false);
    setIsStatusDropdownOpen(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setIsViewOnly(false);
    setFormCategoryId(item.categoryId || "");
    setFormCode(item.code || "");
    setFormWarehouseId(item.warehouseId || "");
    setFormStatus(item.status || "Hoạt động");
    setSelectedUnitIds(item.unit?.map((u: any) => u.id) || []);
    setIsUnitDropdownOpen(false);
    setIsCategoryDropdownOpen(false);
    setIsWarehouseDropdownOpen(false);
    setIsStatusDropdownOpen(false);
    setIsModalOpen(true);
  };

  const openViewModal = (item: any) => {
    setEditingItem(item);
    setIsViewOnly(true);
    setFormCategoryId(item.categoryId || "");
    setFormCode(item.code || "");
    setFormWarehouseId(item.warehouseId || "");
    setFormStatus(item.status || "Hoạt động");
    setSelectedUnitIds(item.unit?.map((u: any) => u.id) || []);
    setIsUnitDropdownOpen(false);
    setIsCategoryDropdownOpen(false);
    setIsWarehouseDropdownOpen(false);
    setIsStatusDropdownOpen(false);
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
        .custom-modal-overlay .form-group-base label {
          text-transform: uppercase !important;
          color: #003466 !important;
          font-weight: 700 !important;
          margin-bottom: 5px !important;
          font-size: 12px !important;
          display: block !important;
        }
        .custom-modal-overlay .form-group-base.no-flex {
          flex: none !important;
        }
        .custom-modal-overlay .input-base, 
        .custom-modal-overlay select.input-base,
        .custom-modal-overlay textarea.input-base {
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 2px 10px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #000000 !important;
          background-color: #fff !important;
          outline: none !important;
          width: 100% !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        .custom-modal-overlay input.input-base,
        .custom-modal-overlay select.input-base {
          height: 26px !important;
        }
        .custom-modal-overlay textarea.input-base {
          padding: 8px 12px !important;
        }
         .custom-modal-overlay .input-base:focus, 
         .custom-modal-overlay select.input-base:focus,
         .custom-modal-overlay textarea.input-base:focus {
           border-color: #ff5c00 !important;
           box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
         }
         .custom-modal-overlay .input-base:disabled,
         .custom-modal-overlay .input-base[readOnly] {
           color: #000000 !important;
           -webkit-text-fill-color: #000000 !important;
           opacity: 1 !important;
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
        /* Custom Dropdown Styles */
        .custom-dropdown-container {
          position: relative !important;
          width: 100% !important;
        }
        .custom-dropdown-trigger {
          padding: 2px 10px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #000000 !important;
          background-color: #fff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 8px !important;
          height: 26px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          cursor: pointer !important;
          user-select: none !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .custom-dropdown-trigger:focus,
        .custom-dropdown-trigger.active {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
          outline: none !important;
        }
        .custom-dropdown-trigger.disabled {
          background-color: #f1f5f9 !important;
          cursor: not-allowed !important;
          color: #000000 !important;
        }
        .custom-dropdown-menu {
          position: absolute !important;
          top: 100% !important;
          left: 0 !important;
          right: 0 !important;
          background: #fff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05) !important;
          max-height: 116px !important; /* exactly 4 items * 28px + 4px padding = 116px */
          overflow-y: auto !important;
          padding: 2px 0 !important;
          margin-top: 4px !important;
          display: flex !important;
          flex-direction: column !important;
          box-sizing: border-box !important;
          z-index: 100000 !important;
        }
        .custom-dropdown-menu.dropup {
          top: auto !important;
          bottom: 100% !important;
          margin-top: auto !important;
          margin-bottom: 4px !important;
        }
        .custom-dropdown-item {
          height: 28px !important;
          display: flex !important;
          align-items: center !important;
          padding: 0 10px !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          color: #475569 !important;
          cursor: pointer !important;
          user-select: none !important;
          transition: background 0.15s !important;
          box-sizing: border-box !important;
          gap: 15px !important;
        }
        .custom-dropdown-item input[type="checkbox"] {
          margin: 0 !important;
          margin-right: 15px !important;
          cursor: pointer !important;
        }
        .custom-dropdown-item:hover {
          background-color: #f1f5f9 !important;
        }
        .custom-dropdown-item.selected {
          background-color: #f0f7ff !important;
          color: #2563eb !important;
          font-weight: 600 !important;
        }
        .custom-dropdown-item.placeholder {
          color: #94a3b8 !important;
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

            <button
              type="button"
              className="sapo-btn"
              style={{ backgroundColor: "#0f766e" }}
              onClick={handleDownloadTemplate}
            >
              Tải file excel mẫu
            </button>

            <button
              type="button"
              className="sapo-btn"
              style={{ backgroundColor: "#2563eb" }}
              onClick={() => document.getElementById("excel-import-input")?.click()}
            >
              Import excel
            </button>
            <input
              id="excel-import-input"
              type="file"
              hidden
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
            />

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
        <div className="custom-modal-overlay">
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "95%",
              maxWidth: "850px",
              maxHeight: "90%",
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
            {/* Sticky Header */}
            <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "12px 24px", margin: 0, background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", fontSize: "16px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isViewOnly ? (
                  <>
                    <span>👁️ Chi tiết sản phẩm:</span>
                    <span style={{ color: "#ff5c00" }}>{editingItem?.code}</span>
                  </>
                ) : editingItem ? (
                  <>
                    <span>✏️ Hiệu chỉnh sản phẩm:</span>
                    <span style={{ color: "#ff5c00" }}>{editingItem?.code}</span>
                  </>
                ) : (
                  <span>📦 Tiếp nhận sản phẩm mới</span>
                )}
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#64748b", padding: "0 4px" }}
              >
                &times;
              </button>
            </h3>

            {/* Scrollable Form Body */}
            <form id="product-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", margin: 0 }}>
              <div className="scrollable-body" style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
                {/* Two Column Layout */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  
                  {/* Left Column: General Info */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <h4 className="section-title" style={{ marginTop: 0 }}>Thông tin chung</h4>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div className="form-group-base">
                        <label>Mã sản phẩm <span className="required">*</span></label>
                        <input 
                          type="text" 
                          name="code" 
                          className="input-base" 
                          required 
                          readOnly={isViewOnly || !editingItem} 
                          value={formCode}
                          onChange={(e) => setFormCode(e.target.value)}
                          placeholder={formCategoryId ? "Ví dụ: SP0001" : "Chọn nhóm để tự động tạo mã"} 
                          style={(isViewOnly || !editingItem) ? { background: "#f1f5f9", cursor: "not-allowed" } : undefined}
                        />
                      </div>
                      <div className="form-group-base no-flex" style={{ position: "relative", zIndex: isCategoryDropdownOpen ? 10000 : undefined }}>
                        <label>Nhóm sản phẩm <span className="required">*</span></label>
                        
                        {/* Trigger Header */}
                        <div 
                          tabIndex={isViewOnly ? undefined : 0}
                          onClick={() => {
                            if (!isViewOnly) {
                              setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                              setIsUnitDropdownOpen(false);
                              setIsWarehouseDropdownOpen(false);
                              setIsStatusDropdownOpen(false);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (!isViewOnly) {
                                setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                                setIsUnitDropdownOpen(false);
                                setIsWarehouseDropdownOpen(false);
                                setIsStatusDropdownOpen(false);
                              }
                            }
                          }}
                          className={`custom-dropdown-trigger ${isCategoryDropdownOpen ? "active" : ""} ${isViewOnly ? "disabled" : ""}`}
                        >
                          <span style={{ 
                            whiteSpace: "nowrap", 
                            overflow: "hidden", 
                            textOverflow: "ellipsis",
                            width: "90%",
                            color: formCategoryId ? "#000000" : "#94a3b8"
                          }}>
                            {formCategoryId 
                              ? (categories.find(c => c.id === formCategoryId)?.name || "-- Chọn nhóm --")
                              : "-- Chọn nhóm --"}
                          </span>
                          <span style={{ fontSize: "8px", color: "#64748b" }}>▼</span>
                        </div>

                        {/* Dropdown Menu Overlay */}
                        {isCategoryDropdownOpen && !isViewOnly && (
                          <>
                            <div 
                              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                              onClick={() => setIsCategoryDropdownOpen(false)}
                            />
                            <div className="custom-dropdown-menu" style={{ maxHeight: "144px", overflowY: "auto", zIndex: 1000 }}>
                              <div 
                                style={{ height: "28px", display: "flex", alignItems: "center", boxSizing: "border-box" }}
                                className={`custom-dropdown-item placeholder ${!formCategoryId ? "selected" : ""}`}
                                onClick={() => {
                                  setFormCategoryId("");
                                  setIsCategoryDropdownOpen(false);
                                }}
                              >
                                -- Chọn nhóm --
                              </div>
                              {categories.map(cat => {
                                const isSelected = formCategoryId === cat.id;
                                return (
                                  <div 
                                    key={cat.id} 
                                    style={{ height: "28px", display: "flex", alignItems: "center", boxSizing: "border-box" }}
                                    className={`custom-dropdown-item ${isSelected ? "selected" : ""}`}
                                    onClick={() => {
                                      setFormCategoryId(cat.id);
                                      setIsCategoryDropdownOpen(false);
                                      
                                      if (!editingItem) {
                                        const categoryName = cat.name || "";
                                        let prefix = "KC";
                                        const normalized = categoryName.trim().toLowerCase();
                                        if (normalized === "thành phẩm sản xuất") {
                                          prefix = "SP";
                                        } else if (normalized === "vật tư, bao bì đóng gói" || normalized === "vật tư bao bì đóng gói") {
                                          prefix = "VT";
                                        } else if (normalized === "hóa chất") {
                                          prefix = "HC";
                                        } else if (normalized === "công cụ dụng cụ sản xuất" || normalized === "công cụ, dụng cụ sản xuất") {
                                          prefix = "CC";
                                        }
                                        const count = items.filter(item => item.categoryId === cat.id).length;
                                        const nextCode = `${prefix}${String(count + 1).padStart(4, '0')}`;
                                        setFormCode(nextCode);
                                      }
                                    }}
                                  >
                                    {cat.name}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        <select 
                          name="categoryId" 
                          required 
                          value={formCategoryId} 
                          onChange={() => {}} 
                          tabIndex={-1}
                          style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                        >
                          <option value="" disabled>-- Chọn nhóm --</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group-base">
                      <label>Tên sản phẩm <span className="required">*</span></label>
                      <input type="text" name="name" className="input-base" required disabled={isViewOnly} defaultValue={editingItem?.name || ""} placeholder="Ví dụ: Áo thun nam" />
                    </div>

                    <div className="form-group-base">
                      <label>Tên tiếng Anh</label>
                      <input type="text" name="englishName" className="input-base" disabled={isViewOnly} defaultValue={editingItem?.englishName || ""} placeholder="Ví dụ: Men's T-shirt" />
                    </div>

                    <div className="form-group-base">
                      <label>Quy cách <span className="required">*</span></label>
                      <input type="text" name="packaging" className="input-base" required disabled={isViewOnly} defaultValue={editingItem?.packaging || ""} placeholder="Ví dụ: Chai 500ml, Thùng 24 lon..." />
                    </div>
                  </div>

                  {/* Right Column: Units & Additional Info */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <h4 className="section-title" style={{ marginTop: 0 }}>Đơn vị tính & Thông tin bổ sung</h4>
                    
                    <div className="form-group-base no-flex" style={{ position: "relative", zIndex: isUnitDropdownOpen ? 10000 : undefined }}>
                      <label>Đơn vị tính (Chọn nhiều) <span className="required">*</span></label>
                      
                      {/* Dropdown Header */}
                      <div 
                        tabIndex={isViewOnly ? undefined : 0}
                        onClick={() => {
                          if (!isViewOnly) {
                            setIsUnitDropdownOpen(!isUnitDropdownOpen);
                            setIsCategoryDropdownOpen(false);
                            setIsWarehouseDropdownOpen(false);
                            setIsStatusDropdownOpen(false);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (!isViewOnly) {
                              setIsUnitDropdownOpen(!isUnitDropdownOpen);
                              setIsCategoryDropdownOpen(false);
                              setIsWarehouseDropdownOpen(false);
                              setIsStatusDropdownOpen(false);
                            }
                          }
                        }}
                        className={`custom-dropdown-trigger ${isUnitDropdownOpen ? "active" : ""} ${isViewOnly ? "disabled" : ""}`}
                      >
                        <span style={{ 
                          whiteSpace: "nowrap", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis",
                          width: "90%",
                          color: selectedUnitIds.length > 0 ? "#000000" : "#94a3b8"
                        }}>
                          {selectedUnitIds.length > 0 
                            ? units.filter(u => selectedUnitIds.includes(u.id)).map(u => u.name).join(", ") 
                            : "-- Chọn đơn vị tính --"}
                        </span>
                        <span style={{ fontSize: "8px", color: "#64748b" }}>▼</span>
                      </div>

                      {/* Dropdown Menu Overlay */}
                      {isUnitDropdownOpen && !isViewOnly && (
                        <>
                          <div 
                            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                            onClick={() => setIsUnitDropdownOpen(false)}
                          />
                          <div className="custom-dropdown-menu" style={{ maxHeight: "116px", overflowY: "auto", zIndex: 1000 }}>
                            {units.map(unit => {
                              const isChecked = selectedUnitIds.includes(unit.id);
                              return (
                                <label 
                                  key={unit.id} 
                                  style={{ height: "28px", display: "flex", alignItems: "center", boxSizing: "border-box", gap: "15px" }}
                                  className={`custom-dropdown-item ${isChecked ? "selected" : ""}`}
                                >
                                  <input 
                                    type="checkbox" 
                                    value={unit.id} 
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedUnitIds([...selectedUnitIds, unit.id]);
                                      } else {
                                        setSelectedUnitIds(selectedUnitIds.filter(id => id !== unit.id));
                                      }
                                    }}
                                    style={{ cursor: "pointer", marginRight: "15px" }}
                                  />
                                  {unit.name}
                                </label>
                              );
                            })}
                            {units.length === 0 && <span style={{ color: "#888", fontSize: "12px", padding: "4px 10px" }}>Chưa có đơn vị tính nào hoạt động</span>}
                          </div>
                        </>
                      )}

                      {/* Hidden select for HTML validation */}
                      <select
                        required
                        multiple
                        value={selectedUnitIds}
                        onChange={() => {}}
                        tabIndex={-1}
                        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                      >
                        {selectedUnitIds.map(id => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>

                      {/* Hidden inputs to make sure form submission works unchanged */}
                      {selectedUnitIds.map(id => (
                        <input key={id} type="hidden" name="unitIds" value={id} />
                      ))}
                    </div>

                  <div className="form-group-base no-flex" style={{ position: "relative", zIndex: isWarehouseDropdownOpen ? 10000 : undefined }}>
                    <label>Kho mặc định <span className="required">*</span></label>
                    
                    {/* Trigger Header */}
                    <div 
                      tabIndex={isViewOnly ? undefined : 0}
                      onClick={() => {
                        if (!isViewOnly) {
                          setIsWarehouseDropdownOpen(!isWarehouseDropdownOpen);
                          setIsCategoryDropdownOpen(false);
                          setIsUnitDropdownOpen(false);
                          setIsStatusDropdownOpen(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (!isViewOnly) {
                            setIsWarehouseDropdownOpen(!isWarehouseDropdownOpen);
                            setIsCategoryDropdownOpen(false);
                            setIsUnitDropdownOpen(false);
                            setIsStatusDropdownOpen(false);
                          }
                        }
                      }}
                      className={`custom-dropdown-trigger ${isWarehouseDropdownOpen ? "active" : ""} ${isViewOnly ? "disabled" : ""}`}
                    >
                      <span style={{ 
                        whiteSpace: "nowrap", 
                        overflow: "hidden", 
                        textOverflow: "ellipsis",
                        width: "90%",
                        color: formWarehouseId ? "#000000" : "#94a3b8"
                      }}>
                        {formWarehouseId 
                          ? (warehouses.find(wh => wh.id === formWarehouseId)?.name || "-- Chọn kho mặc định --")
                          : "-- Chọn kho mặc định --"}
                      </span>
                      <span style={{ fontSize: "8px", color: "#64748b" }}>▼</span>
                    </div>

                    {/* Dropdown Menu Overlay */}
                    {isWarehouseDropdownOpen && !isViewOnly && (
                      <>
                        <div 
                          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                          onClick={() => setIsWarehouseDropdownOpen(false)}
                        />
                        <div className="custom-dropdown-menu" style={{ maxHeight: "144px", overflowY: "auto", zIndex: 1000 }}>
                          <div 
                            style={{ height: "28px", display: "flex", alignItems: "center", boxSizing: "border-box" }}
                            className={`custom-dropdown-item placeholder ${!formWarehouseId ? "selected" : ""}`}
                            onClick={() => {
                              setFormWarehouseId("");
                              setIsWarehouseDropdownOpen(false);
                            }}
                          >
                            -- Chọn kho mặc định --
                          </div>
                          {warehouses.map(wh => {
                            const isSelected = formWarehouseId === wh.id;
                            return (
                              <div 
                                key={wh.id} 
                                className={`custom-dropdown-item ${isSelected ? "selected" : ""}`}
                                onClick={() => {
                                  setFormWarehouseId(wh.id);
                                  setIsWarehouseDropdownOpen(false);
                                }}
                              >
                                {wh.name}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    <select 
                      name="warehouseId" 
                      required 
                      value={formWarehouseId} 
                      onChange={() => {}} 
                      tabIndex={-1}
                      style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                    >
                      <option value="" disabled>-- Chọn kho mặc định --</option>
                      {warehouses.map(wh => (
                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                      ))}
                    </select>
                  </div>

                    <div className="form-group-base">
                      <label>Ghi chú</label>
                      <textarea 
                        ref={(el) => {
                          if (el) {
                            setTimeout(() => {
                              el.style.height = "auto";
                              el.style.height = `${el.scrollHeight}px`;
                            }, 50);
                          }
                        }}
                        name="note" 
                        className="input-base" 
                        style={{ minHeight: "50px", resize: "none", paddingTop: "0.35rem", overflowY: "hidden" }} 
                        disabled={isViewOnly} 
                        defaultValue={editingItem?.note || ""} 
                        placeholder="Nhập ghi chú..."
                        onInput={(e) => {
                          e.currentTarget.style.height = "auto";
                          e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                        }}
                      />
                    </div>

                    {editingItem && (
                      <div className="form-group-base no-flex" style={{ position: "relative", zIndex: isStatusDropdownOpen ? 10000 : undefined }}>
                        <label>Trạng thái</label>
                        
                        {/* Trigger Header */}
                        <div 
                          tabIndex={isViewOnly ? undefined : 0}
                          onClick={() => {
                            if (!isViewOnly) {
                              setIsStatusDropdownOpen(!isStatusDropdownOpen);
                              setIsCategoryDropdownOpen(false);
                              setIsUnitDropdownOpen(false);
                              setIsWarehouseDropdownOpen(false);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              if (!isViewOnly) {
                                setIsStatusDropdownOpen(!isStatusDropdownOpen);
                                setIsCategoryDropdownOpen(false);
                                setIsUnitDropdownOpen(false);
                                setIsWarehouseDropdownOpen(false);
                              }
                            }
                          }}
                          className={`custom-dropdown-trigger ${isStatusDropdownOpen ? "active" : ""} ${isViewOnly ? "disabled" : ""}`}
                        >
                          <span style={{ 
                            whiteSpace: "nowrap", 
                            overflow: "hidden", 
                            textOverflow: "ellipsis",
                            width: "90%",
                            color: "#000000"
                          }}>
                            {formStatus || "Hoạt động"}
                          </span>
                          <span style={{ fontSize: "8px", color: "#64748b" }}>▼</span>
                        </div>

                        {/* Dropdown Menu Overlay */}
                        {isStatusDropdownOpen && !isViewOnly && (
                          <>
                            <div 
                              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                              onClick={() => setIsStatusDropdownOpen(false)}
                            />
                            <div className="custom-dropdown-menu dropup" style={{ maxHeight: "116px", overflowY: "auto", zIndex: 1000 }}>
                              <div 
                                style={{ height: "28px", display: "flex", alignItems: "center", boxSizing: "border-box" }}
                                className={`custom-dropdown-item ${formStatus === "Hoạt động" ? "selected" : ""}`}
                                onClick={() => {
                                  setFormStatus("Hoạt động");
                                  setIsStatusDropdownOpen(false);
                                }}
                              >
                                Hoạt động
                              </div>
                              <div 
                                style={{ height: "28px", display: "flex", alignItems: "center", boxSizing: "border-box" }}
                                className={`custom-dropdown-item ${formStatus === "Ngưng hoạt động" ? "selected" : ""}`}
                                onClick={() => {
                                  setFormStatus("Ngưng hoạt động");
                                  setIsStatusDropdownOpen(false);
                                }}
                              >
                                Ngưng hoạt động
                              </div>
                            </div>
                          </>
                        )}

                        <select 
                          name="status" 
                          value={formStatus} 
                          onChange={() => {}} 
                          tabIndex={-1}
                          style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                        >
                          <option value="Hoạt động">Hoạt động</option>
                          <option value="Ngưng hoạt động">Ngưng hoạt động</option>
                        </select>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="drawer-footer" style={{ borderTop: "1px solid #f1f5f9", padding: "0.75rem 1.5rem" }}>
                <button type="button" className="btn-base btn-outline" onClick={() => setIsModalOpen(false)}>{isViewOnly ? "Đóng" : "Hủy bỏ"}</button>
                {!isViewOnly && (
                  <button type="submit" className="btn-base btn-primary" disabled={isPending}>
                    {isPending ? "Đang xử lý..." : (editingItem ? "Cập nhật sản phẩm" : "Lưu sản phẩm")}
                  </button>
                )}
              </div>
            </form>
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

      {showImportModal && (
        <div className="confirm-overlay" onClick={() => setShowImportModal(false)}>
          <div className="confirm-modal animate-slide-up" style={{ maxWidth: "450px", padding: "1.5rem" }} onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-box" style={{ backgroundColor: "#eff6ff", color: "#2563eb", width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", margin: "0 auto 1rem auto" }}>
              <Upload size={24} />
            </div>
            <h4 className="confirm-title" style={{ marginTop: "0.5rem", fontSize: "16px", fontWeight: 700, textAlign: "center", color: "#003466" }}>
              Nhập Excel Sản phẩm
            </h4>
            <p className="confirm-message" style={{ margin: "0.5rem 0 1rem 0", fontSize: "13px", color: "#475569", textAlign: "center" }}>
              Phát hiện <strong>{importProductsData.length}</strong> sản phẩm từ file Excel. Vui lòng chọn phương thức nhập dữ liệu:
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem", width: "100%" }}>
              <label style={{ 
                display: "flex", 
                alignItems: "flex-start", 
                gap: "0.75rem", 
                padding: "10px 12px", 
                border: "1px solid #cbd5e1", 
                borderRadius: "6px", 
                cursor: "pointer",
                backgroundColor: importMode === "append" ? "#eff6ff" : "white",
                borderColor: importMode === "append" ? "#3b82f6" : "#cbd5e1",
                transition: "all 0.2s",
                textAlign: "left"
              }}>
                <input 
                  type="radio" 
                  name="importMode" 
                  value="append" 
                  checked={importMode === "append"} 
                  onChange={() => setImportMode("append")}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <strong style={{ display: "block", fontSize: "13px", color: "#0f172a" }}>Thêm mới</strong>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Thêm dữ liệu trong file excel vào hệ thống (giữ lại dữ liệu hiện tại).</span>
                </div>
              </label>

              <label style={{ 
                display: "flex", 
                alignItems: "flex-start", 
                gap: "0.75rem", 
                padding: "10px 12px", 
                border: "1px solid #cbd5e1", 
                borderRadius: "6px", 
                cursor: "pointer",
                backgroundColor: importMode === "replace" ? "#fef2f2" : "white",
                borderColor: importMode === "replace" ? "#ef4444" : "#cbd5e1",
                transition: "all 0.2s",
                textAlign: "left"
              }}>
                <input 
                  type="radio" 
                  name="importMode" 
                  value="replace" 
                  checked={importMode === "replace"} 
                  onChange={() => setImportMode("replace")}
                  style={{ marginTop: "3px" }}
                />
                <div>
                  <strong style={{ display: "block", fontSize: "13px", color: "#b91c1c" }}>Ghi đè</strong>
                  <span style={{ fontSize: "11px", color: "#991b1b" }}>Xóa toàn bộ dữ liệu cũ hiện tại và thêm dữ liệu mới từ file excel vào.</span>
                </div>
              </label>
            </div>

            <div className="confirm-actions" style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", width: "100%" }}>
              <button type="button" className="confirm-btn btn-cancel" onClick={() => setShowImportModal(false)} style={{ flex: 1, padding: "8px 16px", borderRadius: "4px", fontSize: "13px", border: "1px solid #cbd5e1", backgroundColor: "white", cursor: "pointer" }}>
                Hủy
              </button>
              <button 
                type="button" 
                className="confirm-btn" 
                onClick={executeImport} 
                disabled={isPending}
                style={{ 
                  flex: 1, 
                  padding: "8px 16px", 
                  borderRadius: "4px", 
                  fontSize: "13px", 
                  border: "none", 
                  backgroundColor: importMode === "replace" ? "#ef4444" : "#2563eb", 
                  color: "white", 
                  cursor: "pointer",
                  fontWeight: 600
                }}
              >
                {isPending ? "Đang xử lý..." : "Đồng ý"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
