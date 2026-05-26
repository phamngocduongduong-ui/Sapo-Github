"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, Trash2, Edit2, Loader2, Calendar, LogIn, MoreHorizontal, Eye, Pencil, PowerOff, AlertTriangle } from "lucide-react";

interface Location {
  id: string;
  row: string;
  bin: string;
  level: string;
  capacity: number;
  note: string | null;
  status: string;
}

export default function LocationCategory() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("down");
  const [isAdmin, setIsAdmin] = useState(false);

  const [formData, setFormData] = useState({
    row: "",
    bin: "",
    level: "",
    capacity: 900,
    note: "",
    status: "ACTIVE"
  });

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/warehouse/finished-goods/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetch("/api/user-permissions")
      .then(res => res.json())
      .then(data => setIsAdmin(data.isAdmin || false))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const handleAddNew = () => {
    setEditingLocation(null);
    setFormData({ row: "", bin: "", level: "", capacity: 900, note: "", status: "ACTIVE" });
    setIsViewOnly(false);
    setIsModalOpen(true);
  };

  const handleEdit = (loc: Location) => {
    setEditingLocation(loc);
    setFormData({
      row: loc.row,
      bin: loc.bin,
      level: loc.level,
      capacity: loc.capacity,
      note: loc.note || "",
      status: loc.status
    });
    setIsViewOnly(false);
    setIsModalOpen(true);
  };

  const handleView = (loc: Location) => {
    setEditingLocation(loc);
    setFormData({
      row: loc.row,
      bin: loc.bin,
      level: loc.level,
      capacity: loc.capacity,
      note: loc.note || "",
      status: loc.status
    });
    setIsViewOnly(true);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingLocation(null);
    setIsViewOnly(false);
    setError("");
  };

  const downloadTemplate = () => {
    const headers = ["Day (Row)", "O (Bin)", "Tang (Level)", "Suc chua (Capacity)", "Trang thai (Status)"];
    const rows = [
      ["A", "01", "1", "1000", "Hoạt động"],
      ["A", "01", "2", "1000", "Hoạt động"],
      ["B", "01", "1", "2000", "Hoạt động"]
    ];
    let csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "mau_nhap_vi_tri.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        
        // Basic check for binary content (often seen in XLSX)
        if (text.includes("\ufffd") || text.slice(0, 4) === "PK\x03\x04") {
          alert("Dường như bạn đang upload file Excel (.xlsx). Vui lòng 'Save As' file thành định dạng CSV (Comma delimited) trước khi import.");
          setImporting(false);
          return;
        }

        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        
        const data = lines.slice(1).map((line, idx) => {
          // Robust delimiter detection (Comma, Semicolon, or Tab)
          let delimiter = ",";
          if (line.includes(";")) delimiter = ";";
          else if (line.includes("\t")) delimiter = "\t";
          
          const parts = line.split(delimiter).map(p => {
            // Remove quotes if present
            return p.replace(/^["']|["']$/g, '').trim();
          });

          return {
            row: parts[0],
            bin: parts[1],
            level: parts[2],
            capacity: parseFloat(parts[3]) || 900,
            status: parts[4] || "ACTIVE"
          };
        }).filter(item => item.row && item.bin);

        if (data.length === 0) {
          console.log("Raw text snippet:", text.slice(0, 100));
          alert("Không tìm thấy dữ liệu hợp lệ. Hãy đảm bảo bạn đã lưu file ở định dạng CSV và các cột Dãy, Ô, Tầng có dữ liệu.");
          setImporting(false);
          return;
        }

        console.log("Processed import data:", data);

        const res = await fetch("/api/warehouse/finished-goods/locations/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locations: data })
        });

        if (res.ok) {
          alert("Import thành công!");
          fetchLocations();
        } else {
          const err = await res.json();
          alert("Import thất bại: " + (err.error || "Lỗi không xác định"));
        }
      } catch (err) {
        alert("Lỗi khi xử lý file!");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const url = "/api/warehouse/finished-goods/locations";
      const method = editingLocation ? "PUT" : "POST";
      const bodyData = editingLocation ? { id: editingLocation.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData)
      });

      if (res.ok) {
        handleClose();
        fetchLocations();
      } else {
        const data = await res.json();
        setError(data.error || "Có lỗi xảy ra khi lưu vị trí");
      }
    } catch (err) {
      setError("Không thể kết nối đến máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (loc: Location) => {
    const newStatus = loc.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!confirm(`Bạn có chắc chắn muốn ${newStatus === "ACTIVE" ? "ngưng kích hoạt" : "kích hoạt"} vị trí này?`)) return;
    try {
      const res = await fetch("/api/warehouse/finished-goods/locations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: loc.id,
          row: loc.row,
          bin: loc.bin,
          level: loc.level,
          capacity: loc.capacity,
          note: loc.note,
          status: newStatus
        })
      });
      if (res.ok) {
        fetchLocations();
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi thay đổi trạng thái");
      }
    } catch (err) {
      alert("Không thể kết nối đến máy chủ");
    }
  };

  const handleDelete = async (loc: Location) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vị trí ${loc.row}-${loc.bin}-${loc.level}?`)) return;
    try {
      const res = await fetch(`/api/warehouse/finished-goods/locations?id=${loc.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchLocations();
      } else {
        const data = await res.json();
        alert(data.error || "Lỗi khi xóa vị trí");
      }
    } catch (err) {
      alert("Không thể kết nối đến máy chủ");
    }
  };

  const [selectedRow, setSelectedRow] = useState("Tất cả");
  const rows = ["Tất cả", ...Array.from(new Set(locations.map(loc => loc.row))).sort()];

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = `${loc.row}-${loc.bin}-${loc.level}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRow = selectedRow === "Tất cả" || loc.row === selectedRow;
    return matchesSearch && matchesRow;
  });

  return (
    <div className="container">
      <style dangerouslySetInnerHTML={{ __html: `
        .mobile-blocked-message {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-blocked-message {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 2.5rem 1.5rem;
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            margin: 20px auto;
            max-width: 400px;
            font-family: "Segoe UI", -apple-system, sans-serif;
          }
          .warning-icon-wrapper {
            background-color: #fef3c7;
            padding: 1rem;
            border-radius: 50%;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .blocked-title {
            color: #0f172a;
            font-size: 1.1rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .blocked-desc {
            color: #475569;
            font-size: 0.9rem;
            line-height: 1.5;
            margin: 0;
          }
          .location-page-content {
            display: none !important;
          }
        }
      ` }} />

      <div className="mobile-blocked-message">
        <div className="warning-icon-wrapper">
          <AlertTriangle size={48} style={{ color: "#f59e0b" }} />
        </div>
        <h3 className="blocked-title">Không hỗ trợ trên điện thoại</h3>
        <p className="blocked-desc">
          Danh mục <strong>Vị trí kho</strong> yêu cầu màn hình lớn để hiển thị sơ đồ và thao tác chính xác. Vui lòng truy cập tính năng này bằng máy tính (PC / Laptop).
        </p>
      </div>

      <div className="location-page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 className="page-title">Danh mục Vị trí kho</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={downloadTemplate}>
            <Calendar size={18} style={{ marginRight: '0.5rem' }} /> Tải file mẫu
          </button>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={importing} style={{ backgroundColor: 'var(--success-color)', borderColor: 'var(--success-color)' }}>
            {importing ? <Loader2 className="spin" size={18} /> : <LogIn size={18} style={{ marginRight: '0.5rem' }} />}
            Import Excel
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept=".csv,.xlsx" 
            onChange={handleImport} 
          />
          <button className="btn btn-primary" onClick={handleAddNew}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            Thêm vị trí
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {rows.map(row => (
            <button
              key={row}
              className={`btn ${selectedRow === row ? 'btn-primary' : 'btn-outline'}`}
              style={{ minWidth: '80px' }}
              onClick={() => setSelectedRow(row)}
            >
              {row}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Dãy (Row)</th>
              <th>Ô (Bin)</th>
              <th>Tầng (Level)</th>
              <th>Mã vị trí</th>
              <th>Sức chứa</th>
              <th>Ghi chú</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                  <Loader2 className="spin" />
                </td>
              </tr>
            ) : filteredLocations.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>Không có dữ liệu</td>
              </tr>
            ) : filteredLocations.map((loc, index) => (
              <tr key={loc.id}>
                <td>{index + 1}</td>
                <td>{loc.row}</td>
                <td>{loc.bin}</td>
                <td>{loc.level}</td>
                <td><span className="badge badge-info">{loc.row}-{loc.bin}-{loc.level}</span></td>
                <td><strong>{loc.capacity?.toLocaleString() || 900}</strong></td>
                <td>{loc.note}</td>
                <td>
                  <span className={`badge ${loc.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                    {loc.status === 'ACTIVE' ? 'Hoạt động' : 'Khóa'}
                  </span>
                </td>
                <td style={{ textAlign: "right", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const isLastRows = index >= filteredLocations.length - 2;
                        const isFirstRow = index === 0;
                        setDropdownDirection((isLastRows && !isFirstRow) ? "up" : "down");
                        setOpenMenuId(openMenuId === loc.id ? null : loc.id);
                      }}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  {openMenuId === loc.id && (
                    <div className={`horizontal-action-dropdown ${dropdownDirection === "up" ? "open-up" : ""}`} style={{ right: "calc(50% - 80px)" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="icon-action-btn"
                        title="Xem"
                        onClick={() => { handleView(loc); setOpenMenuId(null); }}
                      >
                        <Eye size={15} style={{ color: "#3b82f6" }} />
                      </button>

                      <button
                        type="button"
                        className="icon-action-btn"
                        title="Chỉnh sửa"
                        onClick={() => { handleEdit(loc); setOpenMenuId(null); }}
                      >
                        <Pencil size={15} style={{ color: "#d97706" }} />
                      </button>

                      <button
                        type="button"
                        className="icon-action-btn"
                        title={loc.status === "ACTIVE" ? "Ngưng kích hoạt" : "Kích hoạt"}
                        onClick={() => { handleStatusToggle(loc); setOpenMenuId(null); }}
                      >
                        <PowerOff size={15} style={{ color: loc.status === "ACTIVE" ? "#64748b" : "#22c55e" }} />
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          className="icon-action-btn danger"
                          title="Xóa"
                          onClick={() => { handleDelete(loc); setOpenMenuId(null); }}
                        >
                          <Trash2 size={15} style={{ color: "#ef4444" }} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                {isViewOnly ? "👁️ Chi tiết vị trí" : (editingLocation ? "✏️ Sửa vị trí" : "Thêm vị trí mới")}
              </h2>
              <button type="button" onClick={handleClose}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
                
                <div className="form-group">
                  <label>Dãy (Row)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="VD: A, B, C..."
                    value={formData.row}
                    onChange={(e) => setFormData({...formData, row: e.target.value.toUpperCase()})}
                    disabled={isViewOnly || !!editingLocation}
                  />
                </div>
                <div className="form-group">
                  <label>Ô (Bin) - Dạng văn bản</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="VD: 01, 01.01, A1..."
                    value={formData.bin}
                    onChange={(e) => setFormData({...formData, bin: e.target.value})}
                    disabled={isViewOnly || !!editingLocation}
                  />
                </div>
                <div className="form-group">
                  <label>Tầng (Level)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="VD: T1, T2..."
                    value={formData.level}
                    onChange={(e) => setFormData({...formData, level: e.target.value.toUpperCase()})}
                    disabled={isViewOnly || !!editingLocation}
                  />
                </div>
                <div className="form-group">
                  <label>Sức chứa (Capacity)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    required 
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
                    disabled={isViewOnly}
                  />
                </div>
                <div className="form-group">
                  <label>Trạng thái</label>
                  <select 
                    className="form-control" 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    disabled={isViewOnly}
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Khóa</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea 
                    className="form-control" 
                    rows={3}
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                    disabled={isViewOnly}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={handleClose}>{isViewOnly ? "Đóng" : "Hủy"}</button>
                {!isViewOnly && (
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <Loader2 className="spin" size={18} /> : "Lưu vị trí"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
