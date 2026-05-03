"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Plus, Filter, Search, Clock } from "lucide-react";
import { createLeaveRequest, updateLeaveRequest, updateLeaveStatus } from "./actions";
import HistoryModal from "../../HistoryModal";

type LeaveRequest = {
  id: string;
  createdAt: Date;
  employeeName: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: string;
  approver: string | null;
  note: string | null;
  subReason: string | null;
  branch: string | null;
};

const REASONS = [
  "Nghỉ phép hàng năm",
  "Nghỉ việc hưởng lương",
  "Nghỉ việc không hưởng lương",
  "Nghỉ ốm đột xuất",
  "Nghỉ thai sản",
  "Tai nạn đột xuất",
  "Nghỉ khác"
];

const SUB_REASONS = [
  "Bản thân kết hôn (3 ngày)",
  "Con đẻ, con nuôi kết hôn (1 ngày)",
  "Cha đẻ, mẹ đẻ chết (3 ngày)",
  "Cha đẻ, mẹ đẻ của vợ/chồng chết (3 ngày)",
  "Vợ hoặc chồng chết (3 ngày)",
  "Con đẻ chết (3 ngày)"
];

export default function LeaveRequestTable({ 
  initialRequests,
  currentUserName,
  isAdmin,
  userRole,
  hasApprovePerm
}: { 
  initialRequests: LeaveRequest[],
  currentUserName: string,
  isAdmin: boolean,
  userRole: string,
  hasApprovePerm: boolean
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtering logic
  const filteredRequests = initialRequests.filter(req => 
    req.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    req.reason.toLowerCase().includes(search.toLowerCase()) ||
    req.status.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // canApprove is now based on specific permission
  const canApprove = hasApprovePerm;

  function handleClose() {
    setShowModal(false);
    setEditingRequest(null);
    setError(null);
    setSelectedReason("");
    formRef.current?.reset();
  }

  function handleEdit(req: LeaveRequest) {
    setEditingRequest(req);
    setSelectedReason(req.reason);
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingRequest) {
          await updateLeaveRequest(editingRequest.id, formData);
        } else {
          await createLeaveRequest(formData);
        }
        handleClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      }
    });
  }

  function handleStatusChange(id: string, newStatus: string) {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái sang "${newStatus}"?`)) return;
    startTransition(async () => {
      try {
        await updateLeaveStatus(id, newStatus);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Danh sách Đơn nghỉ phép</h3>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-outline" onClick={() => router.refresh()}>
            <RotateCcw size={18} style={{ marginRight: "6px" }} /> Làm mới
          </button>
          <button className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} style={{ marginRight: "6px" }} /> {showFilters ? "Ẩn lọc" : "Lọc"}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingRequest(null); setShowModal(true); }}>+ Thêm mới nghỉ phép</button>
        </div>
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
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th style={{ textAlign: "center" }}>Số ngày</th>
              <th>Lý do</th>
              <th>Trạng thái</th>
              <th style={{ width: "300px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRequests.map((req) => {
              const isCreator = req.employeeName === currentUserName;

              return (
                <tr key={req.id}>
                  <td style={{ fontSize: "0.85rem" }}>{new Date(req.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td style={{ fontWeight: 600 }}>{req.employeeName}</td>
                  <td>{req.branch || "—"}</td>
                  <td>{new Date(req.startDate).toLocaleDateString("vi-VN")}</td>
                  <td>{new Date(req.endDate).toLocaleDateString("vi-VN")}</td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{req.totalDays}</td>
                  <td>
                    <div>{req.reason}</div>
                    {req.subReason && <div style={{ fontSize: "0.8rem", color: "#64748b" }}>({req.subReason})</div>}
                  </td>
                  <td>
                    <span className={`badge status-${req.status.toLowerCase().replace(/\s+/g, "-")}`}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", whiteSpace: "nowrap" }}>
                      
                      {req.status === "Tạo mới" && isCreator && (
                        <>
                          <button className="btn btn-sm btn-outline" onClick={() => handleEdit(req)}>Sửa</button>
                          <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange(req.id, "Chờ phê duyệt")}>Gửi</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleStatusChange(req.id, "Đã hủy")}>Hủy</button>
                        </>
                      )}

                      {req.status === "Chờ phê duyệt" && isCreator && (
                        <button className="btn btn-sm btn-warning" onClick={() => handleStatusChange(req.id, "Tạo mới")}>Thu hồi</button>
                      )}

                      {req.status === "Chờ phê duyệt" && canApprove && (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleStatusChange(req.id, "Đã phê duyệt")}>Duyệt</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleStatusChange(req.id, "Từ chối")}>Từ chối</button>
                        </>
                      )}

                      {req.status === "Đã phê duyệt" && (
                        <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                          <Check size={14} /> Hoàn tất
                        </span>
                      )}
                      {req.status === "Đã hủy" && (
                        <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 600 }}>Đã hủy</span>
                      )}
                      <button className="btn btn-sm btn-outline" onClick={() => setHistoryRecordId(req.id)}>
                        Lịch sử
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {initialRequests.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "2.5rem", color: "#888" }}>
                  Chưa có đơn nghỉ phép nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
          <div className="card" style={{ width: "100%", maxWidth: "550px", margin: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>{editingRequest ? "✏️ Sửa Đơn nghỉ phép" : "🏖️ Tạo Đơn nghỉ phép mới"}</h3>
            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "#1e293b" }}>
                Nhân viên: <strong style={{ color: "var(--primary-color)" }}>{editingRequest?.employeeName || currentUserName}</strong>
              </p>
              <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                Ngày tạo đơn: <strong>{editingRequest ? new Date(editingRequest.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")}</strong>
              </p>
            </div>
            
            <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {error && <div style={{ color: "#e74c3c", marginBottom: "1rem", fontSize: "0.9rem" }}>⚠️ {error}</div>}
              <input type="hidden" name="employeeName" value={editingRequest?.employeeName || currentUserName} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Ngày bắt đầu *</label>
                  <input
                    type="date" name="startDate" className="form-control" required
                    defaultValue={editingRequest ? new Date(editingRequest.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Ngày kết thúc *</label>
                  <input
                    type="date" name="endDate" className="form-control" required
                    defaultValue={editingRequest ? new Date(editingRequest.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Lý do nghỉ *</label>
                <select 
                  name="reason" 
                  className="form-control" 
                  required 
                  defaultValue={editingRequest?.reason ?? ""}
                  onChange={(e) => setSelectedReason(e.target.value)}
                >
                  <option value="" disabled>-- Chọn lý do --</option>
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {selectedReason === "Nghỉ việc hưởng lương" && (
                <div>
                  <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Lý do phụ *</label>
                  <select 
                    name="subReason" 
                    className="form-control" 
                    required 
                    defaultValue={editingRequest?.subReason ?? ""}
                  >
                    <option value="" disabled>-- Chọn lý do phụ --</option>
                    {SUB_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.9rem" }}>Ghi chú</label>
                <textarea
                  name="note" className="form-control" rows={3} placeholder="Nội dung chi tiết..."
                  defaultValue={editingRequest?.note ?? ""}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" className="btn" onClick={handleClose} disabled={isPending}>Thoát</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Đang xử lý..." : editingRequest ? "✅ Cập nhật" : "💾 Lưu đơn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyRecordId && (
        <HistoryModal 
          tableName="LeaveRequest" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      <style>{`
        .status-tạo-mới { background-color: #f1f5f9; color: #64748b; }
        .status-chờ-phê-duyệt { background-color: #fef3c7; color: #92400e; }
        .status-đã-phê-duyệt { background-color: #d1fae5; color: #065f46; }
        .status-đã-hủy { background-color: #fee2e2; color: #b91c1c; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; alignItems: center; justifyContent: center; z-index: 1000; }
        .form-control { width: 100%; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 6px; outline: none; }
      `}</style>
    </>
  );
}
