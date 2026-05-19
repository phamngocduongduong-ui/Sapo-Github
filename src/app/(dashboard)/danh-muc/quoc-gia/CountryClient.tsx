"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCountry, updateCountry, deleteCountry } from "./actions";
import HistoryModal from "../../HistoryModal";
import { 
  Pencil, Trash2, History, Plus, RotateCcw, 
  Globe, Hash, Type, Info, AlertTriangle, CheckCircle2, Search,
  FileSpreadsheet, Upload, Download
} from "lucide-react";

type Country = {
  id: string;
  code: string;
  name: string;
};

export default function CountryClient({ initialCountries }: { initialCountries: Country[] }) {
  const router = useRouter();
  const [countries, setCountries] = useState(initialCountries);
  const [showModal, setShowModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCountries(initialCountries);
  }, [initialCountries]);

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCountries.length / itemsPerPage);
  const paginatedCountries = filteredCountries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  function handleEdit(country: Country) {
    setEditingCountry(country);
    setError(null);
    setShowModal(true);
  }

  function handleAddNew() {
    setEditingCountry(null);
    setError(null);
    setShowModal(true);
    // Focus the first input after a short delay
    setTimeout(() => {
      const codeInput = document.querySelector('input[name="code"]') as HTMLInputElement;
      if (codeInput) codeInput.focus();
    }, 100);
  }

  function handleReset() {
    setError(null);
    formRef.current?.reset();
  }

  function handleClose() {
    setShowModal(false);
    setEditingCountry(null);
    setError(null);
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        if (editingCountry) {
          await updateCountry(editingCountry.id, formData);
        } else {
          await createCountry(formData);
        }
        handleClose();
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      }
    });
  }

  async function handleDelete(id: string, name: string) {
    if (confirm(`Bạn có chắc chắn muốn xóa quốc gia "${name}"?`)) {
      startTransition(async () => {
        try {
          await deleteCountry(id);
          router.refresh();
        } catch (err: unknown) {
          alert(err instanceof Error ? err.message : "Không thể xóa quốc gia này.");
        }
      });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", paddingBottom: "1rem" }}>
      {/* Toolbar */}
      <div className="base-toolbar" style={{ marginBottom: "0.5rem" }}>
        <div className="toolbar-left">
          <h3 className="page-title-base">🌍 Danh mục Quốc gia</h3>
          <span className="badge-count">{initialCountries.length}</span>
          <div className="search-box-base">
            <Search size={16} className="search-icon" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input 
              type="text" 
              placeholder="Tìm kiếm quốc gia..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "35px" }}
            />
          </div>
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

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Left: Form */}
        <div className="card" style={{ padding: "1.25rem", position: "sticky", top: "10px" }}>
          <div style={{ marginBottom: "1rem" }}>
            <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              {editingCountry ? <Pencil size={17} /> : <Plus size={17} />}
              {editingCountry ? "Cập nhật quốc gia" : "Thêm quốc gia mới"}
            </h4>
            <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
              {editingCountry ? `Đang chỉnh sửa: ${editingCountry.code}` : "Nhập thông tin quốc gia vào các trường dưới đây"}
            </p>
          </div>

          {error && (
            <div className="error-alert" style={{ marginBottom: "1rem" }}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <form ref={formRef} onSubmit={handleFormSubmit} className="drawer-form" style={{ padding: 0 }} key={editingCountry?.id || 'new'}>
            <div className="form-group-base full-width">
              <label>Mã quốc gia <span className="required">*</span></label>
              <input 
                type="text" 
                name="code" 
                className="input-base" 
                defaultValue={editingCountry?.code || ""}
                placeholder="VD: VN, US, JP..." 
                required 
              />
            </div>

            <div className="form-group-base full-width" style={{ marginTop: "0.75rem" }}>
              <label>Tên quốc gia <span className="required">*</span></label>
              <input 
                type="text" 
                name="name" 
                className="input-base" 
                defaultValue={editingCountry?.name || ""}
                placeholder="VD: Việt Nam, Hoa Kỳ..." 
                required 
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
              <button 
                type="button" 
                className="btn-base btn-outline" 
                style={{ flex: 1 }}
                onClick={handleReset}
              >
                <RotateCcw size={16} /> Làm lại
              </button>
              <button 
                type="submit" 
                className="btn-base btn-primary" 
                style={{ flex: 1.5 }}
                disabled={isPending}
              >
                {isPending ? "Đang xử lý..." : (editingCountry ? "Cập nhật" : "Lưu quốc gia")}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Table Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div className="base-table-wrapper">
          <table className="base-table">
            <thead>
              <tr>
                <th className="th-first" style={{ width: "60px", textAlign: "center", padding: "6px 10px", lineHeight: "1" }}>STT</th>
                <th style={{ width: "150px", padding: "6px 10px", lineHeight: "1" }}>Mã quốc gia</th>
                <th style={{ padding: "6px 10px", lineHeight: "1" }}>Tên quốc gia</th>
                <th className="th-last" style={{ width: "120px", textAlign: "right", padding: "6px 10px", lineHeight: "1" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCountries.map((country, index) => (
                <tr key={country.id}>
                  <td style={{ textAlign: "center", color: "#64748b", padding: "4px 10px", lineHeight: "1.2" }}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td style={{ padding: "4px 10px", lineHeight: "1.2" }}>
                    <span className="code-pill" style={{ background: "#e0f2fe", color: "#0369a1", fontWeight: 600 }}>
                      {country.code}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "#1e293b", textAlign: "center", padding: "4px 10px", lineHeight: "1.2" }}>{country.name}</td>
                  <td style={{ textAlign: "right", padding: "4px 10px", lineHeight: "1.2" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "4px" }}>
                      <button 
                        className="action-btn" 
                        title="Chỉnh sửa"
                        onClick={() => handleEdit(country)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        className="action-btn" 
                        title="Lịch sử"
                        onClick={() => setHistoryRecordId(country.id)}
                      >
                        <History size={16} />
                      </button>
                      <button 
                        className="action-btn" 
                        title="Xóa"
                        style={{ color: "#ef4444" }}
                        onClick={() => handleDelete(country.id, country.name)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCountries.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                      <Info size={40} strokeWidth={1.5} />
                      <span>Không tìm thấy quốc gia nào</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="base-pagination" style={{ marginTop: "0" }}>
              <div className="pagination-info">
                Hiển thị <strong>{paginatedCountries.length}</strong> / {filteredCountries.length} quốc gia
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
        </div>
      </div>

      {/* Side Drawer for Add/Edit */}
      {showModal && (
        <div className="drawer-overlay" onClick={handleClose}>
          <div className="drawer-content animate-drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="header-titles">
                <h3>{editingCountry ? "✏️ Hiệu chỉnh quốc gia" : "🌍 Thêm quốc gia mới"}</h3>
                <p className="header-sub">Danh mục quốc gia • {editingCountry ? editingCountry.code : "Mới"}</p>
              </div>
              <button onClick={handleClose} className="drawer-close-btn">&times;</button>
            </div>

            <div className="drawer-body">
              {error && <div className="error-alert">⚠️ {error}</div>}

              <form id="country-form" onSubmit={handleFormSubmit} className="drawer-form">
                <div className="form-section">
                  <h4 className="section-title">Thông tin cơ bản</h4>
                  <div className="form-group-base full-width">
                    <label>Mã quốc gia <span className="required">*</span></label>
                    <input 
                      type="text" 
                      name="code" 
                      className="input-base" 
                      defaultValue={editingCountry?.code || ""}
                      placeholder="VD: VN, US, JP..." 
                      required 
                    />
                  </div>

                  <div className="form-group-base full-width" style={{ marginTop: "1rem" }}>
                    <label>Tên quốc gia <span className="required">*</span></label>
                    <input 
                      type="text" 
                      name="name"
                      className="input-base"
                      defaultValue={editingCountry?.name || ""}
                      placeholder="Tên đầy đủ của quốc gia"
                      required
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="drawer-footer">
              <button type="button" className="btn-base btn-outline" onClick={handleClose}>Hủy bỏ</button>
              <button type="submit" form="country-form" className="btn-base btn-primary" disabled={isPending}>
                {isPending ? "Đang xử lý..." : (editingCountry ? "Cập nhật" : "Lưu quốc gia")}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyRecordId && (
        <HistoryModal 
          tableName="Country" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}
    </div>
  );
}
