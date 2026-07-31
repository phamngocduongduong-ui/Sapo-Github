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

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

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
        .base-table-wrapper {
          height: auto !important;
          min-height: unset !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          padding-bottom: 0px !important;
          background: #fff !important;
          border-radius: 8px !important;
          border: 1px solid #e0e6ed !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
          width: 100% !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          table-layout: auto !important;
          border-collapse: collapse !important;
          font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;
          font-size: 13px !important;
        }
        .base-table input,
        .base-table select,
        .base-table button,
        .base-table table,
        .base-table td,
        .base-table th {
          font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;
          font-size: 13px !important;
        }
        .base-table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          background: #f1f5f9 !important;
          border-bottom: 2px solid #ff5c00 !important;
          text-align: center !important;
          height: 35px !important;
          padding: 6px 10px !important;
          font-size: 13px !important;
        }
        .base-table td {
          padding: 6px 0.75rem !important;
          vertical-align: middle !important;
          color: #000000 !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
        .base-table tbody tr:hover {
          background-color: #f8fafc !important;
        }
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
          padding-top: 5px !important;
          padding-bottom: 5px !important;
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
        @media (max-width: 640px) {
          .leave-summary-grid {
            display: none !important;
          }
          .base-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.5rem !important;
          }
          .toolbar-left {
            width: 100% !important;
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
          }
          .search-box-base {
            flex: 1 !important;
            min-width: 140px !important;
          }
          .toolbar-right {
            width: 100% !important;
          }
          .toolbar-right .btn-primary {
            width: 100% !important;
            justify-content: center !important;
            height: 38px !important;
          }
          .desktop-only-table {
            display: none !important;
          }
          .mobile-leave-cards-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            margin-top: 0.5rem !important;
            padding-bottom: 60px !important;
          }
          .proposal-card {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 10px !important;
            padding: 12px 16px !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            user-select: none !important;
          }
          .proposal-card:hover {
            background: #f8fafc !important;
          }
          .card-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .card-header {
            border-bottom: 1px solid #f1f5f9 !important;
            padding-bottom: 6px !important;
            margin-bottom: 8px !important;
          }
          .code-box {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
          }
          .idx-pill {
            background: #f1f5f9 !important;
            color: #475569 !important;
            font-size: 13px !important;
            font-weight: 700 !important;
            padding: 2px 7px !important;
            border-radius: 5px !important;
          }
          .proposal-code {
            font-size: 15px !important;
            font-weight: 700 !important;
            color: #003466 !important;
          }
          .card-body {
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
          }
          .info-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            font-size: 13px !important;
          }
          .info-label {
            color: #64748b !important;
            font-weight: 500 !important;
          }
          .info-val {
            color: #000 !important;
            font-weight: 700 !important;
            text-align: right !important;
          }
          .status-pill {
            font-weight: 700 !important;
            font-size: 13px !important;
          }
        }
        @media (min-width: 641px) {
          .mobile-leave-cards-container {
            display: none !important;
          }
          .desktop-only-table {
            display: block !important;
          }
        }
          .info-label {
            color: #64748b !important;
            font-weight: 500 !important;
          }
          .info-val {
            color: #000 !important;
            font-weight: 700 !important;
            text-align: right !important;
          }
          .status-pill {
            font-weight: 700 !important;
            font-size: 13px !important;
          }
          .status-pill.status-active { color: #16a34a !important; }
          .status-pill.status-pending { color: #003466 !important; }
          .status-pill.status-inactive { color: #ef4444 !important; }
          .status-pill.status-new { color: #003466 !important; }

          .btn-primary, .btn-base.btn-primary, button.btn-primary {
            background: #003466 !important;
            background-image: none !important;
            color: #ffffff !important;
            border: none !important;
            box-shadow: 0 2px 4px rgba(0, 52, 102, 0.2) !important;
          }
          .btn-primary:hover, .btn-base.btn-primary:hover, button.btn-primary:hover {
            background: #002447 !important;
            background-image: none !important;
          }

          .drawer-overlay {
            position: fixed !important;
            inset: 0 !important;
            background: rgba(15, 23, 42, 0.5) !important;
            backdrop-filter: blur(3px) !important;
            display: flex !important;
            justify-content: flex-end !important;
            z-index: 2000 !important;
          }
          .drawer-content {
            background: white !important;
            width: 100% !important;
            max-width: 550px !important;
            height: 100% !important;
            box-shadow: -10px 0 30px rgba(0, 0, 0, 0.1) !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
          }
          .drawer-header {
            padding: 0.75rem 1.25rem !important;
            border-bottom: 1px solid #002447 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            background: #003466 !important;
            color: #ffffff !important;
          }
          .drawer-header h3, .header-titles h3, .drawer-header .header-titles h3 {
            color: #ffffff !important;
            font-size: 16px !important;
            font-weight: 700 !important;
            margin: 0 !important;
            display: block !important;
          }
          .drawer-close-btn {
            font-size: 1.5rem !important;
            color: #94a3b8 !important;
            cursor: pointer !important;
            border: none !important;
            background: none !important;
          }
          .drawer-body {
            padding: 1rem 1.25rem !important;
            flex: 1 !important;
            overflow-y: auto !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0.75rem !important;
            scrollbar-width: thin !important;
            scrollbar-color: #cbd5e1 #f8fafc !important;
          }
          .drawer-footer {
            padding: 0.75rem 1.25rem !important;
            border-top: 1px solid #f1f5f9 !important;
            display: flex !important;
            justify-content: flex-end !important;
            gap: 0.75rem !important;
            background: #fdfdfd !important;
          }
          .modal-overlay-base {
            position: fixed !important;
            inset: 0 !important;
            background: rgba(15, 23, 42, 0.5) !important;
            backdrop-filter: blur(4px) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 9999 !important;
            padding: 1rem !important;
          }
          .modal-content-base {
            background: white !important;
            border-radius: 16px !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
            width: 100% !important;
            max-width: 440px !important;
            overflow: hidden !important;
          }

          @media (max-width: 768px) {
            .drawer-overlay {
              justify-content: center !important;
              align-items: center !important;
              background: rgba(15, 23, 42, 0.6) !important;
              padding: 10px !important;
              touch-action: none !important;
              overscroll-behavior: contain !important;
            }
            .drawer-content {
              width: 100% !important;
              max-width: 440px !important;
              height: auto !important;
              max-height: 92vh !important;
              border-radius: 14px !important;
              box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2) !important;
              margin: auto !important;
              display: flex !important;
              flex-direction: column !important;
              overflow: hidden !important;
            }
            .drawer-header {
              flex-shrink: 0 !important;
              padding: 0.65rem 0.85rem !important;
              background: #003466 !important;
              color: #ffffff !important;
              border-bottom: 1px solid #002447 !important;
              border-radius: 14px 14px 0 0 !important;
              width: 100% !important;
              display: block !important;
            }
            .drawer-header h3, .header-titles h3, .drawer-header .header-titles h3 {
              font-size: 15px !important;
              color: #ffffff !important;
              font-weight: 700 !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
              line-height: 1.3 !important;
            }
            .drawer-header .header-sub, .drawer-header .header-sub span {
              font-size: 11px !important;
              color: #cbd5e1 !important;
              display: block !important;
              margin-top: 2px !important;
            }
            .drawer-body {
              padding: 0.5rem 0.85rem !important;
              max-height: calc(92vh - 95px) !important;
              overflow-y: auto !important;
              -webkit-overflow-scrolling: touch !important;
              gap: 0.35rem !important;
            }
            .drawer-form {
              gap: 0.35rem !important;
            }
            .drawer-form label {
              margin-bottom: 0.1rem !important;
              font-size: 10.5px !important;
            }
            .drawer-footer {
              flex-shrink: 0 !important;
              padding: 0.45rem 0.85rem !important;
              background: #ffffff !important;
              border-top: 1px solid #f1f5f9 !important;
            }
            .drawer-footer button {
              flex: 1 !important;
              height: 35px !important;
              font-size: 12.5px !important;
              font-weight: 600 !important;
              justify-content: center !important;
            }
            .form-grid-responsive {
              grid-template-columns: 1fr !important;
              gap: 0.35rem !important;
            }
            input.input-base, select.input-base {
              height: 34px !important;
              padding: 3px 8px !important;
              font-size: 12px !important;
            }
            textarea.input-base {
              width: 100% !important;
              box-sizing: border-box !important;
              min-height: 45px !important;
              overflow-y: auto !important;
              white-space: pre-wrap !important;
              word-wrap: break-word !important;
              resize: vertical !important;
              line-height: 1.4 !important;
              padding: 6px 8px !important;
              font-size: 12px !important;
            }
            .modal-content-base {
              width: 100% !important;
              max-width: 340px !important;
              margin: auto !important;
              padding: 0.85rem 0.75rem !important;
              border-radius: 12px !important;
            }
          }
        @media (min-width: 769px) {
          .mobile-leave-cards-container {
            display: none !important;
          }
        }
      ` }} />
      {/* Base-style Leave Summary Dashboard - Compact (Hidden on mobile) */}
      <div className="leave-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="base-card leave-stat-card" style={{ padding: "1rem", background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #2563eb" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Tổng phép năm</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.25rem" }}>
            <span className="leave-stat-value" style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>{totalAnnualLeave}</span>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>ngày</span>
          </div>
        </div>
        <div className="base-card leave-stat-card" style={{ padding: "1rem", background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #10b981" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Đã sử dụng (Đã duyệt)</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.25rem" }}>
            <span className="leave-stat-value" style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10b981" }}>{usedDays}</span>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>ngày</span>
          </div>
        </div>
        <div className="base-card leave-stat-card" style={{ padding: "1rem", background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #f59e0b" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Đang chờ duyệt</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.25rem" }}>
            <span className="leave-stat-value" style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f59e0b" }}>{pendingDays}</span>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>ngày</span>
          </div>
        </div>
        <div className="base-card leave-stat-card" style={{ padding: "1rem", background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: "4px solid #6366f1" }}>
          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Số dư khả dụng</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.25rem" }}>
            <span className="leave-stat-value" style={{ fontSize: "1.5rem", fontWeight: 800, color: "#2563eb" }}>{totalAnnualLeave - usedDays}</span>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>ngày</span>
          </div>
        </div>
      </div>

      {/* Toolbar - Synced with EmployeeTable */}
      <div className="base-toolbar">
        <div className="toolbar-left">
          <h3 className="page-title-base">Danh sách nghỉ phép</h3>
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
            style={{ background: "#003466", backgroundImage: "none", color: "#ffffff", border: "none" }}
            onClick={() => { setEditingRequest(null); setShowModal(true); }}
          >
            Thêm mới
          </button>
        </div>
      </div>

      {/* Mobile Card List (Displayed on Phone <= 640px) */}
      <div className="mobile-leave-cards-container">
        {paginatedData.map((req, idx) => {
          const isCreator = req.employeeName === currentUserName;
          const canApprove = hasApprovePerm;

          return (
            <div key={req.id} className="proposal-card">
              <div className="card-row card-header">
                <div className="code-box">
                  <span className="idx-pill">#{idx + 1}</span>
                  <span className="proposal-code">{req.leaveCode || `NP-${req.id.slice(-6).toUpperCase()}`}</span>
                </div>
                <span className={`status-pill ${
                  req.status === "Đã phê duyệt" ? "status-active" :
                  req.status === "Chờ phê duyệt" ? "status-pending" :
                  (req.status === "Từ chối" || req.status === "Đã hủy") ? "status-inactive" : "status-new"
                }`}>
                  {req.status}
                </span>
              </div>

              <div className="card-body">
                <div className="info-row">
                  <span className="info-label">Nhân viên:</span>
                  <span className="info-val">{req.employeeName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Thời gian nghỉ:</span>
                  <span className="info-val">
                    {new Date(req.startDate).toLocaleDateString("vi-VN")} ➔ {new Date(req.endDate).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Số ngày:</span>
                  <span className="info-val" style={{ color: "#003466" }}>{req.totalDays} ngày</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Lý do:</span>
                  <span className="info-val">
                    {req.reason} {req.subReason ? `(${req.subReason})` : ''}
                  </span>
                </div>
                {req.note && (
                  <div className="info-row">
                    <span className="info-label">Ghi chú:</span>
                    <span className="info-val" style={{ fontWeight: 500, fontStyle: "italic" }}>{req.note}</span>
                  </div>
                )}
                <div className="info-row" style={{ marginTop: "2px", borderTop: "1px solid #f1f5f9", paddingTop: "4px" }}>
                  <span className="info-label">Ngày tạo:</span>
                  <span className="info-val" style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                    {new Date(req.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>

              <div style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
                alignItems: "center",
                marginTop: "8px",
                paddingTop: "8px",
                borderTop: "1px solid #f1f5f9",
                flexWrap: "wrap"
              }}>
                <button
                  type="button"
                  className="btn-base btn-outline"
                  style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", color: "#003466", borderColor: "#cbd5e1" }}
                  onClick={() => setHistoryRecordId(req.id)}
                >
                  Lịch sử
                </button>

                {req.status === "Tạo mới" && isCreator && (
                  <>
                    <button
                      type="button"
                      className="btn-base btn-outline"
                      style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", color: "#003466", borderColor: "#003466" }}
                      onClick={() => handleEdit(req)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="btn-base btn-primary"
                      style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", background: "#003466", backgroundImage: "none", color: "#ffffff", border: "none" }}
                      onClick={() => handleStatusChange(req.id, "Chờ phê duyệt", `của NV ${req.employeeName}`)}
                    >
                      Gửi duyệt
                    </button>
                    <button
                      type="button"
                      className="btn-base btn-outline"
                      style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", color: "#ef4444", borderColor: "#fee2e2" }}
                      onClick={() => handleDelete(req.id)}
                    >
                      Hủy
                    </button>
                  </>
                )}

                {req.status === "Chờ phê duyệt" && isCreator && (
                  <button
                    type="button"
                    className="btn-base btn-outline"
                    style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", color: "#003466", borderColor: "#003466" }}
                    onClick={() => handleStatusChange(req.id, "Tạo mới", `của NV ${req.employeeName}`)}
                  >
                    Thu hồi
                  </button>
                )}

                {req.status === "Chờ phê duyệt" && canApprove && (
                  <>
                    <button
                      type="button"
                      className="btn-base btn-primary"
                      style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", background: "#003466", backgroundImage: "none", color: "#ffffff", border: "none" }}
                      onClick={() => handleStatusChange(req.id, "Đã phê duyệt", `của NV ${req.employeeName}`)}
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      className="btn-base btn-outline"
                      style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", color: "#ef4444", borderColor: "#fecaca" }}
                      onClick={() => handleStatusChange(req.id, "Từ chối", `của NV ${req.employeeName}`)}
                    >
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {initialRequests.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem", color: "#64748b", background: "#fff", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
            Chưa có dữ liệu nghỉ phép
          </div>
        )}
      </div>

      {/* Windows / Desktop Table View */}
      <div className="base-table-wrapper desktop-only-table">
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
                      <div className={`horizontal-action-dropdown ${dropdownDirection === "up" ? "open-up" : ""}`}
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
                          <button
                            type="button"
                            className="icon-action-btn"
                            title="Chỉnh sửa"
                            onClick={() => { handleEdit(req); setOpenMenuId(null); }}
                          >
                            <Pencil size={15} style={{ color: "#d97706" }} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="icon-action-btn"
                          title="Lịch sử"
                          onClick={() => { setHistoryRecordId(req.id); setOpenMenuId(null); }}
                        >
                          <History size={15} style={{ color: "#64748b" }} />
                        </button>

                        {(req.status === "Tạo mới") && isCreator && (
                          <>
                            <button
                              type="button"
                              className="icon-action-btn"
                              title="Gửi duyệt"
                              onClick={() => { handleStatusChange(req.id, "Chờ phê duyệt", `của NV ${req.employeeName}`); setOpenMenuId(null); }}
                            >
                              <Mail size={15} style={{ color: "#2563eb" }} />
                            </button>
                            <button
                              type="button"
                              className="icon-action-btn danger"
                              title="Hủy đơn"
                              onClick={() => { handleDelete(req.id); setOpenMenuId(null); }}
                            >
                              <PowerOff size={15} style={{ color: "#ef4444" }} />
                            </button>
                          </>
                        )}

                        {req.status === "Chờ phê duyệt" && isCreator && (
                          <button
                            type="button"
                            className="icon-action-btn"
                            title="Thu hồi"
                            onClick={() => { handleStatusChange(req.id, "Tạo mới", `của NV ${req.employeeName}`); setOpenMenuId(null); }}
                          >
                            <RotateCcw size={15} style={{ color: "#ea580c" }} />
                          </button>
                        )}

                        {req.status === "Chờ phê duyệt" && canApprove && (
                          <>
                            <button
                              type="button"
                              className="icon-action-btn"
                              title="Duyệt đơn"
                              onClick={() => { handleStatusChange(req.id, "Đã phê duyệt", `của NV ${req.employeeName}`); setOpenMenuId(null); }}
                            >
                              <CheckCircle size={15} style={{ color: "#22c55e" }} />
                            </button>
                            <button
                              type="button"
                              className="icon-action-btn danger"
                              title="Từ chối"
                              onClick={() => { handleStatusChange(req.id, "Từ chối", `của NV ${req.employeeName}`); setOpenMenuId(null); }}
                            >
                              <PowerOff size={15} style={{ color: "#ef4444" }} />
                            </button>
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
            <div className="drawer-header" style={{ background: "#003466", color: "#ffffff" }}>
              <div className="header-titles">
                <h3 style={{ color: "#ffffff", margin: 0 }}>
                  {editingRequest ? "Cập nhật đề xuất nghỉ phép" : "Đăng ký nghỉ phép"}
                </h3>
                <div className="header-sub" style={{ color: "#cbd5e1" }}>
                  NGƯỜI GỬI: <span style={{ color: "#93c5fd", fontWeight: 600 }}>{editingRequest ? editingRequest.employeeName : currentUserName}</span>
                </div>
              </div>
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

                <div className="form-grid-responsive" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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
                    onInput={(e) => {
                      const target = e.currentTarget;
                      target.style.setProperty("height", "auto", "important");
                      target.style.setProperty("height", `${Math.max(45, target.scrollHeight)}px`, "important");
                    }}
                    onFocus={(e) => {
                      const target = e.currentTarget;
                      target.style.setProperty("height", "auto", "important");
                      target.style.setProperty("height", `${Math.max(45, target.scrollHeight)}px`, "important");
                    }}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      minHeight: "45px",
                      lineHeight: "1.4",
                      resize: "vertical"
                    }}
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
                    style={{ background: "#003466", color: "#ffffff", border: "none" }}
                  >
                    {isPending ? "Đang xử lý..." : "Gửi"}
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
              margin: "0 auto 1.25rem",
              color: "#f97316"
            }}>
              <Clock size={32} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: "0 auto 0.75rem", color: "#1e293b", textAlign: "center", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? "Gửi phê duyệt" :
                confirmUpdate.status === "Tạo mới" ? "Thu hồi hồ sơ" :
                  confirmUpdate.status === "Đã phê duyệt" ? "Phê duyệt hồ sơ" :
                    "Xác nhận thay đổi"}
            </h3>
            <div style={{ color: "#475569", margin: "0 auto 1.75rem", lineHeight: "1.6", textAlign: "center", padding: "0 0.5rem", fontFamily: "'Segoe UI', sans-serif" }}>
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
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button 
                type="button"
                className="sapo-btn sapo-btn-secondary" 
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  justifyContent: "center",
                  height: "40px"
                }} 
                onClick={() => setConfirmUpdate(null)}
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                className="sapo-btn" 
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  backgroundColor: confirmUpdate.status === "Từ chối" || confirmUpdate.status === "Đã hủy" ? "#ef4444" : "#003466",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  justifyContent: "center",
                  height: "40px"
                }} 
                onClick={executeStatusChange}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
          <div className="modal-content-base" style={{ maxWidth: "400px", width: "90%", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", textAlign: "center" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              color: "#ef4444"
            }}>
              <Trash2 size={30} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e293b", margin: "0 auto 0.75rem", fontFamily: "'Segoe UI', sans-serif" }}>
              Hủy hồ sơ
            </h3>
            <div style={{ color: "#475569", margin: "0 auto 1.75rem", lineHeight: "1.6", textAlign: "center", fontFamily: "'Segoe UI', sans-serif" }}>
              <p style={{ fontSize: "14px", marginBottom: "0.75rem" }}>
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

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                className="sapo-btn sapo-btn-secondary"
                onClick={() => setShowCancelModal(false)}
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  justifyContent: "center",
                  height: "40px"
                }}
              >
                Giữ lại
              </button>
              <button
                type="button"
                className="sapo-btn"
                onClick={confirmCancel}
                disabled={isPending}
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  justifyContent: "center",
                  height: "40px"
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

