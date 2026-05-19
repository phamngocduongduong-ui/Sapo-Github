"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Send, RotateCcw, Check, X, Filter, Search, Plus, MoreHorizontal, History, Mail, CheckCircle, PowerOff, Clock, User } from "lucide-react";
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
  leaveCode?: string | null;
};

const REASONS = [
  "Nghỉ phép hàng năm",
  "Nghỉ việc hưởng lương",
  "Nghỉ việc không hưởng lương"
];

const SUB_REASONS_HUONG_LUONG = [
  "Bản thân kết hôn",
  "Con đẻ, con nuôi kết hôn",
  "Cha đẻ, mẹ đẻ chết",
  "Cha đẻ, mẹ đẻ của vợ/chồng chết",
  "Vợ hoặc chồng chết",
  "Con đẻ chết"
];

const SUB_REASONS_KHONG_HUONG_LUONG = [
  "nghỉ ốm đột xuất",
  "tai nạn đột xuất",
  "nghỉ khác"
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
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<{ [key: string]: string }>({});
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (editingRequest) {
      setStartDate(new Date(editingRequest.startDate).toISOString().split('T')[0]);
      setEndDate(new Date(editingRequest.endDate).toISOString().split('T')[0]);
      setCustomValues({
        reason: editingRequest.reason,
        subReason: editingRequest.subReason || ""
      });
      setSelectedReason(editingRequest.reason);
    } else {
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date().toISOString().split('T')[0]);
      setCustomValues({});
      setSelectedReason("");
    }
  }, [editingRequest]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustom = (name: string, value: string) => {
    setCustomValues(prev => ({ ...prev, [name]: value }));
    if (name === "reason") {
      setSelectedReason(value);
      setCustomValues(prev => ({ ...prev, subReason: "" })); // Reset subReason when reason changes
    }
    setOpenDropdown(null);
  };
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("down");
  const [confirmUpdate, setConfirmUpdate] = useState<{ id: string, status: string, info: string } | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

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
  const paginatedData = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // canApprove is now based on specific permission
  const canApprove = hasApprovePerm;

  // Personal stats for the logged-in user
  const personalRequests = initialRequests.filter(r => r.employeeName === currentUserName);
  const usedDays = personalRequests
    .filter(r => r.status === "Đã phê duyệt")
    .reduce((sum, r) => sum + r.totalDays, 0);
  const pendingDays = personalRequests
    .filter(r => r.status === "Chờ phê duyệt")
    .reduce((sum, r) => sum + r.totalDays, 0);
  const totalAnnualLeave = 12; // Standard annual leave

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

  function handleStatusChange(id: string, newStatus: string, info?: string) {
    setConfirmUpdate({ id, status: newStatus, info: info || "" });
  }

  function executeStatusChange() {
    if (!confirmUpdate) return;
    const { id, status: newStatus } = confirmUpdate;
    setConfirmUpdate(null);
    startTransition(async () => {
      try {
        await updateLeaveStatus(id, newStatus);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      }
    });
  }

  const handleDelete = (id: string) => {
    setCancelRequestId(id);
    setShowCancelModal(true);
  };

  const confirmCancel = () => {
    if (!cancelRequestId) return;
    startTransition(async () => {
      const result = await updateLeaveStatus(cancelRequestId, "Đã hủy");
      // @ts-ignore
      if (result?.success || true) {
        setShowCancelModal(false);
        setCancelRequestId(null);
        router.refresh();
      } else {
        // @ts-ignore
        alert(result.error);
      }
    });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .base-toolbar {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 0.75rem !important;
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
        .page-title-base {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: #1e293b !important;
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          margin: 0 !important;
        }
        .badge-count {
          background: #e2e8f0 !important;
          color: #475569 !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          padding: 2px 8px !important;
          border-radius: 999px !important;
          margin-left: 0.25rem !important;
        }
        .base-table-wrapper {
          max-height: 435px !important;
          height: auto !important;
          overflow-y: auto !important;
          padding-bottom: 60px !important;
        }
        .base-table {
          height: auto !important;
        }
        .base-table th {
          background: #f1f5f9 !important;
          padding: 0px 0.75rem !important;
          font-weight: 700 !important;
          color: #334155 !important;
          border-bottom: 1px solid #e0e6ed !important;
          text-align: center !important;
          height: 35px !important;
        }
        .base-table td {
          padding: 0px 0.75rem !important;
          vertical-align: middle !important;
        }
        .base-table tbody tr {
          height: 40px !important;
        }
      ` }} />
      {/* Base-style Leave Summary Dashboard - Compact */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="base-card" style={{ padding: "1rem", background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #2563eb" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Tổng phép năm</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.25rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>{totalAnnualLeave}</span>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>ngày</span>
          </div>
        </div>
        <div className="base-card" style={{ padding: "1rem", background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #10b981" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Đã sử dụng (Đã duyệt)</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.25rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10b981" }}>{usedDays}</span>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>ngày</span>
          </div>
        </div>
        <div className="base-card" style={{ padding: "1rem", background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #f59e0b" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Đang chờ duyệt</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.25rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f59e0b" }}>{pendingDays}</span>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>ngày</span>
          </div>
        </div>
        <div className="base-card" style={{ padding: "1rem", background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #6366f1" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Số dư khả dụng</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.25rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#2563eb" }}>{totalAnnualLeave - usedDays}</span>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>ngày</span>
          </div>
        </div>
      </div>

      {/* Toolbar - Synced with EmployeeTable */}
      <div className="base-toolbar">
        <div className="toolbar-left">
          <h3 className="page-title-base">🏖️ Danh sách nghỉ phép</h3>
          <span className="badge-count">{initialRequests.length}</span>
          <div className="search-box-base">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn-base btn-outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} />
          </button>
        </div>
        <div className="toolbar-right">
          <button
            className="btn-base btn-primary"
            onClick={() => { setEditingRequest(null); setShowModal(true); }}
          >
            <Plus size={18} style={{ marginRight: "6px" }} /> Thêm mới
          </button>
        </div>
      </div>

      <div className="base-table-wrapper">
        <table className="base-table" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th className="th-first" style={{ width: "50px", textAlign: "center" }}>STT</th>
              <th style={{ width: "100px" }}>Mã/Số</th>
              <th style={{ width: "180px" }}>Nhân viên</th>
              <th style={{ width: "95px" }}>Ngày tạo</th>
              <th style={{ width: "180px" }}>Thời gian nghỉ</th>
              <th style={{ width: "85px", textAlign: "center" }}>Số ngày</th>
              <th style={{ width: "180px" }}>Lý do</th>
              <th style={{ width: "125px" }}>Trạng thái</th>
              <th className="th-last" style={{ textAlign: "right", width: "50px" }}></th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((req, index) => {
              const avatarChar = req.employeeName.split(" ").pop()?.charAt(0) || "U";
              const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
              const avatarColor = colors[req.employeeName.length % colors.length];
              const isCreator = req.employeeName === currentUserName;
              const canApprove = hasApprovePerm;

              return (
                <tr key={req.id} className="table-row-hover">
                  <td className="td-first" style={{ textAlign: "center", color: "#64748b" }}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="code-pill">{req.leaveCode || `NP-${req.id.slice(-6).toUpperCase()}`}</span>
                  </td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={req.employeeName}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", whiteSpace: "nowrap", overflow: "hidden" }}>
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: `${avatarColor}15`,
                        color: avatarColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        flexShrink: 0
                      }}>
                        {req.employeeName.split(" ").pop()?.charAt(0)}
                      </div>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{req.employeeName}</div>
                        <div style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{req.branch || "Phòng nhân sự"}</div>
                      </div>
                    </div>
                  </td>
                  <td>{new Date(req.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {new Date(req.startDate).toLocaleDateString("vi-VN")} - {new Date(req.endDate).toLocaleDateString("vi-VN")}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{ fontWeight: 800, color: "#2563eb", background: "#eff6ff", padding: "2px 8px", borderRadius: "12px", fontSize: "12px" }}>{req.totalDays}</span>
                  </td>
                  <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#64748b" }} title={req.reason}>
                    {req.reason}
                  </td>
                  <td>
                    <span className={`status-pill ${req.status === "Đã phê duyệt" ? "status-active" :
                        req.status === "Chờ phê duyệt" ? "status-pending" :
                          (req.status === "Từ chối" || req.status === "Đã hủy") ? "status-inactive" : "status-new"
                      }`}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", position: "relative", zIndex: openMenuId === req.id ? 50 : 1 }}>
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const isLastRows = index >= paginatedData.length - 2;
                        const isFirstRow = index === 0;
                        setDropdownDirection((isLastRows && !isFirstRow) ? "up" : "down");
                        setOpenMenuId(openMenuId === req.id ? null : req.id);
                      }}
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {openMenuId === req.id && (
                      <div className={`action-dropdown ${dropdownDirection === "up" ? "open-up" : ""}`}
                        style={{
                          top: dropdownDirection === "up" ? "auto" : "100%",
                          bottom: dropdownDirection === "up" ? "100%" : "auto",
                          marginTop: dropdownDirection === "up" ? "0" : "4px",
                          marginBottom: dropdownDirection === "up" ? "8px" : "0",
                          zIndex: 1000
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(req.status === "Tạo mới") && isCreator && (
                          <div className="dropdown-item" onClick={() => { handleEdit(req); setOpenMenuId(null); }}>
                            <Pencil size={14} /> Chỉnh sửa
                          </div>
                        )}
                        <div className="dropdown-item" onClick={() => { setHistoryRecordId(req.id); setOpenMenuId(null); }}>
                          <History size={14} /> Lịch sử
                        </div>

                        {(req.status === "Tạo mới") && isCreator && (
                          <>
                            <div className="dropdown-item success" onClick={() => handleStatusChange(req.id, "Chờ phê duyệt", `của NV ${req.employeeName}`)}>
                              <Mail size={14} /> Gửi duyệt
                            </div>
                            <div className="dropdown-item danger" onClick={() => { handleDelete(req.id); setOpenMenuId(null); }}>
                              <PowerOff size={14} /> Hủy đơn
                            </div>
                          </>
                        )}

                        {req.status === "Chờ phê duyệt" && isCreator && (
                          <div className="dropdown-item warning" onClick={() => handleStatusChange(req.id, "Tạo mới", `của NV ${req.employeeName}`)}>
                            <RotateCcw size={14} /> Thu hồi
                          </div>
                        )}

                        {req.status === "Chờ phê duyệt" && canApprove && (
                          <>
                            <div className="dropdown-item success" onClick={() => handleStatusChange(req.id, "Đã phê duyệt", `của NV ${req.employeeName}`)}>
                              <CheckCircle size={14} /> Duyệt đơn
                            </div>
                            <div className="dropdown-item danger" onClick={() => handleStatusChange(req.id, "Từ chối", `của NV ${req.employeeName}`)}>
                              <PowerOff size={14} /> Từ chối
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {initialRequests.length === 0 && (
              <tr style={{ height: "45px" }}>
                <td colSpan={9} style={{ textAlign: "center", color: "#64748b", verticalAlign: "middle", height: "45px" }}>
                  Chưa có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="base-pagination">
          <div className="pagination-info">
            Hiển thị <strong>{paginatedData.length}</strong> / {filteredRequests.length} đề xuất
          </div>
          <div className="pagination-controls">
            <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>Trước</button>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i} className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`} onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
            ))}
            <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>Sau</button>
          </div>
        </div>
      )}

      {/* Base-style Add/Edit Modal */}
      {/* Modern Side Drawer for Add/Edit */}
      {showModal && (
        <div className="drawer-overlay" onClick={handleClose}>
          <div className="drawer-content animate-drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="header-titles">
                <h3>{editingRequest ? "✏️ Cập nhật đề xuất" : "🏖️ Khởi tạo đề xuất nghỉ phép"}</h3>
                <div className="header-sub">
                  NGƯỜI GỬI: <span style={{ color: "#2563eb" }}>{editingRequest ? editingRequest.employeeName : currentUserName}</span>
                </div>
              </div>
              <button onClick={handleClose} className="drawer-close-btn">&times;</button>
            </div>

            <div className="drawer-body">
              {error && <div style={{ color: "#ef4444", marginBottom: "0.75rem", padding: "0.5rem 0.75rem", background: "#fef2f2", borderRadius: "8px", fontSize: "13px", border: "1px solid #fee2e2" }}>⚠️ {error}</div>}

              {new Date(endDate) < new Date(startDate) && (
                <div style={{ color: "#ef4444", marginBottom: "0.75rem", fontWeight: 700, fontSize: "13px" }}>
                  ⚠️ Ngày kết thúc không hợp lệ
                </div>
              )}

              <form ref={formRef} onSubmit={handleSubmit} className="drawer-form" style={{ gap: "1rem" }}>
                <input type="hidden" name="employeeName" value={editingRequest?.employeeName || currentUserName} />

                {/* Employee Info Section */}
                <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.4rem", letterSpacing: "0.05em", fontFamily: "'Segoe UI', sans-serif" }}>Người đề xuất</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                      {(editingRequest?.employeeName || currentUserName).split(" ").pop()?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "13px" }}>{editingRequest?.employeeName || currentUserName}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>Ngày gửi: {editingRequest ? new Date(editingRequest.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "0.4rem", textTransform: "uppercase", fontFamily: "'Segoe UI', sans-serif" }}>Ngày bắt đầu *</label>
                    <input
                      type="date"
                      name="startDate"
                      className="input-base"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "0.4rem", textTransform: "uppercase", fontFamily: "'Segoe UI', sans-serif" }}>Ngày kết thúc *</label>
                    <input
                      type="date"
                      name="endDate"
                      className="input-base"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ border: new Date(endDate) < new Date(startDate) ? "1px solid #ef4444" : undefined }}
                    />
                  </div>
                </div>

                {/* Custom Reason Dropdown */}
                <div ref={dropdownRef}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "0.4rem", textTransform: "uppercase", fontFamily: "'Segoe UI', sans-serif" }}>Lý do nghỉ phép *</label>
                  <div style={{ position: "relative" }}>
                    <div
                      onClick={() => setOpenDropdown(openDropdown === "reason" ? null : "reason")}
                      className="input-base"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        cursor: "pointer", background: "#fff", height: "38px"
                      }}
                    >
                      <span>{customValues["reason"] || "-- Chọn lý do nghỉ phép --"}</span>
                      <MoreHorizontal size={16} color="#94a3b8" />
                    </div>
                    <input type="hidden" name="reason" value={customValues["reason"] || ""} required />

                    {openDropdown === "reason" && (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px",
                        background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", zIndex: 50,
                        overflow: "hidden", padding: "4px"
                      }}>
                        {REASONS.map(r => (
                          <div
                            key={r}
                            onMouseEnter={() => setHoveredOption(r)}
                            onMouseLeave={() => setHoveredOption(null)}
                            onClick={() => handleSelectCustom("reason", r)}
                            style={{
                              padding: "8px 12px", fontSize: "13px", borderRadius: "8px",
                              cursor: "pointer", transition: "all 0.2s",
                              background: hoveredOption === r ? "#f1f5f9" : "transparent",
                              color: hoveredOption === r ? "#2563eb" : "#475569"
                            }}
                          >
                            {r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {(selectedReason === "Nghỉ việc hưởng lương" || selectedReason === "Nghỉ việc không hưởng lương") && (
                  <div style={{ animation: "fadeIn 0.3s ease" }}>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "0.4rem", textTransform: "uppercase", fontFamily: "'Segoe UI', sans-serif" }}>Lý do chi tiết *</label>
                    <div style={{ position: "relative" }}>
                      <div
                        onClick={() => setOpenDropdown(openDropdown === "subReason" ? null : "subReason")}
                        className="input-base"
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          cursor: "pointer", background: "#fffbeb", height: "38px", border: "1px solid #fde68a"
                        }}
                      >
                        <span>{customValues["subReason"] || "-- Chọn lý do chi tiết --"}</span>
                        <MoreHorizontal size={16} color="#d97706" />
                      </div>
                      <input type="hidden" name="subReason" value={customValues["subReason"] || ""} required />

                      {openDropdown === "subReason" && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, right: 0, marginTop: "4px",
                          background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)", zIndex: 100,
                          overflow: "hidden", padding: "4px"
                        }}>
                          {(selectedReason === "Nghỉ việc hưởng lương" ? SUB_REASONS_HUONG_LUONG : SUB_REASONS_KHONG_HUONG_LUONG).map(r => (
                            <div
                              key={r}
                              onMouseEnter={() => setHoveredOption(r)}
                              onMouseLeave={() => setHoveredOption(null)}
                              onClick={() => handleSelectCustom("subReason", r)}
                              style={{
                                padding: "8px 12px", fontSize: "13px", borderRadius: "8px",
                                cursor: "pointer", transition: "all 0.2s",
                                background: hoveredOption === r ? "#fffbeb" : "transparent",
                                color: hoveredOption === r ? "#d97706" : "#475569"
                              }}
                            >
                              {r}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "0.4rem", textTransform: "uppercase", fontFamily: "'Segoe UI', sans-serif" }}>Ghi chú / Nội dung chi tiết</label>
                  <textarea
                    name="note"
                    className="input-base"
                    rows={2}
                    placeholder="Nhập nội dung bàn giao công việc hoặc ghi chú thêm..."
                    defaultValue={editingRequest?.note ?? ""}
                    style={{ resize: "vertical", minHeight: "60px" }}
                  />
                </div>

                <div style={{
                  marginTop: "auto",
                  paddingTop: "1rem",
                  borderTop: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.75rem"
                }}>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="btn-base btn-outline"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn-base btn-primary"
                    disabled={isPending || new Date(endDate) < new Date(startDate)}
                  >
                    {isPending ? "⏳ Đang xử lý..." : (editingRequest ? "✅ Cập nhật" : "🚀 Gửi đề xuất")}
                  </button>
                </div>
              </form>
            </div>
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

      {/* Custom Confirmation Modal */}
      {confirmUpdate && (
        <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
          <div className="modal-content-base" style={{ maxWidth: "450px", textAlign: "center", padding: "2rem" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#fff7ed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              color: "#f97316"
            }}>
              <Clock size={32} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#1e293b", textAlign: "center", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? "Gửi phê duyệt" :
                confirmUpdate.status === "Tạo mới" ? "Thu hồi hồ sơ" :
                  confirmUpdate.status === "Đã phê duyệt" ? "Phê duyệt hồ sơ" :
                    "Xác nhận thay đổi"}
            </h3>
            <div style={{ color: "#475569", marginBottom: "2rem", lineHeight: "1.6", textAlign: "center", padding: "0 0.5rem", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc muốn gửi hồ sơ để chờ phê duyệt không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                    <PowerOff size={16} /> Đơn sẽ không được chỉnh sửa trong thời gian chờ phê duyệt.
                  </p>
                </>
              ) : confirmUpdate.status === "Tạo mới" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc chắn muốn thu hồi hồ sơ không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                    <RotateCcw size={16} /> Hồ sơ sẽ không trong danh sách chờ phê duyệt.
                  </p>
                </>
              ) : confirmUpdate.status === "Đã phê duyệt" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc chắn đồng ý phê duyệt không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                    <Check size={16} /> Hồ sơ sẽ có giá trị kể từ thời điểm phê duyệt.
                  </p>
                </>
              ) : (
                <p>Bạn có chắc chắn muốn chuyển trạng thái đơn này sang <strong>"{confirmUpdate.status}"</strong> không?</p>
              )}
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmUpdate(null)}>Hủy bỏ</button>
              <button className="btn btn-primary" style={{ flex: 1, background: confirmUpdate.status === "Từ chối" || confirmUpdate.status === "Đã hủy" ? "#ef4444" : "#2563eb" }} onClick={executeStatusChange}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Cancel Confirmation Modal */}
      {showCancelModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.65)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease"
        }}>
          <div style={{
            width: "100%", maxWidth: "400px", background: "#fff",
            borderRadius: "16px", overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            animation: "slideUp 0.3s ease"
          }}>
            <div style={{ padding: "1.5rem", textAlign: "center" }}>
              <div style={{
                width: "60px", height: "60px", borderRadius: "50%", background: "#fee2e2",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 1.25rem", color: "#ef4444"
              }}>
                <Trash2 size={30} />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem", fontFamily: "'Segoe UI', sans-serif" }}>
                Hủy hồ sơ
              </h3>
              <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "0.5rem", fontFamily: "'Segoe UI', sans-serif" }}>
                Bạn có chắc hủy hồ sơ này không?
              </p>
              <div style={{
                background: "#fef2f2", padding: "0.75rem", borderRadius: "8px",
                border: "1px solid #fee2e2", color: "#b91c1c", fontSize: "13px",
                fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
              }}>
                <PowerOff size={14} />
                Hồ sơ sẽ không còn giá trị sau khi hủy
              </div>
            </div>

            <div style={{
              padding: "1rem 1.5rem", background: "#f8fafc",
              display: "flex", gap: "1rem", borderTop: "1px solid #f1f5f9"
            }}>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  flex: 1, height: "42px", borderRadius: "10px", border: "1px solid #e2e8f0",
                  background: "#fff", fontWeight: 600, color: "#475569", cursor: "pointer",
                  fontSize: "14px", transition: "all 0.2s"
                }}
              >
                Giữ lại
              </button>
              <button
                onClick={confirmCancel}
                disabled={isPending}
                style={{
                  flex: 1, height: "42px", borderRadius: "10px", border: "none",
                  background: "#ef4444", fontWeight: 700, color: "#fff", cursor: "pointer",
                  fontSize: "14px", boxShadow: "0 4px 6px -1px rgba(239, 68, 68, 0.2)",
                  transition: "all 0.2s"
                }}
              >
                {isPending ? "Đang xử lý..." : "Hủy hồ sơ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const STATUS_MAP: any = {
  "Tạo mới": { label: "Tạo mới", class: "status-tạo-mới" },
  "Chờ phê duyệt": { label: "Chờ phê duyệt", class: "status-chờ-phê-duyệt" },
  "Đã phê duyệt": { label: "Đã phê duyệt", class: "status-đã-phê-duyệt" },
  "Đã hủy": { label: "Đã hủy", class: "status-đã-hủy" },
  "Từ chối": { label: "Từ chối", class: "status-đã-hủy" },
};

