"use client";
import { useState, useTransition } from "react";
import { createDepartment, updateDepartment, updateDepartmentStatus } from "./actions";
import HistoryModal from "../../HistoryModal";
import { Clock } from "lucide-react";

type Department = {
  id: string;
  code: string;
  name: string;
  status: string;
  note: string | null;
  createdAt: Date;
};

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  ACTIVE: { label: "Hoạt động", badge: "badge-success" },
  INACTIVE: { label: "Ngưng hoạt động", badge: "badge-danger" },
};

export default function DepartmentTable({ initialDepartments }: { initialDepartments: Department[] }) {
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  function handleClose() {
    setShowModal(false);
    setEditingDept(null);
    setError(null);
  }

  function handleEdit(dept: Department) {
    setEditingDept(dept);
    setShowModal(true);
  }

  function handleStatusUpdate(id: string, newStatus: string) {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái bộ phận này?`)) return;
    startTransition(async () => {
      try {
        await updateDepartmentStatus(id, newStatus);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingDept) {
          await updateDepartment(editingDept.id, formData);
        } else {
          await createDepartment(formData);
        }
        handleClose();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Danh mục Bộ phận</h3>
        <button className="btn btn-primary" onClick={() => { setEditingDept(null); setShowModal(true); }}>+ Thêm bộ phận</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "50px" }}>STT</th>
              <th>Mã bộ phận</th>
              <th>Tên bộ phận</th>
              <th>Trạng thái</th>
              <th>Ghi chú</th>
              <th style={{ textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {initialDepartments.map((dept, idx) => {
              const st = STATUS_MAP[dept.status] ?? { label: dept.status, badge: "badge-warning" };
              return (
                <tr key={dept.id}>
                  <td>{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{dept.code}</td>
                  <td>{dept.name}</td>
                  <td><span className={`badge ${st.badge}`}>{st.label}</span></td>
                  <td>{dept.note ?? "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                      <button className="btn btn-sm" onClick={() => handleEdit(dept)} style={{ background: "#f39c12", color: "#fff", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}>Sửa</button>
                      
                      {dept.status === "ACTIVE" ? (
                        <button className="btn btn-sm" onClick={() => handleStatusUpdate(dept.id, "INACTIVE")} style={{ background: "#e74c3c", color: "#fff", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}>Hủy</button>
                      ) : (
                        <button className="btn btn-sm" onClick={() => handleStatusUpdate(dept.id, "ACTIVE")} style={{ background: "#27ae60", color: "#fff", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}>Kích hoạt</button>
                      )}
                        <button 
                          className="btn btn-sm btn-outline" 
                          onClick={() => setHistoryRecordId(dept.id)}
                          title="Lịch sử thay đổi"
                        >
                          Lịch sử
                        </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {historyRecordId && (
        <HistoryModal 
          tableName="Department" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", margin: "1rem" }}>
            <h3>{editingDept ? "✏️ Sửa Bộ phận" : "🏢 Thêm Bộ phận mới"}</h3>
            {error && <div className="alert alert-danger" style={{ marginBottom: "1rem" }}>{error}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label>Mã bộ phận *</label>
                <input type="text" name="code" className="input" defaultValue={editingDept?.code} disabled={!!editingDept} required />
              </div>
              <div>
                <label>Tên bộ phận *</label>
                <input type="text" name="name" className="input" defaultValue={editingDept?.name} required />
              </div>
              <div>
                <label>Ghi chú</label>
                <textarea name="note" className="input" rows={3} defaultValue={editingDept?.note ?? ""}></textarea>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn" onClick={handleClose}>Thoát</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Đang lưu..." : "💾 Lưu thông tin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
