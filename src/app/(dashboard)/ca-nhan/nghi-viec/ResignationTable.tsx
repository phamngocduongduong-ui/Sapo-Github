"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Check, Trash2, Send, RotateCcw, X, Plus, Filter, Search,
  MoreHorizontal, History, CheckCircle, PowerOff, Mail, Clock,
  Pencil
} from "lucide-react";
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
  const userBranches = currentUserBranch ? currentUserBranch.split(",").map(b => b.trim()).filter(Boolean) : [];
  const [data, setData] = useState(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
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

  // Sync state with props on server refresh
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtering logic
  const filteredData = data.filter(item => {
    const matchesSearch = item.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      (item.reason || "").toLowerCase().includes(search.toLowerCase());
    const matchesBranch = !selectedBranch || item.branch === selectedBranch;
    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    return matchesSearch && matchesBranch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedBranch, selectedStatus]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

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

  const handleStatusChange = (id: string, newStatus: string, info?: string) => {
    setConfirmUpdate({ id, status: newStatus, info: info || "" });
  };

  const executeStatusChange = () => {
    if (!confirmUpdate) return;
    const { id, status: newStatus } = confirmUpdate;
    setConfirmUpdate(null);
    startTransition(async () => {
      try {
        await updateResignationStatus(id, newStatus);
        router.refresh();
      } catch (error: any) {
        alert(error.message);
      }
    });
  };

  // Helper functions for avatars
  const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(-2);
  };

  const getRandomColor = (name: string) => {
    if (!name) return "#3b82f6";
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const uniqueBranches = Array.from(new Set(initialData.map(item => item.branch).filter(Boolean)));
  const uniqueStatuses = ["Tạo mới", "Chờ phê duyệt", "Đã phê duyệt", "Đã hủy", "Từ chối"];

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Inline Base.vn styles to bypass caching */
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
        .search-box-base {
          position: relative !important;
          width: 240px !important;
        }
        .search-box-base input {
          width: 100% !important;
          padding: 0.5rem 0.75rem 0.5rem 2.25rem !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 8px !important;
          font-size: 0.875rem !important;
          background: #fff !important;
        }
        .search-box-base .search-icon {
          position: absolute !important;
          left: 0.75rem !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          color: #94a3b8 !important;
        }
        .btn-base {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 6px 10px 6px 8px !important;
          font-size: 13px !important;
          border-radius: 4px !important;
          cursor: pointer !important;
          gap: 0.5rem !important;
          border: 1px solid transparent !important;
          font-weight: 500 !important;
        }
        .btn-primary, .btn-base.btn-primary, button.btn-primary {
          background: #003466 !important;
          background-image: none !important;
          color: #fff !important;
          border: none !important;
        }
        .btn-primary:hover, .btn-base.btn-primary:hover, button.btn-primary:hover {
          background: #002447 !important;
          background-image: none !important;
        }
        .btn-outline {
          background: #fff !important;
          border: 1px solid #e2e8f0 !important;
          color: #475569 !important;
        }
        .base-table-wrapper {
          background: #fff !important;
          border-radius: 8px !important;
          border: 1px solid #e0e6ed !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
          overflow-x: hidden !important;
          width: 100% !important;
          max-height: 485px !important;
          height: auto !important;
          overflow-y: auto !important;
          padding-bottom: 60px !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          table-layout: fixed !important;
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
        .avatar-base {
          width: 24px !important;
          height: 24px !important;
          border-radius: 50% !important;
          color: #fff !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 0.65rem !important;
          font-weight: 700 !important;
        }
        .employee-info-base {
          display: flex !important;
          align-items: center !important;
          gap: 0.625rem !important;
          white-space: nowrap !important;
        }
        .info-text {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-start !important;
        }
        .name {
          white-space: nowrap !important;
          font-weight: 600 !important;
          color: #1e293b !important;
        }
        .status-pill {
          display: inline-flex !important;
          align-items: center !important;
          padding: 0.125rem 0.5rem !important;
          border-radius: 4px !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
        }
        .status-active {
          background: #e6fffa !important;
          color: #00867a !important;
          border: 1px solid #b2f2bb !important;
        }
        .status-pending {
          background: #f0f7ff !important;
          color: #003466 !important;
          border: 1px solid #bae6fd !important;
        }
        .status-inactive {
          background: #fff5f5 !important;
          color: #c53030 !important;
          border: 1px solid #fed7d7 !important;
        }
        .status-new {
          background: #f7fafc !important;
          color: #003466 !important;
          border: 1px solid #e2e8f0 !important;
        }
        .base-pagination {
          margin-top: 0.25rem !important;
          margin-bottom: 0px !important;
          padding-top: 0px !important;
          padding-bottom: 0px !important;
        }

        /* Side Drawer Styles */
        .drawer-overlay {
          position: fixed !important;
          inset: 0 !important;
          background: rgba(15, 23, 42, 0.4) !important;
          backdrop-filter: blur(2px) !important;
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
          padding: 0.65rem 1.25rem !important;
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
          padding: 0.4rem 1.25rem !important;
          flex: 1 !important;
          overflow-y: auto !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0.3rem !important;
          scrollbar-width: thin !important;
          scrollbar-color: #cbd5e1 #f8fafc !important;
        }
        .drawer-body::-webkit-scrollbar {
          width: 5px !important;
        }
        .drawer-body::-webkit-scrollbar-track {
          background: #f8fafc !important;
        }
        .drawer-body::-webkit-scrollbar-thumb {
          background: #cbd5e1 !important;
          border-radius: 4px !important;
        }
        .drawer-footer {
          padding: 0.65rem 1.25rem !important;
          border-top: 1px solid #f1f5f9 !important;
          display: flex !important;
          justify-content: flex-end !important;
          gap: 0.75rem !important;
          background: #fdfdfd !important;
        }
        .form-section {
          margin-bottom: 0.25rem !important;
        }
        .section-title {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #003466 !important;
          margin-bottom: 0.2rem !important;
          margin-top: 0.1rem !important;
          border-bottom: 1px solid #f1f5f9 !important;
          padding-bottom: 0.1rem !important;
        }
        .form-group-base {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.05rem !important;
          margin-bottom: 0.3rem !important;
        }
        .form-group-base label {
          font-size: 12px !important;
          color: #64748b !important;
          font-weight: 500 !important;
          margin-bottom: 0.1rem !important;
        }
        .input-base, select.input-base {
          padding: 0.5rem 0.75rem !important;
          border-radius: 6px !important;
          border: 1px solid #e2e8f0 !important;
          font-size: 13px !important;
          outline: none !important;
          background: #f8fafc !important;
          color: #1e293b !important;
        }
        .form-control {
          width: 100% !important;
          padding: 0.5rem 0.75rem !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 0.375rem !important;
          font-size: 0.875rem !important;
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
          .base-table-wrapper {
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
            padding: 2px 8px !important;
            border-radius: 6px !important;
          }
          .proposal-code {
            font-weight: 700 !important;
            color: #003466 !important;
            font-size: 14px !important;
          }
          .card-body {
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
            font-size: 13px !important;
          }
          .info-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .info-label {
            color: #64748b !important;
            font-weight: 500 !important;
          }
          .info-val {
            color: #1e293b !important;
            font-weight: 600 !important;
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
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2) !important;
            margin: auto !important;
          }
          .drawer-header {
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
            gap: 0.3rem !important;
          }
          .drawer-form {
            gap: 0.3rem !important;
          }
          .drawer-form label {
            margin-bottom: 0.1rem !important;
            font-size: 10.5px !important;
          }
          .drawer-footer {
            padding: 0.45rem 0.85rem !important;
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
            gap: 0.3rem !important;
          }
          .reasons-grid-mobile {
            grid-template-columns: 1fr !important;
            gap: 0.25rem !important;
            padding: 0.35rem 0.5rem !important;
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
      `}} />
      {/* Header Toolbar */}
      <div className="base-toolbar">
        <div className="toolbar-left">
          <h3 className="page-title-base">Danh sách nghỉ việc</h3>
          <span className="badge-count">{filteredData.length}</span>
          <div className="search-box-base">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm theo tên NV, lý do..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className={`btn-base ${showFilters ? 'btn-primary' : 'btn-outline'}`} onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}>
            <Filter size={18} />
          </button>
        </div>
        <div className="toolbar-right">
          <button
            onClick={() => {
              setEditingItem(null);
              setSelectedReasons([]);
              setIsModalOpen(true);
            }}
            className="btn-base btn-primary"
            style={{ background: "#003466", backgroundImage: "none", color: "#ffffff", border: "none" }}
          >
            Đăng ký
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="base-filters animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <select
              className="form-control"
              style={{ maxWidth: "200px" }}
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">Tất cả chi nhánh</option>
              {uniqueBranches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select
              className="form-control"
              style={{ maxWidth: "200px" }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              className="btn-base btn-outline"
              onClick={() => {
                setSearch("");
                setSelectedBranch("");
                setSelectedStatus("");
              }}
            >
              <RotateCcw size={16} /> Đặt lại
            </button>
          </div>
        </div>
      )}

      {/* Mobile Card List (Displayed on screens <= 768px) - Styled like Security List cards */}
      <div className="mobile-leave-cards-container">
        {paginatedData.map((item, idx) => {
          const isCreator = item.employeeName === currentUserName;

          return (
            <div key={item.id} className="proposal-card">
              {/* Header: STT, Proposal Code, Status */}
              <div className="card-row card-header">
                <div className="code-box">
                  <span className="idx-pill">#{(currentPage - 1) * itemsPerPage + idx + 1}</span>
                  <span className="proposal-code">{item.resignationCode || `NV-${item.id.slice(-6).toUpperCase()}`}</span>
                </div>
                <span className={`status-pill ${item.status === "Đã phê duyệt" ? "status-active" :
                    item.status === "Chờ phê duyệt" ? "status-pending" :
                      (item.status === "Từ chối" || item.status === "Đã hủy") ? "status-inactive" : "status-new"
                  }`}>
                  {item.status}
                </span>
              </div>

              {/* Card Body */}
              <div className="card-body">
                <div className="info-row">
                  <span className="info-label">Nhân viên:</span>
                  <span className="info-val">{item.employeeName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Chi nhánh:</span>
                  <span className="info-val">{item.branch || "—"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Ngày nghỉ việc:</span>
                  <span className="info-val" style={{ color: "#2563eb" }}>
                    {new Date(item.resignationDate).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Lý do:</span>
                  <span className="info-val">{item.reason}</span>
                </div>
                {item.note && (
                  <div className="info-row">
                    <span className="info-label">Ghi chú:</span>
                    <span className="info-val" style={{ fontWeight: 500, fontStyle: "italic" }}>{item.note}</span>
                  </div>
                )}
                <div className="info-row" style={{ marginTop: "2px", borderTop: "1px solid #f1f5f9", paddingTop: "4px" }}>
                  <span className="info-label">Ngày tạo:</span>
                  <span className="info-val" style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                    {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
              </div>

              {/* Mobile Card Actions */}
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
                  style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", color: "#003466", borderColor: "#cbd5e1", background: "#ffffff" }}
                  onClick={() => setHistoryRecordId(item.id)}
                >
                  Lịch sử
                </button>

                {item.status === "Tạo mới" && (isCreator || canApprove) && (
                  <>
                    <button
                      type="button"
                      className="btn-base btn-outline"
                      style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", color: "#003466", borderColor: "#003466", background: "#ffffff" }}
                      onClick={() => {
                        setEditingItem(item);
                        setSelectedReasons(item.reason ? item.reason.split(", ") : []);
                        setIsModalOpen(true);
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="btn-base btn-primary"
                      style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", background: "#003466", backgroundImage: "none", color: "#ffffff", border: "none" }}
                      onClick={() => handleStatusChange(item.id, "Chờ phê duyệt", `của NV ${item.employeeName}`)}
                    >
                      Gửi duyệt
                    </button>
                    <button
                      type="button"
                      className="btn-base btn-outline"
                      style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", color: "#ef4444", borderColor: "#fee2e2", background: "#ffffff" }}
                      onClick={() => handleStatusChange(item.id, "Đã hủy", `của NV ${item.employeeName}`)}
                    >
                      Hủy
                    </button>
                  </>
                )}

                {item.status === "Chờ phê duyệt" && (isCreator || canApprove) && (
                  <button
                    type="button"
                    className="btn-base btn-outline"
                    style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", color: "#003466", borderColor: "#003466", background: "#ffffff" }}
                    onClick={() => handleStatusChange(item.id, "Tạo mới", `của NV ${item.employeeName}`)}
                  >
                    Thu hồi
                  </button>
                )}

                {item.status === "Chờ phê duyệt" && canApprove && (
                  <>
                    <button
                      type="button"
                      className="btn-base btn-primary"
                      style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", background: "#003466", backgroundImage: "none", color: "#ffffff", border: "none" }}
                      onClick={() => handleStatusChange(item.id, "Đã phê duyệt", `của NV ${item.employeeName}`)}
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      className="btn-base btn-outline"
                      style={{ padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px", color: "#ef4444", borderColor: "#fecaca", background: "#ffffff" }}
                      onClick={() => handleStatusChange(item.id, "Từ chối", `của NV ${item.employeeName}`)}
                    >
                      Từ chối
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {filteredData.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem", color: "#64748b", background: "#fff", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
            Chưa có dữ liệu nghỉ việc
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="base-table-wrapper">
        <table className="base-table">
          <thead>
            <tr>
              <th className="th-first" style={{ width: "45px", textAlign: "center" }}>STT</th>
              <th style={{ width: "85px" }}>Ngày tạo</th>
              <th style={{ width: "80px" }}>Mã đơn</th>
              <th style={{ width: "235px" }}>Nhân viên</th>
              <th style={{ width: "115px" }}>Ngày nghỉ việc</th>
              <th style={{ width: "270px" }}>Lý do</th>
              <th style={{ width: "115px" }}>Trạng thái</th>
              <th className="th-last" style={{ textAlign: "right", width: "50px" }}></th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => (
              <tr key={item.id}>
                <td style={{ textAlign: "center", color: "#64748b" }}>
                  {(currentPage - 1) * itemsPerPage + index + 1}
                </td>
                <td>
                  <span className="date-text">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</span>
                </td>
                <td>
                  <span className="code-pill">{item.resignationCode || "—"}</span>
                </td>
                <td>
                  <div className="employee-info-base">
                    <div className="avatar-base" style={{ backgroundColor: getRandomColor(item.employeeName) }}>
                      {getInitials(item.employeeName)}
                    </div>
                    <div className="info-text">
                      <div className="name" style={{ fontWeight: 600, color: "#1e293b" }}>{item.employeeName}</div>
                      <div className="sub">{item.branch || "—"}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="date-text" style={{ fontWeight: 500 }}>{new Date(item.resignationDate).toLocaleDateString("vi-VN")}</span>
                </td>
                <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.reason}>
                  <span style={{ color: "#475569" }}>{item.reason}</span>
                </td>
                <td>
                  <span className={`status-pill ${item.status === "Đã phê duyệt" ? "status-active" :
                    item.status === "Chờ phê duyệt" ? "status-pending" :
                      item.status === "Đã hủy" || item.status === "Từ chối" ? "status-inactive" : "status-new"
                    }`}>
                    {item.status}
                  </span>
                </td>
                <td style={{ textAlign: "right", position: "relative", zIndex: openMenuId === item.id ? 50 : 1 }}>
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const isLastRows = index >= paginatedData.length - 2;
                      const isFirstRow = index === 0;
                      setDropdownDirection((isLastRows && !isFirstRow) ? "up" : "down");
                      setOpenMenuId(openMenuId === item.id ? null : item.id);
                    }}
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {openMenuId === item.id && (
                    <div className={`horizontal-action-dropdown ${dropdownDirection === "up" ? "open-up" : ""}`} onClick={(e) => e.stopPropagation()}>
                      {item.status === "Tạo mới" && (
                        <button
                          type="button"
                          className="icon-action-btn"
                          title="Chỉnh sửa"
                          onClick={() => {
                            setEditingItem(item);
                            setSelectedReasons(item.reason.split(", "));
                            setIsModalOpen(true);
                            setOpenMenuId(null);
                          }}
                        >
                          <Pencil size={15} style={{ color: "#d97706" }} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="icon-action-btn"
                        title="Lịch sử"
                        onClick={() => { setHistoryRecordId(item.id); setOpenMenuId(null); }}
                      >
                        <History size={15} style={{ color: "#64748b" }} />
                      </button>

                      {item.status === "Tạo mới" && (
                        <>
                          <button
                            type="button"
                            className="icon-action-btn"
                            title="Gửi duyệt"
                            onClick={() => { handleStatusChange(item.id, "Chờ phê duyệt", `của NV ${item.employeeName}`); setOpenMenuId(null); }}
                          >
                            <Mail size={15} style={{ color: "#2563eb" }} />
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn danger"
                            title="Hủy đơn"
                            onClick={() => { handleStatusChange(item.id, "Đã hủy", `của NV ${item.employeeName}`); setOpenMenuId(null); }}
                          >
                            <PowerOff size={15} style={{ color: "#ef4444" }} />
                          </button>
                        </>
                      )}

                      {item.status === "Chờ phê duyệt" && (
                        <button
                          type="button"
                          className="icon-action-btn"
                          title="Thu hồi"
                          onClick={() => { handleStatusChange(item.id, "Tạo mới", `của NV ${item.employeeName}`); setOpenMenuId(null); }}
                        >
                          <RotateCcw size={15} style={{ color: "#ea580c" }} />
                        </button>
                      )}

                      {item.status === "Chờ phê duyệt" && canApprove && (
                        <>
                          <button
                            type="button"
                            className="icon-action-btn"
                            title="Duyệt đơn"
                            onClick={() => { handleStatusChange(item.id, "Đã phê duyệt", `của NV ${item.employeeName}`); setOpenMenuId(null); }}
                          >
                            <CheckCircle size={15} style={{ color: "#22c55e" }} />
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn danger"
                            title="Từ chối"
                            onClick={() => { handleStatusChange(item.id, "Từ chối", `của NV ${item.employeeName}`); setOpenMenuId(null); }}
                          >
                            <PowerOff size={15} style={{ color: "#ef4444" }} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr style={{ height: "45px" }}>
                <td colSpan={8} style={{ textAlign: "center", color: "#64748b", verticalAlign: "middle", height: "45px" }}>
                  Chưa có dữ liệu
                </td>
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

      {/* Modern Pagination */}
      {totalPages > 1 && (
        <div className="base-pagination">
          <div className="pagination-info">
            Hiển thị <strong>{paginatedData.length}</strong> / {filteredData.length} yêu cầu
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

      {/* Modern Side Drawer for Add/Edit */}
      {isModalOpen && (
        <div className="drawer-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="drawer-content animate-drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header" style={{ background: "#003466", color: "#ffffff" }}>
              <div className="header-titles">
                <h3 style={{ color: "#ffffff", margin: 0 }}>{editingItem ? "Hiệu chỉnh đơn nghỉ việc" : "Đăng ký nghỉ việc"}</h3>
                <p className="header-sub" style={{ fontSize: "11px", color: "#cbd5e1", margin: "2px 0 0 0" }}>
                  NHÂN VIÊN: <span style={{ color: "#93c5fd", fontWeight: 600 }}>{editingItem?.employeeName || currentUserName}</span> • NGÀY TẠO: {editingItem ? new Date(editingItem.createdAt).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")}
                </p>
              </div>
            </div>

            <div className="drawer-body" style={{ padding: "0.75rem 1.25rem" }}>
              <form id="resignation-form" action={async (formData) => {
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
              }} className="drawer-form" style={{ gap: "0.75rem" }}>
                <input type="hidden" name="employeeName" value={editingItem?.employeeName || currentUserName} />

                <div className="form-grid-responsive" style={{ display: "grid", gridTemplateColumns: userBranches.length > 1 ? "1fr 1fr" : "1fr", gap: "0.75rem" }}>
                  {userBranches.length > 1 ? (
                    <div className="form-group-base">
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem", display: "block" }}>Chi nhánh <span className="required">*</span></label>
                      <select
                        name="branch"
                        className="input-base"
                        style={{ width: "100%", height: "36px", padding: "0 0.5rem", fontSize: "13px" }}
                        required
                        defaultValue={editingItem?.branch || userBranches[0]}
                      >
                        {userBranches.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <input type="hidden" name="branch" value={editingItem?.branch || currentUserBranch} />
                  )}

                  <div className="form-group-base">
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem", display: "block" }}>Ngày nghỉ việc <span className="required">*</span></label>
                    <input
                      type="date"
                      name="resignationDate"
                      className="input-base"
                      required
                      defaultValue={editingItem ? new Date(editingItem.resignationDate).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      style={{ height: "36px", padding: "0 0.5rem", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div className="form-section" style={{ padding: "0" }}>
                  <h4 className="section-title" style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.25rem" }}>Lý do (Chọn nhiều) <span className="required">*</span></h4>

                  <div className="reasons-grid-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.1fr", gap: "0.35rem 0.5rem", padding: "0.5rem 0.65rem", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    {REASONS.map(r => (
                      <label key={r} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "11px", cursor: "pointer", color: "#334155", margin: 0, whiteSpace: "nowrap" }}>
                        <input
                          type="checkbox"
                          checked={selectedReasons.includes(r)}
                          style={{ width: "13px", height: "13px" }}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedReasons([...selectedReasons, r]);
                            else setSelectedReasons(selectedReasons.filter(sr => sr !== r));
                          }}
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-section" style={{ padding: "0" }}>
                  <h4 className="section-title" style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.25rem" }}>Ghi chú bổ sung</h4>
                  <div className="form-group-base full-width">
                    <textarea
                      name="note"
                      className="input-base"
                      rows={2}
                      placeholder="Ghi chú thêm (nếu có)"
                      defaultValue={editingItem?.note || ""}
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
                </div>
              </form>
            </div>

            <div className="drawer-footer">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-base btn-outline">Thoát</button>
              <button type="submit" form="resignation-form" className="btn-base btn-primary" disabled={selectedReasons.length === 0} style={{ background: "#003466", color: "#ffffff", border: "none" }}>
                Gửi
              </button>
            </div>
          </div>
        </div>
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
                    <PowerOff size={16} /> Hồ sơ sẽ không được chỉnh sửa trong thời gian chờ phê duyệt.
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
                    <CheckCircle size={16} /> Hồ sơ sẽ có giá trị kể từ thời điểm phê duyệt.
                  </p>
                </>
              ) : (
                <p>Bạn có chắc chắn muốn chuyển trạng thái hồ sơ này sang <strong>"{confirmUpdate.status}"</strong> không?</p>
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
    </>
  );
}
