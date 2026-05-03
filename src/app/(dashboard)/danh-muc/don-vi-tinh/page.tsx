"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getUnits, createUnit, updateUnit, updateUnitStatus, deleteUnit } from "./actions";
import HistoryModal from "../../HistoryModal";

export default function UnitPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  
  // History state
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const data = await getUnits();
    setItems(data);
  }

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        if (editingItem) {
          await updateUnit(editingItem.id, formData);
        } else {
          await createUnit(formData);
        }
        setIsModalOpen(false);
        fetchData();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleStatusUpdate = (id: string, status: string) => {
    startTransition(async () => {
      await updateUnitStatus(id, status);
      fetchData();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa đơn vị tính này?")) return;
    startTransition(async () => {
      await deleteUnit(id);
      fetchData();
    });
  };

  const openAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  return (
    <div style={{ padding: "2rem", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>📏 Danh mục Đơn vị tính</h1>
          <p style={{ color: "#64748b", marginTop: "0.5rem" }}>Quản lý các loại đơn vị tính trong hệ thống</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-outline" onClick={fetchData}>Làm mới</button>
          <button className="btn btn-primary" onClick={openAddModal}>Thêm mới</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input 
            type="text" 
            placeholder="Tìm theo mã, tên đơn vị..." 
            className="input" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ padding: "0" }}>
        <div className="table-container" style={{ margin: 0, borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "150px" }}>Mã đơn vị</th>
                <th>Tên đơn vị</th>
                <th>Ghi chú</th>
                <th style={{ width: "150px" }}>Trạng thái</th>
                <th style={{ width: "400px", textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#888" }}>Chưa có dữ liệu</td></tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.code}</td>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td style={{ color: "#64748b", fontSize: "0.9rem" }}>{item.note || "—"}</td>
                    <td>
                      <span className={`badge ${item.status === "Hoạt động" ? "badge-success" : "badge-danger"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEditModal(item)}>Sửa</button>
                        {item.status === "Ngưng hoạt động" ? (
                          <button className="btn btn-outline btn-sm" style={{ color: "#2ecc71" }} onClick={() => handleStatusUpdate(item.id, "Hoạt động")}>Kích hoạt</button>
                        ) : (
                          <button className="btn btn-outline btn-sm" style={{ color: "#e74c3c" }} onClick={() => handleStatusUpdate(item.id, "Ngưng hoạt động")}>Hủy kích hoạt</button>
                        )}
                        <button className="btn btn-outline btn-sm" style={{ color: "#94a3b8" }} onClick={() => handleDelete(item.id)}>Xóa</button>
                        <button className="btn btn-outline btn-sm" onClick={() => setHistoryRecordId(item.id)}>Lịch sử</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", margin: "1rem" }}>
            <h3 style={{ marginBottom: "1.5rem" }}>{editingItem ? "Chỉnh sửa đơn vị tính" : "Thêm đơn vị tính mới"}</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Mã đơn vị *</label>
                <input type="text" name="code" className="input" required defaultValue={editingItem?.code || ""} placeholder="Ví dụ: PCS" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Tên đơn vị *</label>
                <input type="text" name="name" className="input" required defaultValue={editingItem?.name || ""} placeholder="Ví dụ: Cái" />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Trạng thái</label>
                <select name="status" className="input" defaultValue={editingItem?.status || "Hoạt động"}>
                  <option value="Hoạt động">Hoạt động</option>
                  <option value="Ngưng hoạt động">Ngưng hoạt động</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>Ghi chú</label>
                <textarea name="note" className="input" style={{ height: "80px" }} defaultValue={editingItem?.note || ""} placeholder="Nhập ghi chú..."></textarea>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Đang lưu..." : (editingItem ? "Cập nhật" : "Thêm mới")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyRecordId && (
        <HistoryModal 
          tableName="Unit" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}
    </div>
  );
}
