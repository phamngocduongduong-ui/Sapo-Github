"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil, Search, Filter, RotateCcw, Plus,
  MoreHorizontal, History, User, Globe, MapPin,
  Type, Info, Hash, FileSpreadsheet, Upload, Download,
  Trash2
} from "lucide-react";
import {
  generateNextCustomerCode,
  deleteCustomer,
  toggleCustomerStatus,
  createCustomer,
  updateCustomer
} from "./actions";
import HistoryModal from "@/app/(dashboard)/HistoryModal";

type Customer = {
  id: string;
  code: string;
  name: string;
  abbreviation: string | null;
  classification: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string | null;
};

export default function CustomerTable({
  initialCustomers,
  countries
}: {
  initialCustomers: Customer[],
  countries: string[]
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("down");
  const [searchTerm, setSearchTerm] = useState("");
  const [classification, setClassification] = useState("Quốc tế");
  const [generatedCode, setGeneratedCode] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.abbreviation || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.country || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCountryFlag = (countryName: string) => {
    const flags: { [key: string]: string } = {
      "Việt Nam": "🇻🇳",
      "Hàn Quốc": "🇰🇷",
      "Nhật Bản": "🇯🇵",
      "Mỹ": "🇺🇸",
      "Trung Quốc": "🇨🇳",
      "Đức": "🇩🇪",
      "Anh": "🇬🇧",
      "Pháp": "🇫🇷",
      "Singapore": "🇸🇬",
      "Thái Lan": "🇹🇭"
    };
    return flags[countryName] || "🏳️";
  };

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!editingCustomer) {
      generateNextCustomerCode(classification).then(code => {
        setGeneratedCode(code);
      });
    }
  }, [classification, editingCustomer]);

  function handleClose() {
    setShowModal(false);
    setEditingCustomer(null);
    setError(null);
    setClassification("Trong nước");
  }

  function handleEdit(customer: Customer) {
    setEditingCustomer(customer);
    setClassification(customer.classification || "Quốc tế");
    setShowModal(true);
  }

  function handleAddNew() {
    setEditingCustomer(null);
    setClassification("Quốc tế"); // Default for new
    setError(null);
    setShowModal(true);
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa khách hàng "${name}"?`)) return;

    startTransition(async () => {
      try {
        await deleteCustomer(id);
        router.refresh();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Có lỗi xảy ra khi xóa.");
      }
    });
  };

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        if (editingCustomer) {
          await updateCustomer(editingCustomer.id, formData);
        } else {
          await createCustomer(formData);
        }
        handleClose();
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      }
    });
  }

  return (
    <>
      {/* Header Toolbar */}
      <div className="base-toolbar">
        <div className="toolbar-left">
          <h3 className="page-title-base">👥 Danh sách khách hàng</h3>
          <span className="badge-count">{customers.length}</span>
          <div className="search-box-base">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm khách hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-base btn-outline">
            <Filter size={18} />
          </button>
        </div>
        <div className="toolbar-right">
          <button className="btn-base btn-outline" title="Tải file mẫu">
            <FileSpreadsheet size={18} />
          </button>
          <button className="btn-base btn-outline" title="Import Excel">
            <Upload size={18} />
          </button>
          <button className="btn-base btn-outline" title="Xuất file Excel">
            <Download size={18} />
          </button>
          <button className="btn-base btn-primary" onClick={handleAddNew}>
            <Plus size={18} style={{ marginRight: "6px" }} /> Thêm mới
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="base-table-wrapper">
        <table className="base-table" style={{ tableLayout: "fixed", width: "100%" }}>
          <thead>
            <tr>
              <th className="th-first" style={{ width: "50px", textAlign: "center" }}>STT</th>
              <th style={{ width: "90px", textAlign: "center" }}>Mã KH</th>
              <th style={{ width: "250px", textAlign: "center" }}>Tên khách hàng</th>
              <th style={{ width: "80px", textAlign: "center" }}>Tên viết tắt</th>
              <th style={{ width: "130px", textAlign: "center" }}>Quốc gia</th>
              <th style={{ textAlign: "center" }}>Địa chỉ</th>
              <th style={{ width: "130px", textAlign: "center" }}>Trạng thái</th>
              <th className="th-last" style={{ width: "80px", textAlign: "right" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCustomers.map((customer, index) => (
              <tr key={customer.id}>
                <td style={{ textAlign: "center", color: "#64748b" }}>
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </td>
                <td style={{ textAlign: "center" }}>
                  <span className="code-pill">{customer.code}</span>
                </td>
                <td style={{ fontWeight: 600, color: "#1e293b" }}>
                  <div 
                    title={customer.name}
                    style={{ 
                      maxWidth: "250px", 
                      overflow: "hidden", 
                      textOverflow: "ellipsis", 
                      whiteSpace: "nowrap" 
                    }}
                  >
                    {customer.name}
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div 
                    title={customer.abbreviation || ""}
                    style={{ 
                      maxWidth: "80px", 
                      overflow: "hidden", 
                      textOverflow: "ellipsis", 
                      whiteSpace: "nowrap" 
                    }}
                  >
                    {customer.abbreviation || "—"}
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div 
                    title={customer.country || ""}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      gap: "6px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{getCountryFlag(customer.country || "")}</span>
                    <span style={{ fontSize: "0.85rem", color: "#475569", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {customer.country || "—"}
                    </span>
                  </div>
                </td>
                <td>
                  <div
                    title={customer.address || ""}
                    style={{
                      maxWidth: "590px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#64748b"
                    }}
                  >
                    {customer.address || "—"}
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    backgroundColor: (customer.status || "Hoạt động") === "Hoạt động" ? "#f0fdf4" : "#fef2f2",
                    color: (customer.status || "Hoạt động") === "Hoạt động" ? "#15803d" : "#b91c1c",
                    border: `1px solid ${(customer.status || "Hoạt động") === "Hoạt động" ? "#bcf0da" : "#fecaca"}`
                  }}>
                    {customer.status || "Hoạt động"}
                  </span>
                </td>
                <td style={{ textAlign: "right", position: "relative" }}>
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      setDropdownDirection(spaceBelow < 180 ? "up" : "down");
                      setOpenMenuId(openMenuId === customer.id ? null : customer.id);
                    }}
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {openMenuId === customer.id && (
                    <div className={`action-dropdown ${dropdownDirection === "up" ? "open-up" : ""}`} onClick={(e) => e.stopPropagation()}>
                      <div className="dropdown-item" onClick={() => { handleEdit(customer); setOpenMenuId(null); }}>
                        <Pencil size={14} /> Chỉnh sửa
                      </div>
                      <div className="dropdown-item" onClick={() => { setHistoryRecordId(customer.id); setOpenMenuId(null); }}>
                        <History size={14} /> Lịch sử
                      </div>
                      <div 
                        className="dropdown-item" 
                        style={{ color: (customer.status || "Hoạt động") === "Hoạt động" ? "#dc2626" : "#16a34a" }}
                        onClick={async () => { 
                          setOpenMenuId(null);
                          await toggleCustomerStatus(customer.id, customer.status || "Hoạt động");
                        }}
                      >
                        { (customer.status || "Hoạt động") === "Hoạt động" ? (
                          <><Info size={14} /> Ngưng kích hoạt</>
                        ) : (
                          <><Plus size={14} /> Kích hoạt</>
                        )}
                      </div>
                      <div className="divider"></div>
                      <div className="dropdown-item danger" onClick={() => { handleDelete(customer.id, customer.name); setOpenMenuId(null); }}>
                        <Trash2 size={14} /> Xóa khách hàng
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                    <Info size={40} strokeWidth={1.5} />
                    <span>Không tìm thấy khách hàng nào khớp với tìm kiếm</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="base-pagination">
          <div className="pagination-info">
            Hiển thị <strong>{paginatedCustomers.length}</strong> / {filteredCustomers.length} khách hàng
          </div>
          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Trước
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
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

      {/* Side Drawer for Add/Edit */}
      {showModal && (
        <div className="drawer-overlay" onClick={handleClose}>
          <div className="drawer-content animate-drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="header-titles">
                <h3>{editingCustomer ? "✏️ Hiệu chỉnh khách hàng" : "👥 Thêm khách hàng mới"}</h3>
                <p className="header-sub">Danh mục khách hàng • {editingCustomer ? editingCustomer.code : "Mới"}</p>
              </div>
              <button onClick={handleClose} className="drawer-close-btn">&times;</button>
            </div>

            <div className="drawer-body">
              {error && <div className="error-alert">⚠️ {error}</div>}

              <form id="customer-form" action={handleSubmit} className="drawer-form">
                {/* Section: Phân loại & Định danh */}
                <div className="form-section">
                  <h4 className="section-title">Phân loại & Định danh</h4>
                  <div className="form-row">
                    <div className="form-group-base">
                      <label>Phân loại <span className="required">*</span></label>
                      <select
                        name="classification"
                        className="input-base"
                        value={classification}
                        onChange={(e) => setClassification(e.target.value)}
                        disabled={!!editingCustomer}
                      >
                        <option value="Quốc tế">Quốc tế</option>
                        <option value="Trong nước">Trong nước</option>
                      </select>
                    </div>
                    <div className="form-group-base">
                      <label>Mã khách hàng</label>
                      <input
                        type="text"
                        name="code"
                        className="input-base readonly"
                        value={editingCustomer ? editingCustomer.code : generatedCode}
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Thông tin khách hàng */}
                <div className="form-section">
                  <h4 className="section-title">Thông tin cơ bản</h4>
                  <div className="form-group-base full-width">
                    <label>Tên khách hàng <span className="required">*</span></label>
                    <input
                      type="text"
                      name="name"
                      className="input-base"
                      placeholder="Nhập tên đầy đủ khách hàng..."
                      defaultValue={editingCustomer?.name}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group-base">
                      <label>Tên viết tắt <span className="required">*</span></label>
                      <input
                        type="text"
                        name="abbreviation"
                        className="input-base"
                        placeholder="VD: ABC"
                        defaultValue={editingCustomer?.abbreviation ?? ""}
                        required
                      />
                    </div>
                    <div className="form-group-base">
                      <label>Quốc gia <span className="required">*</span></label>
                      <select
                        name="country"
                        className="input-base"
                        defaultValue={editingCustomer?.country ?? "Việt Nam"}
                        required
                      >
                        <option value="">-- Chọn quốc gia --</option>
                        {countries.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        {!countries.includes("Việt Nam") && <option value="Việt Nam">Việt Nam</option>}
                      </select>
                    </div>
                  </div>
                  <div className="form-group-base full-width">
                    <label>Địa chỉ</label>
                    <textarea
                      name="address"
                      className="input-base"
                      placeholder="Số nhà, tên đường, phường/xã..."
                      style={{ height: "80px", resize: "none" }}
                      defaultValue={editingCustomer?.address ?? ""}
                    />
                  </div>
                </div>

                {/* Section: Liên hệ */}
                <div className="form-section">
                  <h4 className="section-title">Liên hệ</h4>
                  <div className="form-row">
                    <div className="form-group-base">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        className="input-base"
                        placeholder="email@company.com"
                        defaultValue={editingCustomer?.email ?? ""}
                      />
                    </div>
                    <div className="form-group-base">
                      <label>Số điện thoại</label>
                      <input
                        type="tel"
                        name="phone"
                        className="input-base"
                        placeholder="09xxx..."
                        defaultValue={editingCustomer?.phone ?? ""}
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="drawer-footer">
              <button type="button" className="btn-base btn-outline" onClick={handleClose}>Hủy bỏ</button>
              <button type="submit" form="customer-form" className="btn-base btn-primary" disabled={isPending}>
                {isPending ? "Đang xử lý..." : (editingCustomer ? "Cập nhật khách hàng" : "Lưu khách hàng")}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyRecordId && (
        <HistoryModal
          tableName="Customer"
          recordId={historyRecordId}
          onClose={() => setHistoryRecordId(null)}
        />
      )}
    </>
  );
}
