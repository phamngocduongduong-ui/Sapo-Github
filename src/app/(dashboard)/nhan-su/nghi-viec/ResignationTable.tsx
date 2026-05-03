"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, Send, RotateCcw, X, Plus, Filter, Search } from "lucide-react";
import HistoryModal from "../../HistoryModal";
import { createResignation, updateResignation, updateResignationStatus } from "./actions";

interface ResignationTableProps {
  initialData: any[];
  employees: any[];
  canApprove: boolean;
  currentUserName: string;
  currentUserBranch: string;
}

export default function ResignationTable({ initialData, employees, canApprove, currentUserName, currentUserBranch }: ResignationTableProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtering logic
  const filteredData = data.filter(item => 
    item.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    item.reason.toLowerCase().includes(search.toLowerCase()) ||
    item.status.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);

  const REASONS = [
    "Hoàn cảnh gia đình",
    "Thay đổi môi trường mới",
    "Thay đổi nơi ở mới",
    "Đi học tiếp",
    "Công việc không phù hợp",
    "Môi trường không phù hợp",
    "Thu nhập và phúc lợi không tốt",
    "Nghỉ thai sản",
    "Nghỉ khác"
  ];

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái thành ${newStatus}?`)) return;
    
    startTransition(async () => {
      try {
        await updateResignationStatus(id, newStatus);
        router.refresh();
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
        <button 
          onClick={() => router.refresh()} 
          className="btn btn-outline" 
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <RotateCcw size={18} /> Làm mới
        </button>
        <button className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowFilters(!showFilters)} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Filter size={18} /> {showFilters ? "Ẩn lọc" : "Lọc"}
        </button>
        <button 
          onClick={() => {
            setEditingItem(null);
            setSelectedReasons([]);
            setIsModalOpen(true);
          }} 
          className="btn btn-primary" 
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <Plus size={18} /> Đăng ký
        </button>
      </div>

      {showFilters && (
        <div style={{ marginBottom: "1.5rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "400px" }}>
            <Search size={18} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#888" }} />
            <input 
              type="text" 
              placeholder="Tìm theo tên NV, lý do..." 
              className="form-control" 
              style={{ paddingLeft: "2.5rem" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Ngày tạo</th>
              <th>Nhân viên</th>
              <th>Chi nhánh</th>
              <th>Ngày nghỉ việc</th>
              <th>Lý do</th>
              <th>Trạng thái</th>
              <th style={{ width: "320px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</td>
                <td style={{ fontWeight: 600 }}>{item.employeeName}</td>
                <td>{item.branch || "—"}</td>
                <td>{new Date(item.resignationDate).toLocaleDateString("vi-VN")}</td>
                <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.reason}>{item.reason}</td>
                <td>
                  <span className={`badge ${
                    item.status === "Đã phê duyệt" ? "badge-success" : 
                    item.status === "Chờ phê duyệt" ? "badge-warning" : 
                    item.status === "Đã hủy" ? "badge-danger" : "badge-info"
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "0.35rem", justifyContent: "center", flexWrap: "nowrap" }}>
                    {item.status === "Tạo mới" && (
                      <>
                        <button className="btn btn-sm btn-outline" onClick={() => {
                          setEditingItem(item);
                          setSelectedReasons(item.reason.split(", "));
                          setIsModalOpen(true);
                        }}>Sửa</button>
                        <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange(item.id, "Chờ phê duyệt")}>Gửi</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleStatusChange(item.id, "Đã hủy")}>Hủy</button>
                      </>
                    )}
                    {item.status === "Chờ phê duyệt" && (
                      <>
                        <button className="btn btn-sm btn-warning" onClick={() => handleStatusChange(item.id, "Tạo mới")}>Thu hồi</button>
                        {canApprove && (
                          <button className="btn btn-sm btn-success" onClick={() => handleStatusChange(item.id, "Đã phê duyệt")}>Duyệt</button>
                        )}
                      </>
                    )}
                    {item.status === "Đã phê duyệt" && (
                      <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                        <Check size={14} /> Hoàn tất
                      </span>
                    )}
                    {item.status === "Đã hủy" && (
                      <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 600 }}>Đã hủy</span>
                    )}
                    <button 
                      className="btn btn-sm btn-outline" 
                      onClick={() => setHistoryRecordId(item.id)}
                      title="Lịch sử thay đổi"
                    >
                      Lịch sử
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>Chưa có yêu cầu nào.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {historyRecordId && (
        <HistoryModal 
          tableName="Resignation" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
          <button 
            className="btn btn-sm btn-outline" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Trước
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button 
              key={i} 
              className={`btn btn-sm ${currentPage === i + 1 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button 
            className="btn btn-sm btn-outline" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Sau
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px", margin: "1rem" }}>
            <div className="modal-header" style={{ marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ margin: 0 }}>{editingItem ? "✏️ Sửa yêu cầu nghỉ việc" : "📄 Đăng ký nghỉ việc"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon"><X size={20} /></button>
            </div>

            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#1e293b" }}>
                Nhân viên: <strong style={{ color: "var(--primary-color)" }}>{editingItem?.employeeName || currentUserName}</strong>
              </p>
              <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                Ngày tạo đơn: <strong>{editingItem ? new Date(editingItem.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")}</strong>
              </p>
            </div>

            <form action={async (formData) => {
              formData.set("reason", selectedReasons.join(", "));
              try {
                if (editingItem) {
                  await updateResignation(editingItem.id, formData);
                } else {
                  await createResignation(formData);
                }
                setIsModalOpen(false);
                router.refresh();
              } catch (error: any) {
                alert(error.message);
              }
            }}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: 0 }}>
                <input type="hidden" name="employeeName" value={editingItem?.employeeName || currentUserName} />
                <input type="hidden" name="branch" value={editingItem?.branch || currentUserBranch} />

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <label style={{ width: "150px", fontWeight: 600, fontSize: "0.9rem" }}>Ngày nghỉ việc *</label>
                  <input 
                    type="date" 
                    name="resignationDate" 
                    className="input" 
                    required 
                    style={{ flex: 1 }} 
                    defaultValue={editingItem ? new Date(editingItem.resignationDate).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} 
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Lý do (Chọn nhiều) *</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", padding: "0.75rem", background: "#f8fafc", borderRadius: "0.5rem", border: "1px solid #e2e8f0" }}>
                    {REASONS.map(r => (
                      <label key={r} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                        <input 
                          type="checkbox" 
                          checked={selectedReasons.includes(r)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedReasons([...selectedReasons, r]);
                            else setSelectedReasons(selectedReasons.filter(sr => sr !== r));
                          }}
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                  <input type="hidden" name="reason" value={selectedReasons.join(", ")} />
                </div>

                <div>
                  <label style={{ fontWeight: 600, display: "block", marginBottom: "0.4rem", fontSize: "0.9rem" }}>Ghi chú</label>
                  <textarea 
                    name="note" 
                    className="input" 
                    style={{ width: "100%", minHeight: "80px", padding: "0.75rem" }} 
                    placeholder="Ghi chú thêm (nếu có)" 
                    defaultValue={editingItem?.note || ""}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">Thoát</button>
                <button type="submit" className="btn btn-primary" disabled={selectedReasons.length === 0}>
                  {editingItem ? "✅ Cập nhật" : "💾 Lưu đơn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
