"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { 
  CheckCircle, X, RefreshCw, Eye, History, AlertTriangle, FileText, Calendar, ChevronDown
} from "lucide-react";
import { 
  getPheDuyetProposals, approveProposal, rejectProposal, cancelApproveProposal
} from "./actions";
import HistoryModal from "../../HistoryModal";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";

export default function MaintenanceApprovalPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string, type: "APPROVE" | "REJECT" | "CANCEL_APPROVE", info: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useRealTimeSync("maintenance-proposals", proposals, setProposals, 3000, showModal);

  // Filters
  const [filterSearch, setFilterSearch] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [activeTab, setActiveTab] = useState(1); // 1 = Chờ duyệt, 2 = Đã duyệt

  const selectedProposalObj = useMemo(() => {
    return proposals.find((p) => p.id === selectedProposalId) || null;
  }, [proposals, selectedProposalId]);

  useEffect(() => {
    const handleClick = () => setSelectedProposalId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    fetchData();
    fetchUser();
  }, []);

  async function fetchData() {
    const data = await getPheDuyetProposals();
    setProposals(data);
  }

  async function fetchUser() {
    try {
      const res = await fetch("/api/user-permissions");
      const data = await res.json();
      setCurrentUser(data);
      if (data && data.branch) {
        const branchLower = data.branch.toLowerCase();
        if (
          !branchLower.includes("chi nhánh") && 
          !branchLower.includes("toàn bộ") && 
          !branchLower.includes("tất cả") &&
          !data.branch.includes(",")
        ) {
          setFilterBranch(data.branch);
        }
      }
    } catch (e) {
      console.error("Failed to fetch user permissions", e);
    }
  }

  // Filter Logic
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchTab = activeTab === 1 ? p.status === "Chờ duyệt" : p.status === "Đã phê duyệt";
      if (!matchTab) return false;

      const matchSearch =
        !filterSearch ||
        p.proposalCode.toLowerCase().includes(filterSearch.toLowerCase()) ||
        p.proposer.toLowerCase().includes(filterSearch.toLowerCase());
      const matchStatus = !filterStatus || p.status === filterStatus;
      const matchBranch = !filterBranch || p.branch === filterBranch;
      const matchMonth =
        !filterMonth ||
        (new Date(p.proposalDate).getMonth() + 1).toString().padStart(2, "0") === filterMonth.split("-")[1];
      return matchSearch && matchStatus && matchBranch && matchMonth;
    });
  }, [proposals, filterSearch, filterStatus, filterBranch, filterMonth, activeTab]);

  const uniqueBranches = useMemo(() => {
    const list = Array.from(new Set(proposals.map((p) => p.branch))).filter(Boolean);
    if (filterBranch && !list.includes(filterBranch)) {
      list.push(filterBranch);
    }
    return list.sort();
  }, [proposals, filterBranch]);

  const openViewModal = (proposal: any) => {
    setSelectedProposal(proposal);
    setDetails(proposal.items || []);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedProposal(null);
    setDetails([]);
  };

  const handleApprove = (id: string, code: string) => {
    setConfirmAction({ id, type: "APPROVE", info: code });
  };

  const handleReject = (id: string, code: string) => {
    setRejectReason("");
    setConfirmAction({ id, type: "REJECT", info: code });
  };

  const handleCancelApprove = (id: string, code: string) => {
    setConfirmAction({ id, type: "CANCEL_APPROVE", info: code });
  };

  const executeAction = () => {
    if (!confirmAction) return;
    const { id, type } = confirmAction;

    if (type === "REJECT" && !rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }

    setConfirmAction(null);
    startTransition(async () => {
      try {
        if (type === "APPROVE") {
          await approveProposal(id);
        } else if (type === "REJECT") {
          await rejectProposal(id, rejectReason.trim());
        } else if (type === "CANCEL_APPROVE") {
          await cancelApproveProposal(id);
        }
        setSelectedProposalId(null);
        fetchData();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  return (
    <div className="maintenance-approval-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        .maintenance-approval-container {
          width: 100%;
          min-width: 0;
        }
        .maintenance-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px 10px 0px;
        }
        .maintenance-layout input,
        .maintenance-layout select,
        .maintenance-layout textarea,
        .maintenance-layout button,
        .maintenance-layout table,
        .maintenance-layout td,
        .maintenance-layout th,
        .maintenance-layout label,
        .maintenance-layout .badge,
        .maintenance-layout .blue-panel-header,
        .maintenance-approval-container .breadcrumb-banner {
          font-size: 13px !important;
        }
        .breadcrumb-banner {
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
          font-weight: 700;
          display: block;
          border-radius: 0 !important;
          margin-top: 0;
          margin-left: -10px;
          margin-right: -10px;
        }
        .panel-full {
          flex: 1 1 100%;
          width: 100%;
          min-width: 0;
        }
        .blue-panel {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
        }
        .blue-panel-header {
          background-color: #003466;
          color: #ffffff;
          padding: 6px 15px 6px 15px;
          font-weight: 700;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #ff5c00;
        }
        .blue-panel-body {
          padding: 10px;
        }
        .search-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 5px 0px 10px 0px;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .sapo-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
          border-radius: 4px;
          font-weight: 400;
          font-size: 13px !important;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          border: none;
        }
        .sapo-btn:hover {
          background-color: #002244;
        }
        .sapo-btn:active {
          transform: scale(0.98);
        }
        .sapo-btn-secondary {
          background-color: #475569;
        }
        .sapo-btn-secondary:hover {
          background-color: #334155;
        }
        .sapo-btn-success {
          background-color: #22c55e;
        }
        .sapo-btn-success:hover {
          background-color: #16a34a;
        }
        .sapo-btn-warning {
          background-color: #f59e0b;
        }
        .sapo-btn-warning:hover {
          background-color: #d97706;
        }
        .sapo-btn-danger {
          background-color: #ef4444;
        }
        .sapo-btn-danger:hover {
          background-color: #dc2626;
        }
        .sapo-btn-info {
          background-color: #2563eb;
        }
        .sapo-btn-info:hover {
          background-color: #1d4ed8;
        }
        .sapo-btn-sm {
          padding: 4px 8px !important;
          font-size: 12px !important;
          border-radius: 4px !important;
          font-weight: 400 !important;
        }
        .sapo-btn-sm svg {
          width: 14px !important;
          height: 14px !important;
        }
        .row-hoverable:hover {
          background-color: #f8fafc;
        }
        .tab-nav-base {
          display: flex;
          gap: 4px;
          border-bottom: 2px solid #cbd5e1;
          margin-top: 10px;
          margin-bottom: 10px;
        }
        .tab-btn-base {
          padding: 8px 20px;
          border: none;
          background: none;
          cursor: pointer;
          font-weight: 700;
          font-size: 13px;
          color: #475569;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
        }
        .tab-btn-base:hover {
          color: #003466;
        }
        .tab-btn-base.active {
          color: #003466;
          border-bottom-color: #ff5c00;
        }
        .row-selected {
          background-color: #eff6ff !important;
        }
        .base-table-wrapper {
          height: auto !important;
          min-height: unset !important;
          overflow-y: hidden !important;
          overflow-x: auto !important;
          padding-bottom: 0px !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          min-width: 1200px !important;
          table-layout: auto !important;
          border-collapse: collapse !important;
        }
        .base-table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          background: #f1f5f9 !important;
          border-bottom: 2px solid #ff5c00 !important;
          text-align: center !important;
          height: 35px !important;
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
        .base-table td {
          padding: 6px 0.75rem !important;
          vertical-align: middle !important;
          white-space: normal !important;
          word-break: break-word !important;
          border-bottom: none !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
        .nowrap, .base-table .nowrap {
          white-space: nowrap !important;
        }
        .base-filters {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          padding: 10px !important;
        }
        .mobile-filter-header,
        .mobile-proposals-cards {
          display: none !important;
        }
        @media (max-width: 768px) {
          .mobile-filter-header {
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            padding: 5px 15px !important;
            margin-top: 10px !important;
            margin-bottom: 5px !important;
            cursor: pointer !important;
            user-select: none !important;
            transition: background-color 0.2s !important;
          }
          .mobile-filter-header:hover {
            background: #f8fafc !important;
          }
          .mobile-filter-title {
            font-size: 14px !important;
            font-weight: 600 !important;
            color: #0f172a !important;
          }
          .mobile-filter-arrow {
            transition: transform 0.2s ease !important;
            color: #64748b !important;
          }
          .mobile-filter-arrow.open {
            transform: rotate(180deg) !important;
          }
          .base-filters.mobile-hide {
            display: none !important;
          }
          .base-filters.mobile-show {
            display: grid !important;
          }
          .base-table-wrapper {
            display: none !important;
          }
          .mobile-proposals-cards {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            margin-top: 10px !important;
            padding-bottom: 20px !important;
            width: 100% !important;
          }
          .proposal-card {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 8px 12px !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            user-select: none !important;
          }
          .proposal-card:hover {
            background: #f8fafc !important;
          }
          .proposal-card.selected {
            border: 1px solid #b9d5f0 !important;
            border-left: 6px solid #003466 !important;
            background-color: #f0f7ff !important;
            box-shadow: 0 4px 6px -1px rgba(0, 52, 102, 0.08) !important;
          }
          .card-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .card-header {
            border-bottom: 1px solid #f1f5f9 !important;
            padding-bottom: 5px !important;
            margin-bottom: 6px !important;
          }
          .code-box {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
          }
          .idx-pill {
            background: #f1f5f9 !important;
            color: #475569 !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
          }
          .proposal-code {
            color: #003466 !important;
            font-weight: 700 !important;
            font-size: 13px !important;
          }
          .card-body {
            display: flex !important;
            flex-direction: column !important;
            gap: 3px !important;
          }
          .info-row {
            display: flex !important;
            justify-content: space-between !important;
            font-size: 12px !important;
          }
          .info-label {
            color: #64748b !important;
            font-weight: 500 !important;
          }
          .info-val {
            color: #1e293b !important;
            text-align: right !important;
          }
          .info-val.highlight {
            font-weight: 600 !important;
            color: #0f172a !important;
          }
          .goods-section {
            margin-top: 4px !important;
            padding-top: 6px !important;
            border-top: 1px dashed #e2e8f0 !important;
          }
          .goods-title {
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #003466 !important;
            margin-bottom: 2px !important;
          }
          .goods-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
          }
          .goods-item {
            font-size: 12px !important;
            color: #334155 !important;
          }
          .goods-num {
            color: #64748b !important;
            font-weight: 600 !important;
          }
        }
        .filter-label {
          display: block;
          margin-bottom: 0.4rem;
          font-size: 0.85rem;
          font-weight: 700;
          color: #003466;
          text-transform: uppercase;
        }
        .form-control {
          padding: 6px 10px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          outline: none !important;
          background: white !important;
        }
        .base-table .status-pill {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          border-radius: 0 !important;
        }
        .base-table .status-pill.status-active {
          color: #166534 !important;
        }
        .base-table .status-pill.status-new {
          color: #4f46e5 !important;
        }
        .base-table .status-pill.status-pending {
          color: #d97706 !important;
        }
        .base-table .status-pill.status-inactive {
          color: #dc2626 !important;
        }

        .custom-modal-overlay {
          position: fixed;
          background: rgba(15, 23, 42, 0.6) !important;
          backdrop-filter: blur(4px) !important;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999 !important;
          left: 0 !important;
          top: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
        }
        .custom-modal-overlay .filter-label {
          text-transform: uppercase !important;
          color: #003466 !important;
          font-weight: 700 !important;
          margin-bottom: 0.35rem !important;
          font-size: 0.85rem !important;
        }
        .custom-modal-overlay .scrollable-body::-webkit-scrollbar {
          display: none !important;
        }
        .custom-modal-overlay .scrollable-body {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .custom-modal-overlay .modal-footer-btn-secondary {
          background-color: #334155 !important;
          color: white !important;
          font-weight: 500 !important;
          border-radius: 6px !important;
          padding: 8px 20px !important;
          font-size: 14px !important;
          border: none !important;
          cursor: pointer !important;
          transition: background-color 0.2s, transform 0.1s !important;
        }
        .custom-modal-overlay .modal-footer-btn-secondary:hover {
          background-color: #1e293b !important;
        }
        .custom-modal-overlay .modal-footer-btn-success {
          background-color: #22c55e !important;
          color: white !important;
          font-weight: 500 !important;
          border-radius: 6px !important;
          padding: 8px 20px !important;
          font-size: 14px !important;
          border: none !important;
          cursor: pointer !important;
          transition: background-color 0.2s, transform 0.1s !important;
        }
        .custom-modal-overlay .modal-footer-btn-success:hover {
          background-color: #16a34a !important;
        }
        .custom-modal-overlay .input {
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 6px 12px !important;
          height: 34px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        .custom-modal-overlay .input:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }
        .tab3-goods-table th {
          text-transform: uppercase !important;
          color: #003466 !important;
          font-weight: 700 !important;
          text-align: center !important;
        }
      ` }} />

      {!isEmbedded && (
        <div className="breadcrumb-banner">
          PHÊ DUYỆT ĐỀ NGHỊ MUA BẢO TRÌ
        </div>
      )}

      <div className="tab-nav-base">
        <button
          type="button"
          className={`tab-btn-base ${activeTab === 1 ? "active" : ""}`}
          onClick={() => {
            setActiveTab(1);
            setSelectedProposalId(null);
          }}
        >
          Chờ duyệt ({proposals.filter(p => p.status === "Chờ duyệt" && (!filterBranch || p.branch === filterBranch)).length})
        </button>
        <button
          type="button"
          className={`tab-btn-base ${activeTab === 2 ? "active" : ""}`}
          onClick={() => {
            setActiveTab(2);
            setSelectedProposalId(null);
          }}
        >
          Đã duyệt ({proposals.filter(p => p.status === "Đã phê duyệt" && (!filterBranch || p.branch === filterBranch)).length})
        </button>
      </div>

      {/* Mobile filter toggle box */}
      <div 
        className="mobile-filter-header"
        onClick={() => setFilterOpen(!filterOpen)}
      >
        <span className="mobile-filter-title">Tìm kiếm</span>
        <ChevronDown size={18} className={`mobile-filter-arrow ${filterOpen ? "open" : ""}`} />
      </div>

      {/* Filters Grid */}
      <div className={`base-filters ${filterOpen ? "mobile-show" : "mobile-hide"}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "10px", marginBottom: "10px" }}>
        <div>
          <label className="filter-label">Tìm kiếm</label>
          <input 
            type="text" 
            className="form-control" 
            style={{ width: "100%" }}
            placeholder="Tìm theo số đề nghị, người đề..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="filter-label">Chi nhánh</label>
          <select 
            className="form-control" 
            style={{ width: "100%" }} 
            value={filterBranch} 
            onChange={(e) => setFilterBranch(e.target.value)}
          >
            <option value="">-- Tất cả chi nhánh --</option>
            {uniqueBranches.map(b => b && <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div>
          <label className="filter-label">Tháng đề nghị</label>
          <input 
            type="month" 
            className="form-control" 
            style={{ width: "100%" }} 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)} 
          />
        </div>
      </div>

      {/* Main Action Toolbar above table */}
      <div className="maintenance-layout" style={{ paddingTop: "0px" }}>
        <div className="panel-full">
          <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center", marginTop: "0px" }}>
            <button className="btn btn-outline sapo-btn" onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <RefreshCw size={14} /> Làm mới
            </button>

            {selectedProposalObj && (
              <>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => openViewModal(selectedProposalObj)}
                >
                  Xem
                </button>

                {selectedProposalObj.status === "Chờ duyệt" && activeTab === 1 && (
                  <>
                    <button
                      type="button"
                      className="sapo-btn sapo-btn-success"
                      onClick={() => handleApprove(selectedProposalObj.id, selectedProposalObj.proposalCode)}
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      className="sapo-btn sapo-btn-danger"
                      onClick={() => handleReject(selectedProposalObj.id, selectedProposalObj.proposalCode)}
                    >
                      Từ chối
                    </button>
                  </>
                )}

                {selectedProposalObj.status === "Đã phê duyệt" && activeTab === 2 && (
                  <button
                    type="button"
                    className="sapo-btn sapo-btn-danger"
                    onClick={() => handleCancelApprove(selectedProposalObj.id, selectedProposalObj.proposalCode)}
                  >
                    Hủy phê duyệt
                  </button>
                )}

                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => setHistoryRecordId(selectedProposalObj.id)}
                >
                  Lịch sử
                </button>
              </>
            )}
          </div>

          {/* Proposals Table */}
          <div className="base-table-wrapper" style={filteredProposals.length === 0 ? { height: "auto" } : undefined}>
            <table className="base-table">
              <thead>
                <tr>
                  <th className="nowrap" style={{ width: "50px" }}>STT</th>
                  <th className="nowrap" style={{ width: "120px" }}>Số đề nghị</th>
                  <th className="nowrap" style={{ width: "100px" }}>Ngày đề nghị</th>
                  <th style={{ width: "170px" }}>Người đề nghị</th>
                  <th style={{ width: "120px" }}>Chi nhánh</th>
                  <th style={{ width: "210px" }}>Mục đích</th>
                  <th style={{ width: "120px" }}>Tình trạng</th>
                  <th className="nowrap" style={{ width: "120px" }}>Trạng thái</th>
                  <th style={{ minWidth: "250px" }}>Thông tin hàng hóa</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                      Không tìm thấy đề nghị mua nào
                    </td>
                  </tr>
                ) : (
                  filteredProposals.map((item, idx) => {
                    const isSelected = selectedProposalId === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProposalId(isSelected ? null : item.id);
                        }}
                        onDoubleClick={() => openViewModal(item)}
                        className={`row-hoverable ${isSelected ? "row-selected" : ""}`}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{idx + 1}</td>
                        <td className="nowrap" style={{ textAlign: "center", fontWeight: 600, color: "var(--primary-color)" }}>{item.proposalCode}</td>
                        <td className="nowrap" style={{ textAlign: "center" }}>
                          {new Date(item.proposalDate).toLocaleDateString("vi-VN")}
                        </td>
                        <td style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{item.proposer}</td>
                        <td style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{item.branch}</td>
                        <td style={{ textAlign: "center" }}>{item.purpose}</td>
                        <td style={{ textAlign: "center" }}>{item.urgency}</td>
                        <td className="nowrap" style={{ textAlign: "center" }}>
                          <span
                            className={`status-pill ${
                              item.status === "Đã phê duyệt" || item.status === "Hoàn thành"
                                ? "status-active"
                                : item.status === "Tạo mới"
                                ? "status-new"
                                : item.status === "Chờ duyệt"
                                ? "status-pending"
                                : "status-inactive"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "left", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {(item.items || []).map((goods: any, gIdx: number) => (
                              <div key={goods.id} style={{ fontSize: "12px", borderBottom: gIdx < (item.items.length - 1) ? "1px dashed #cbd5e1" : "none", paddingBottom: "2px", color: "#334155" }}>
                                {gIdx + 1}. {goods.productName} - ĐVT: {goods.unit || "—"} - SL: {Number(goods.quantity).toLocaleString("en-US")}
                                {goods.orderedQuantity > 0 && (
                                  <span style={{ color: "#16a34a", fontWeight: "600" }}>
                                    {` (Đã đặt: ${Number(goods.orderedQuantity).toLocaleString("en-US")} - ${goods.poStatus || "Chờ giao hàng"})`}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Proposals Mobile Cards View */}
          <div className="mobile-proposals-cards">
            {filteredProposals.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", background: "#ffffff", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                Không tìm thấy đề nghị mua nào
              </div>
            ) : (
              filteredProposals.map((item, idx) => {
                const isSelected = selectedProposalId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProposalId(isSelected ? null : item.id);
                    }}
                    onDoubleClick={() => openViewModal(item)}
                    className={`proposal-card ${isSelected ? "selected" : ""}`}
                  >
                    {/* Header: STT, proposalCode and Status */}
                    <div className="card-row card-header">
                      <div className="code-box">
                        <span className="idx-pill">#{idx + 1}</span>
                        <span className="proposal-code">{item.proposalCode}</span>
                      </div>
                      <span
                        className={`status-pill ${
                          item.status === "Đã phê duyệt" || item.status === "Hoàn thành"
                            ? "status-active"
                            : item.status === "Tạo mới"
                            ? "status-new"
                            : item.status === "Chờ duyệt"
                            ? "status-pending"
                            : "status-inactive"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Meta info fields */}
                    <div className="card-body">
                      <div className="info-row">
                        <span className="info-label">Ngày đề nghị:</span>
                        <span className="info-val">{new Date(item.proposalDate).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Người đề nghị:</span>
                        <span className="info-val highlight">{item.proposer}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Chi nhánh:</span>
                        <span className="info-val highlight">{item.branch}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Mục đích:</span>
                        <span className="info-val">{item.purpose}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Tình trạng:</span>
                        <span className="info-val">{item.urgency}</span>
                      </div>
                      
                      {/* Goods Info */}
                      <div className="goods-section">
                        <div className="goods-title">Thông tin hàng hóa:</div>
                        <div className="goods-list">
                          {(item.items || []).map((goods: any, gIdx: number) => (
                            <div key={goods.id} className="goods-item">
                              <span className="goods-num">{gIdx + 1}.</span> {goods.productName} 
                              <div style={{ marginLeft: "14px", color: "#64748b", fontSize: "11px" }}>
                                ĐVT: {goods.unit || "—"} - SL: {Number(goods.quantity).toLocaleString("en-US")}
                                {goods.orderedQuantity > 0 && (
                                  <span style={{ color: "#16a34a", fontWeight: "600" }}>
                                    {` (Đã đặt: ${Number(goods.orderedQuantity).toLocaleString("en-US")} - ${goods.poStatus || "Chờ giao hàng"})`}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* History Log Modal */}
      {historyRecordId && (
        <HistoryModal 
          tableName="MaintenanceProposal" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {/* View Detail Modal */}
      {showModal && selectedProposal && (
        <div className="custom-modal-overlay">
          <div
            className="custom-modal-content-responsive"
            style={{
              width: "95%",
              maxWidth: "950px",
              maxHeight: "90%",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden"
            }}
          >
            {/* Header */}
            <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "16px 24px", margin: 0, background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔍 Xem chi tiết đề nghị phê duyệt:</span>
              <span style={{ color: "#ff5c00" }}>{selectedProposal.proposalCode}</span>
            </h3>

            {/* Scrollable Body */}
            <div className="scrollable-body" style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {/* I. General Info */}
              <h4 style={{ margin: "0 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>I. Thông tin chung</h4>
              <div
                className="responsive-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  rowGap: "10px",
                  columnGap: "1.25rem",
                  marginBottom: "1.5rem"
                }}
              >
                <div>
                  <label className="filter-label">Số đề nghị</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedProposal.proposalCode} readOnly />
                </div>
                <div>
                  <label className="filter-label">Người đề nghị</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedProposal.proposer} readOnly />
                </div>
                <div>
                  <label className="filter-label">Chi nhánh</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedProposal.branch} readOnly />
                </div>
                <div>
                  <label className="filter-label">Ngày đề nghị</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={new Date(selectedProposal.proposalDate).toLocaleDateString("vi-VN")} readOnly />
                </div>
                <div>
                  <label className="filter-label">Mục đích</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedProposal.purpose} readOnly />
                </div>
                <div>
                  <label className="filter-label">Tình trạng</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedProposal.urgency} readOnly />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="filter-label">Ghi chú</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={selectedProposal.note || ""} readOnly />
                </div>
              </div>

              {/* II. Items details */}
              <h4 style={{ margin: "20px 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>II. Chi tiết đề nghị</h4>
              <div className="responsive-table-wrapper" style={{ overflowX: "auto", overflowY: "hidden", border: "1px solid #e2e8f0", borderRadius: "8px", width: "100%" }}>
                <table className="table tab3-goods-table" style={{ fontSize: "13px", width: "100%", minWidth: "1165px", tableLayout: "fixed" }}>
                  <thead style={{ background: "#f8fafc" }}>
                    <tr>
                      <th style={{ width: "250px", padding: "5px 6px", textAlign: "center" }}>Tên hàng hóa</th>
                      <th style={{ width: "250px", padding: "5px 6px", textAlign: "center" }}>Tiêu chuẩn kỹ thuật</th>
                      <th style={{ width: "95px", padding: "5px 6px", textAlign: "center" }}>ĐVT</th>
                      <th style={{ width: "90px", padding: "5px 6px", textAlign: "center" }}>Số lượng</th>
                      <th style={{ width: "110px", padding: "5px 6px", textAlign: "center" }}>Đơn giá</th>
                      <th style={{ width: "120px", padding: "5px 6px", textAlign: "center" }}>Thành tiền</th>
                      <th style={{ width: "250px", padding: "5px 6px", textAlign: "center" }}>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((d, index) => (
                      <tr key={index}>
                        <td style={{ padding: "5px 6px", color: "#000", fontWeight: 600 }}>
                          <div style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", width: "100%" }} title={d.productName}>
                            {d.productName}
                          </div>
                        </td>
                        <td style={{ padding: "5px 6px", textAlign: "center" }}>
                          <div style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", width: "100%" }} title={d.techStandard || ""}>
                            {d.techStandard || "—"}
                          </div>
                        </td>
                        <td style={{ padding: "5px 6px", textAlign: "center" }}>{d.unit}</td>
                        <td style={{ padding: "5px 6px", textAlign: "center" }}>{Number(d.quantity).toLocaleString("en-US")}</td>
                        <td style={{ padding: "5px 6px", textAlign: "right" }}>{Number(d.price).toLocaleString("en-US")}</td>
                        <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>{Number(d.amount).toLocaleString("en-US")}</td>
                        <td style={{ padding: "5px 6px" }}>{d.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="sapo-btn sapo-btn-secondary" onClick={handleClose}>
                Đóng
              </button>
              {selectedProposal.status === "Chờ duyệt" && (
                <>
                  <button 
                    className="sapo-btn sapo-btn-success" 
                    onClick={() => { handleApprove(selectedProposal.id, selectedProposal.proposalCode); handleClose(); }}
                  >
                    Phê duyệt
                  </button>
                  <button 
                    className="sapo-btn sapo-btn-danger" 
                    onClick={() => { handleReject(selectedProposal.id, selectedProposal.proposalCode); handleClose(); }}
                  >
                    Từ chối
                  </button>
                </>
              )}
              {selectedProposal.status === "Đã phê duyệt" && (
                <button 
                  className="sapo-btn sapo-btn-danger" 
                  onClick={() => { handleCancelApprove(selectedProposal.id, selectedProposal.proposalCode); handleClose(); }}
                >
                  Hủy phê duyệt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation & Rejection Modals */}
      {confirmAction && (
        <div className="modal-overlay-base" style={{ zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)" }}>
          <div className="card" style={{ maxWidth: "450px", width: "90%", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", textAlign: "center" }}>
            <div style={{ 
              width: "60px", 
              height: "60px", 
              borderRadius: "50%", 
              background: confirmAction.type === "APPROVE" ? "#ecfdf5" : confirmAction.type === "CANCEL_APPROVE" ? "#fff7ed" : "#fef2f2", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto 0.5rem",
              color: confirmAction.type === "APPROVE" ? "#10b981" : confirmAction.type === "CANCEL_APPROVE" ? "#f97316" : "#ef4444"
            }}>
              {confirmAction.type === "APPROVE" ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
            </div>
            
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#1e293b" }}>
              {confirmAction.type === "APPROVE" ? "Phê duyệt đề nghị" : confirmAction.type === "CANCEL_APPROVE" ? "Hủy phê duyệt đề nghị" : "Từ chối đề nghị"}
            </h3>

            <div style={{ color: "#475569", lineHeight: "1.6", margin: "0 0 1rem 0" }}>
              {confirmAction.type === "APPROVE" ? (
                <>
                  <p style={{ margin: 0 }}>Bạn có chắc đồng ý phê duyệt đề nghị mua bảo trì <strong>{confirmAction.info}</strong>?</p>
                  <p style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "600", background: "#ecfdf5", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                    Đề nghị sẽ được chuyển sang bộ phận mua sắm.
                  </p>
                </>
              ) : confirmAction.type === "CANCEL_APPROVE" ? (
                <>
                  <p style={{ margin: 0 }}>Bạn có chắc muốn hủy phê duyệt đề nghị mua bảo trì <strong>{confirmAction.info}</strong>?</p>
                  <p style={{ fontSize: "0.85rem", color: "#f97316", fontWeight: "600", background: "#fff7ed", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                    Đề nghị sẽ chuyển ngược lại trạng thái "Chờ duyệt".
                  </p>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <p style={{ margin: 0 }}>Bạn có chắc muốn từ chối đề nghị mua bảo trì <strong>{confirmAction.info}</strong>?</p>
                  <div style={{ textAlign: "left", marginTop: "10px" }}>
                    <label style={{ fontWeight: 700, display: "block", marginBottom: "5px" }}>Lý do từ chối *</label>
                    <textarea 
                      className="form-control" 
                      style={{ width: "100%", height: "80px", resize: "none" }}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Nhập lý do từ chối..."
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button 
                type="button"
                className="sapo-btn sapo-btn-secondary" 
                style={{ flex: 1, justifyContent: "center" }} 
                onClick={() => setConfirmAction(null)}
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                className="sapo-btn" 
                style={{ flex: 1, background: confirmAction.type === "APPROVE" ? "#16a34a" : confirmAction.type === "CANCEL_APPROVE" ? "#f97316" : "#ef4444", justifyContent: "center" }} 
                onClick={executeAction}
                disabled={isPending}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
