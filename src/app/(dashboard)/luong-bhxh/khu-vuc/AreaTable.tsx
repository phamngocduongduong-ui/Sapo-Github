"use client";

import React, { useState } from "react";
import { Plus, Edit, Trash2, MapPin, Target, X, Check } from "lucide-react";
import { upsertCheckInArea, deleteCheckInArea } from "./actions";

export default function AreaTable({ initialData }: { initialData: any[] }) {
  const [areas, setAreas] = useState(initialData);
  const [showModal, setShowModal] = useState(false);
  const [currentArea, setCurrentArea] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = (area: any = null) => {
    setCurrentArea(area || { name: "", address: "", latitude: "", longitude: "", radius: 100 });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await upsertCheckInArea(currentArea);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa khu vực này?")) {
      await deleteCheckInArea(id);
      window.location.reload();
    }
  };

  return (
    <div className="area-management">
      <div className="page-header">
        <div className="header-left">
          <h1>Danh mục Khu vực Chấm công</h1>
          <p>Quản lý các vị trí và bán kính cho phép chấm công</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Thêm khu vực mới
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Tên khu vực</th>
                <th>Địa chỉ</th>
                <th>Tọa độ (Lat, Lng)</th>
                <th>Bán kính (m)</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {areas.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Chưa có dữ liệu khu vực</td></tr>
              ) : (
                areas.map(area => (
                  <tr key={area.id}>
                    <td style={{ fontWeight: 600 }}>{area.name}</td>
                    <td>{area.address || "—"}</td>
                    <td>
                      <div className="coord-badge">
                        <MapPin size={12} /> {area.latitude.toFixed(4)}, {area.longitude.toFixed(4)}
                      </div>
                    </td>
                    <td>
                      <div className="radius-badge">
                        <Target size={12} /> {area.radius}m
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${area.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                        {area.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn-icon edit" onClick={() => handleOpenModal(area)}><Edit size={16} /></button>
                        <button className="btn-icon delete" onClick={() => handleDelete(area.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{currentArea.id ? "Sửa khu vực" : "Thêm khu vực mới"}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full">
                  <label>Tên khu vực <span className="required">*</span></label>
                  <input 
                    type="text" 
                    value={currentArea.name} 
                    onChange={e => setCurrentArea({...currentArea, name: e.target.value})}
                    required
                    placeholder="VD: Văn phòng chính"
                  />
                </div>
                <div className="form-group full">
                  <label>Địa chỉ</label>
                  <input 
                    type="text" 
                    value={currentArea.address} 
                    onChange={e => setCurrentArea({...currentArea, address: e.target.value})}
                    placeholder="Địa chỉ cụ thể"
                  />
                </div>
                <div className="form-group full">
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-full"
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
                    <MapPin size={16} /> Lấy vị trí hiện tại của tôi
                  </button>
                </div>
                <div className="form-group">
                  <label>Vĩ độ (Latitude) <span className="required">*</span></label>
                  <input 
                    type="number" 
                    step="any"
                    value={currentArea.latitude} 
                    onChange={e => setCurrentArea({...currentArea, latitude: e.target.value})}
                    required
                    placeholder="VD: 10.1234"
                  />
                </div>
                <div className="form-group">
                  <label>Kinh độ (Longitude) <span className="required">*</span></label>
                  <input 
                    type="number" 
                    step="any"
                    value={currentArea.longitude} 
                    onChange={e => setCurrentArea({...currentArea, longitude: e.target.value})}
                    required
                    placeholder="VD: 106.1234"
                  />
                </div>
                <div className="form-group">
                  <label>Bán kính cho phép (m) <span className="required">*</span></label>
                  <input 
                    type="number" 
                    value={currentArea.radius} 
                    onChange={e => setCurrentArea({...currentArea, radius: e.target.value})}
                    required
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Trạng thái</label>
                  <select 
                    value={currentArea.status} 
                    onChange={e => setCurrentArea({...currentArea, status: e.target.value})}
                  >
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Tạm dừng</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : "Lưu khu vực"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .area-management { animation: fadeIn 0.4s ease-out; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .header-left h1 { margin: 0; font-size: 1.75rem; color: #1e293b; }
        .header-left p { margin: 0.5rem 0 0; color: #64748b; }

        .coord-badge, .radius-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #f1f5f9;
          border-radius: 20px;
          font-size: 0.85rem;
          color: #475569;
          font-weight: 500;
        }

        .status-pill {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-pill.active { background: #f0fdf4; color: #166534; }
        .status-pill.inactive { background: #fef2f2; color: #991b1b; }

        .actions-cell { display: flex; gap: 0.5rem; }
        .btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon.edit:hover { color: #3b82f6; border-color: #3b82f6; background: #eff6ff; }
        .btn-icon.delete:hover { color: #ef4444; border-color: #ef4444; background: #fef2f2; }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: #fff;
          width: 600px;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        .modal-header { padding: 1.5rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h3 { margin: 0; }
        .close-btn { background: none; border: none; cursor: pointer; color: #94a3b8; }

        .form-grid { padding: 1.5rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
        .form-group.full { grid-column: span 2; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #475569; }
        .form-group input, .form-group select {
          width: 100%;
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 0.9rem;
        }
        .required { color: #ef4444; }

        .btn-secondary { background: #fff; border: 1px solid #e2e8f0; color: #475569; }
        .btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }
        .btn-full { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; padding: 0.75rem; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
