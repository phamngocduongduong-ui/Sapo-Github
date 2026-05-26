"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil, Search, Info, Plus, History, User, MapPin, Hash, Trash2, Eye, Ban, CheckCircle
} from "lucide-react";
import {
  deleteSupplier,
  toggleSupplierStatus,
  createSupplier,
  updateSupplier,
  checkSupplierHasPOs,
  bulkReplaceSuppliers,
  generateNextSupplierCode
} from "./actions";
import HistoryModal from "@/app/(dashboard)/HistoryModal";
import * as XLSX from "xlsx";

type Supplier = {
  id: string;
  code: string;
  name: string;
  taxCode: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  debtPolicy: string | null;
  debtDays?: number;
  status: string | null;
  bankAccountInfo?: string | null;
};

export default function SupplierTable({
  initialSuppliers,
  isAdmin = false
}: {
  initialSuppliers: Supplier[],
  isAdmin?: boolean
}) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string>("");

  // Custom delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [hasGeneratedData, setHasGeneratedData] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selection state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId) || null;

  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.taxCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.debtPolicy || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  function handleClose() {
    setShowModal(false);
    setEditingSupplier(null);
    setIsViewOnly(false);
    setError(null);
    setGeneratedCode("");
  }

  function handleEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setIsViewOnly(false);
    setShowModal(true);
  }

  function handleAddNew() {
    setEditingSupplier(null);
    setIsViewOnly(false);
    setError(null);
    
    startTransition(async () => {
      try {
        const nextCode = await generateNextSupplierCode();
        setGeneratedCode(nextCode);
        setShowModal(true);
      } catch (err: any) {
        setError(err.message || "Không thể tạo mã nhà cung cấp tự động.");
        setShowModal(true);
      }
    });
  }

  function handleView(supplier: Supplier) {
    setEditingSupplier(supplier);
    setIsViewOnly(true);
    setError(null);
    setShowModal(true);
  }

  const handleDelete = async (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    try {
      const hasPOs = await checkSupplierHasPOs(supplier.code);
      setHasGeneratedData(hasPOs);
      setShowDeleteModal(true);
    } catch (err) {
      console.error("Error checking supplier POs:", err);
      setHasGeneratedData(false);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;

    startTransition(async () => {
      try {
        await deleteSupplier(supplierToDelete.id);
        setShowDeleteModal(false);
        setSupplierToDelete(null);
        setSelectedSupplierId(null);
        router.refresh();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Có lỗi xảy ra khi xóa.");
      }
    });
  };

  function handleSubmit(formData: FormData) {
    if (isViewOnly) return;
    setError(null);
    startTransition(async () => {
      try {
        if (editingSupplier) {
          await updateSupplier(editingSupplier.id, formData);
        } else {
          await createSupplier(formData);
        }
        handleClose();
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      }
    });
  }

  // --- EXCEL HANDLERS ---
  const fieldMapping: any = {
    "Mã NCC": "code",
    "Tên nhà cung cấp": "name",
    "MST": "taxCode",
    "Số điện thoại": "phone",
    "Email": "email",
    "Địa chỉ": "address",
    "Chính sách công nợ": "debtPolicy",
    "Thông tin tài khoản": "bankAccountInfo",
    "Trạng thái": "status"
  };

  const handleDownloadTemplate = () => {
    const headers = Object.keys(fieldMapping);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "mau_nha_cung_cap.xlsx");
  };

  const handleExportExcel = () => {
    const data = suppliers.map(s => {
      const row: any = {};
      Object.keys(fieldMapping).forEach(header => {
        const field = fieldMapping[header];
        let val = (s as any)[field];
        row[header] = val || "";
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NhaCungCap");
    XLSX.writeFile(wb, "danh_sach_nha_cung_cap.xlsx");
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
        }).filter(item => item.code && item.name);

        if (processedData.length === 0) {
          alert("Không tìm thấy dữ liệu hợp lệ (vui lòng kiểm tra tiêu đề cột trong file Excel)!");
          return;
        }

        startTransition(async () => {
          try {
            await bulkReplaceSuppliers(processedData);
            alert(`Import thành công ${processedData.length} nhà cung cấp!`);
            setSelectedSupplierId(null);
            router.refresh();
          } catch (err: any) {
            alert("Lỗi lưu dữ liệu: " + err.message);
          }
        });
      } catch (err: any) {
        alert("Lỗi đọc file Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ""; // Reset input
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
          padding: 0px 0px 10px 0px !important;
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
          margin-bottom: 10px !important;
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
          margin: 0px 0px 10px 0px !important;
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
        .inactive-row .code-pill {
          background-color: #fee2e2 !important;
          border: 1px solid #ef4444 !important;
          color: #b91c1c !important;
        }
        .base-toolbar {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 4px !important;
          padding: 0 !important;
          gap: 1rem !important;
          flex-wrap: nowrap !important;
          width: 100% !important;
          font-family: "Segoe UI", sans-serif !important;
        }
        .toolbar-left {
          display: flex !important;
          align-items: center !important;
          gap: 1rem !important;
          }
        .toolbar-right {
          display: flex !important;
          align-items: center !important;
          gap: 0.75rem !important;
        }
        .btn-group-base {
          display: flex !important;
          gap: 0.75rem !important;
        }
        .page-title-base {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: #000000 !important;
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          margin: 0 !important;
        }
        .badge-count {
          background: #e2e8f0 !important;
          color: #000000 !important;
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          padding: 2px 8px !important;
          border-radius: 999px !important;
          margin-left: 0.25rem !important;
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
        .base-filters {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          padding: 10px !important;
        }
        .form-control {
          padding: 6px 10px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          outline: none !important;
          background: white !important;
        }
        .drawer-header {
          padding: 0.65rem 1.25rem !important;
        }
        .drawer-body {
          padding: 0.75rem 1.25rem !important;
          gap: 0.65rem !important;
        }
        .drawer-form {
          gap: 0.65rem !important;
        }
        .form-section {
          gap: 0.4rem !important;
        }
        .form-row {
          gap: 0.5rem !important;
        }
        .form-group-base {
          gap: 0.05rem !important;
        }
        .form-group-base label {
          margin-bottom: 0.1rem !important;
          font-size: 12px !important;
        }
        .input-base, select.input-base {
          padding: 0.35rem 0.65rem !important;
          font-size: 13px !important;
          height: 32px !important;
          display: flex !important;
          align-items: center !important;
        }
        select.input-base {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        .section-title {
          font-size: 13px !important;
          padding-bottom: 2px !important;
          margin-top: 0.25rem !important;
          margin-bottom: 0.25rem !important;
        }
        .drawer-footer {
          padding: 0.75rem 1.25rem !important;
        }
        .drawer-content {
          max-width: 500px !important;
        }
      `
      }} />

      <div className="breadcrumb-banner">
        DANH SÁCH NHÀ CUNG CẤP
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

            {selectedSupplier && (
              <>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => handleView(selectedSupplier)}
                >
                  Xem chi tiết
                </button>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => handleEdit(selectedSupplier)}
                >
                  Sửa
                </button>
                {(selectedSupplier.status || "Hoạt động") === "Hoạt động" ? (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={async () => {
                      startTransition(async () => {
                        try {
                          await toggleSupplierStatus(selectedSupplier.id, selectedSupplier.status || "Hoạt động");
                        } catch (err: any) {
                          setError(err.message);
                        }
                      });
                    }}
                  >
                    Ngưng kích hoạt
                  </button>
                ) : (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={async () => {
                      startTransition(async () => {
                        try {
                          await toggleSupplierStatus(selectedSupplier.id, selectedSupplier.status || "Hoạt động");
                        } catch (err: any) {
                          setError(err.message);
                        }
                      });
                    }}
                  >
                    Kích hoạt
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleDelete(selectedSupplier)}
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
                  placeholder="Tìm kiếm nhà cung cấp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <button className="sapo-btn" onClick={handleDownloadTemplate} title="Tải file mẫu">
                Tải mẫu
              </button>
              <label className="sapo-btn" style={{ cursor: "pointer", margin: 0 }} title="Import Excel">
                Nhập Excel
                <input type="file" hidden accept=".xlsx, .xls" onChange={handleImportExcel} />
              </label>
              <button className="sapo-btn" onClick={handleExportExcel} title="Xuất file Excel">
                Xuất Excel
              </button>
            </div>
          </div>

          <div className="base-table-wrapper" style={paginatedSuppliers.length === 0 ? { height: "auto" } : undefined}>
            <table className="base-table" style={{ tableLayout: "fixed", width: "100%" }}>
              <thead>
                <tr>
                  <th className="th-first nowrap" style={{ width: "50px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>STT</th>
                  <th className="nowrap" style={{ width: "90px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Mã NCC</th>
                  <th className="nowrap" style={{ width: "220px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Tên nhà cung cấp</th>
                  <th className="nowrap" style={{ width: "110px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>MST</th>
                  <th className="nowrap" style={{ width: "250px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Địa chỉ</th>
                  <th className="nowrap" style={{ width: "200px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Liên hệ</th>
                  <th className="nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Chính sách công nợ</th>
                  <th className="th-last nowrap" style={{ width: "130px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSuppliers.map((supplier, index) => (
                  <tr
                    key={supplier.id}
                    onClick={() => setSelectedSupplierId(selectedSupplierId === supplier.id ? null : supplier.id)}
                    className={`row-hoverable ${selectedSupplierId === supplier.id ? "row-selected" : ""} ${(supplier.status || "Hoạt động") !== "Hoạt động" ? "inactive-row" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="code-pill">{supplier.code}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: "#000" }}>
                      <div 
                        title={supplier.name}
                        style={{ 
                          maxWidth: "220px", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          whiteSpace: "nowrap" 
                        }}
                      >
                        {supplier.name}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>{supplier.taxCode || "—"}</td>
                    <td>
                      <div
                        title={supplier.address || ""}
                        style={{
                          maxWidth: "240px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "#64748b"
                        }}
                      >
                        {supplier.address || "—"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "11px", color: "#475569" }}>
                        {supplier.phone && <div>📞 {supplier.phone}</div>}
                        {supplier.email && <div>✉️ {supplier.email}</div>}
                        {!supplier.phone && !supplier.email && "—"}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        title={supplier.debtPolicy || ""}
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {supplier.debtPolicy || "—"}
                      </div>
                    </td>
                    <td className="nowrap" style={{ textAlign: "center" }}>
                      <span style={{
                        color: (supplier.status || "Hoạt động") === "Hoạt động" ? "#10b981" : "#ef4444",
                        fontWeight: 600
                      }}>
                        {supplier.status || "Hoạt động"}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                        <Info size={40} strokeWidth={1.5} />
                        <span>Không tìm thấy nhà cung cấp nào khớp với tìm kiếm</span>
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
                Hiển thị <strong>{paginatedSuppliers.length}</strong> / {filteredSuppliers.length} nhà cung cấp
              </div>
              <div className="pagination-controls">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Trước
                </button>
                <span className="page-number">
                  Trang <strong>{currentPage}</strong> / {totalPages}
                </span>
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

      {showModal && (
        <div className="drawer-overlay" onClick={handleClose}>
          <div className="drawer-content animate-drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="header-titles">
                <h3>{isViewOnly ? "👁️ Xem chi tiết nhà cung cấp" : (editingSupplier ? "✏️ Hiệu chỉnh nhà cung cấp" : "🚚 Thêm nhà cung cấp mới")}</h3>
                <p className="header-sub">Danh mục nhà cung cấp • {editingSupplier ? editingSupplier.code : "Mới"}</p>
              </div>
              <button onClick={handleClose} className="drawer-close-btn">&times;</button>
            </div>

            <div className="drawer-body">
              {error && <div className="error-alert">⚠️ {error}</div>}

              <form id="supplier-form" action={handleSubmit} className="drawer-form">
                <div className="form-section">
                  <h4 className="section-title">Định danh</h4>
                  <div className="form-row">
                    <div className="form-group-base">
                      <label>Mã nhà cung cấp <span className="required">*</span></label>
                      <input
                        type="text"
                        name="code"
                        className="input-base"
                        value={editingSupplier ? editingSupplier.code : generatedCode}
                        required
                        readOnly
                        style={{ 
                          textTransform: "uppercase", 
                          backgroundColor: "#f1f5f9", 
                          color: "#475569", 
                          cursor: "not-allowed" 
                        }}
                      />
                    </div>
                    <div className="form-group-base">
                      <label>Mã số thuế (MST)</label>
                      <input
                        type="text"
                        name="taxCode"
                        className="input-base"
                        placeholder="Nhập MST..."
                        defaultValue={editingSupplier?.taxCode ?? ""}
                        readOnly={isViewOnly}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group-base">
                      <label>Số ngày công nợ</label>
                      <input
                        type="number"
                        name="debtDays"
                        className="input-base"
                        placeholder="Nhập số ngày công nợ..."
                        defaultValue={editingSupplier?.debtDays ?? 0}
                        readOnly={isViewOnly}
                        min="0"
                      />
                    </div>
                    <div className="form-group-base">
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">Thông tin cơ bản</h4>
                  <div className="form-group-base full-width">
                    <label>Tên nhà cung cấp <span className="required">*</span></label>
                    <input
                      type="text"
                      name="name"
                      className="input-base"
                      placeholder="Nhập tên đầy đủ nhà cung cấp..."
                      defaultValue={editingSupplier?.name}
                      required
                      readOnly={isViewOnly}
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>
                  <div className="form-group-base full-width">
                    <label>Chính sách công nợ</label>
                    <input
                      type="text"
                      name="debtPolicy"
                      className="input-base"
                      placeholder="VD: Thanh toán sau 30 ngày..."
                      defaultValue={editingSupplier?.debtPolicy ?? ""}
                      readOnly={isViewOnly}
                    />
                  </div>
                  <div className="form-group-base full-width">
                    <label>Địa chỉ</label>
                    <textarea
                      name="address"
                      className="input-base"
                      placeholder="Số nhà, tên đường, quận/huyện, tỉnh/thành phố..."
                      style={{ height: "60px", resize: "none", textTransform: "uppercase" }}
                      defaultValue={editingSupplier?.address ?? ""}
                      readOnly={isViewOnly}
                    />
                  </div>
                  <div className="form-group-base full-width" style={{ marginTop: "10px" }}>
                    <label>Thông tin tài khoản ngân hàng</label>
                    <input
                      type="text"
                      name="bankAccountInfo"
                      className="input-base"
                      placeholder="Nhập thông tin tài khoản (Ví dụ: Techcombank - 1903...)"
                      defaultValue={editingSupplier?.bankAccountInfo ?? ""}
                      readOnly={isViewOnly}
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">Liên hệ</h4>
                  <div className="form-row">
                    <div className="form-group-base">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        className="input-base"
                        placeholder="email@supplier.com"
                        defaultValue={editingSupplier?.email ?? ""}
                        readOnly={isViewOnly}
                      />
                    </div>
                    <div className="form-group-base">
                      <label>Số điện thoại</label>
                      <input
                        type="tel"
                        name="phone"
                        className="input-base"
                        placeholder="Số điện thoại..."
                        defaultValue={editingSupplier?.phone ?? ""}
                        readOnly={isViewOnly}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              {isViewOnly ? (
                <button type="button" className="btn-base btn-primary" onClick={handleClose}>Đóng</button>
              ) : (
                <>
                  <button type="button" className="btn-base btn-outline" onClick={handleClose}>Hủy bỏ</button>
                  <button type="submit" form="supplier-form" className="btn-base btn-primary" disabled={isPending}>
                    {isPending ? "Đang xử lý..." : (editingSupplier ? "Cập nhật" : "Lưu")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {historyRecordId && (
        <HistoryModal
          tableName="Supplier"
          recordId={historyRecordId}
          onClose={() => setHistoryRecordId(null)}
        />
      )}

      {showDeleteModal && (
        <div className="confirm-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="confirm-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon-box danger">
              <Trash2 size={24} />
            </div>
            <h4 className="confirm-title" style={{ marginTop: "0.5rem" }}>Xóa nhà cung cấp</h4>
            <p className="confirm-message" style={{ margin: "1rem 0" }}>
              {hasGeneratedData ? (
                <span style={{ color: "#ef4444", fontWeight: 600, display: "block" }}>
                  ⚠️ Cảnh báo: Nhà cung cấp "{supplierToDelete?.name}" đã phát sinh dữ liệu (đơn mua hàng). Bạn có chắc chắn vẫn muốn xóa nhà cung cấp này?
                </span>
              ) : (
                <>Bạn có chắc chắn muốn xóa nhà cung cấp <strong>"{supplierToDelete?.name}"</strong>?</>
              )}
            </p>
            <div className="confirm-actions">
              <button type="button" className="confirm-btn btn-cancel" onClick={() => setShowDeleteModal(false)}>
                Hủy
              </button>
              <button type="button" className="confirm-btn btn-confirm danger" onClick={confirmDelete} disabled={isPending}>
                {isPending ? "Đang xóa..." : "Đồng ý xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
