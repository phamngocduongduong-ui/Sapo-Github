"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  CheckCircle, CheckCircle2, XCircle, X, RefreshCw, Eye, History, AlertTriangle, FileText, Calendar, ChevronDown
} from "lucide-react";
import { 
  getPheDuyetProposals, approveProposal, rejectProposal, cancelApproveProposal
} from "./actions";
import HistoryModal from "../../HistoryModal";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { FilePreviewModal } from "@/components/FilePreviewModal";

export default function PurchasingProposalApprovalPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [attachmentList, setAttachmentList] = useState<any[]>([]);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string, type: "APPROVE" | "REJECT" | "CANCEL_APPROVE", info: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useRealTimeSync("purchasing-proposal-approvals", proposals, setProposals, 3000, showModal);

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
    try {
      const data = await getPheDuyetProposals();
      setProposals(data);
    } catch (e) {
      console.error("Lỗi tải đề nghị:", e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUser() {
    try {
      const res = await fetch("/api/user-permissions");
      const data = await res.json();
      setCurrentUser(data);
    } catch (e) {
      console.error("Failed to fetch user permissions", e);
    }
  }

  // Filter Logic
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchTab = activeTab === 1 ? p.status === "Chờ duyệt" : p.status !== "Chờ duyệt";
      if (!matchTab) return false;

      const matchSearch =
        !filterSearch ||
        p.proposalCode.toLowerCase().includes(filterSearch.toLowerCase()) ||
        p.proposer.toLowerCase().includes(filterSearch.toLowerCase());
      const matchStatus = !filterStatus || p.status === filterStatus;
      const matchBranch =
        !filterBranch ||
        p.branch === filterBranch ||
        (p.branch && filterBranch && (
          p.branch.toLowerCase().includes(filterBranch.toLowerCase()) ||
          filterBranch.toLowerCase().includes(p.branch.toLowerCase())
        ));
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
    const atts = proposal.attachments ? JSON.parse(proposal.attachments) : [];
    setAttachmentList(atts);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedProposal(null);
    setDetails([]);
    setAttachmentList([]);
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
    <div className="maintenance-approval-container" style={{ width: "100%", minWidth: 0, padding: isEmbedded ? "10px 8px" : "0px", boxSizing: "border-box" }}>
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
          margin-top: 0px !important;
          margin-left: -10px !important;
          margin-right: -10px !important;
          margin-bottom: 10px !important;
          width: calc(100% + 20px) !important;
          box-sizing: border-box !important;
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
          margin: 0;
          padding: 8px 0;
          gap: 0.5rem;
          flex-wrap: wrap;
          position: sticky;
          top: 140px;
          z-index: 100;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
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
        .row-hoverable:hover {
          background-color: #f8fafc;
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
          min-width: 1020px !important;
          table-layout: auto !important;
          border-collapse: collapse !important;
          border: 1px solid #cbd5e1 !important;
          margin-bottom: 0px !important;
        }
        .base-table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          background: #f1f5f9 !important;
          border: 1px solid #cbd5e1 !important;
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
          border: 1px solid #cbd5e1 !important;
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
        .mobile-only {
          display: ${isEmbedded ? "flex" : "none"} !important;
          ${isEmbedded ? "flex-direction: column !important; gap: 6px !important;" : ""}
        }
        .desktop-only {
          display: ${isEmbedded ? "none" : "block"} !important;
        }
        .mobile-filter-header,
        .mobile-proposals-cards {
          display: none !important;
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: flex !important;
            flex-direction: column !important;
            gap: 6px !important;
          }
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
          .search-container {
            position: sticky !important;
            top: 70px !important;
            z-index: 100 !important;
            background: #f8fafc !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 8px 10px !important;
            margin-left: -10px !important;
            margin-right: -10px !important;
            margin-top: 0px !important;
            margin-bottom: 0px !important;
          }
          .mobile-proposals-cards {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            margin-top: 2px !important;
            padding-bottom: 20px !important;
            width: 100% !important;
          }
          .proposal-card {
            background: #ffffff !important;
            border: 1px solid #ffedd5 !important;
            border-radius: 14px !important;
            padding: 10px 12px !important;
            box-shadow: 0 2px 8px rgba(234, 88, 12, 0.04) !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            user-select: none !important;
          }
          .proposal-card:hover {
            background: #ffffff !important;
          }
          .proposal-card.selected {
            border: 2px solid #ea580c !important;
            background-color: #ffffff !important;
            box-shadow: 0 2px 8px rgba(234, 88, 12, 0.12) !important;
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
        .custom-modal-overlay select.input {
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 6px 12px !important;
          height: 34px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        .custom-modal-overlay select.input:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }
        .custom-modal-overlay .input-sm {
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 5px 10px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
          width: 100%;
          outline: none;
        }
        .custom-modal-overlay select.input-sm {
          height: 32px !important;
          padding: 4px 8px !important;
          background: white !important;
        }
        .custom-modal-overlay .input-sm:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }
        .tab3-goods-table th {
          text-transform: uppercase !important;
          color: #003466 !important;
          font-weight: 700 !important;
          text-align: center !important;
        }
        .tabs-container {
          display: flex;
          border-bottom: 2px solid #cbd5e1;
          margin-bottom: 15px;
          gap: 5px;
        }
        .tab-btn {
          padding: 8px 16px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-bottom: none;
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
          color: #475569;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          background: #e2e8f0;
        }
        .tab-btn.active {
          background: #003466;
          color: white;
          border-color: #003466;
        }
      ` }} />

      {!isEmbedded && (
        <div className="breadcrumb-banner">
          PHÊ DUYỆT NHU CẦU MUA
        </div>
      )}

      {/* DESKTOP VIEW */}
      <div className="desktop-only">
        {/* Action Toolbar */}
        <div className="maintenance-layout" style={{ paddingTop: "0px", marginTop: "0px" }}>
          <div className="panel-full" style={{ padding: "0px", background: "transparent", border: "none", boxShadow: "none" }}>
            {selectedProposalObj && (
              <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center", marginTop: "0px", marginBottom: "8px" }}>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => openViewModal(selectedProposalObj)}
                >
                  Xem chi tiết
                </button>

                {selectedProposalObj.status === "Chờ duyệt" && (
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

                {(selectedProposalObj.status === "Chờ thực hiện" || selectedProposalObj.status === "Đã phê duyệt" || selectedProposalObj.status === "Từ chối") && (
                  <button
                    type="button"
                    className="sapo-btn sapo-btn-warning"
                    onClick={() => handleCancelApprove(selectedProposalObj.id, selectedProposalObj.proposalCode)}
                  >
                    Bỏ duyệt
                  </button>
                )}

                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => setHistoryRecordId(selectedProposalObj.id)}
                >
                  Lịch sử
                </button>
              </div>
            )}

            {/* Table view */}
            <div className="base-table-wrapper" style={filteredProposals.length === 0 ? { height: "auto" } : undefined}>
              <table className="base-table">
                <thead>
                  <tr>
                    <th className="nowrap" style={{ width: "40px", minWidth: "40px" }}>STT</th>
                    <th className="nowrap" style={{ width: "70px", minWidth: "70px" }}>Số đề nghị</th>
                    <th className="nowrap" style={{ width: "70px", minWidth: "70px" }}>Ngày</th>
                    <th style={{ width: "170px", minWidth: "170px" }}>Người đề nghị</th>
                    <th style={{ width: "120px", minWidth: "120px" }}>Chi nhánh</th>
                    <th className="nowrap" style={{ width: "70px", minWidth: "70px" }}>Trạng thái</th>
                    <th style={{ minWidth: "250px" }}>Thông tin hàng hóa</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProposals.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                        Không có đề nghị nào trong danh sách này
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
                          <td className="nowrap" style={{ textAlign: "center" }}>
                            <span
                              className={`status-pill ${
                                item.status === "Đã phê duyệt" || item.status === "Chờ thực hiện" || item.status === "Hoàn thành"
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
                                <div key={goods.id} style={{ fontSize: "12px", borderBottom: gIdx < (item.items.length - 1) ? "1px dashed #cbd5e1" : "none", paddingBottom: "4px", paddingTop: "2px", color: "#334155" }}>
                                  <div>
                                    {gIdx + 1}. {goods.productName} - ĐVT: {goods.unit || "—"} - SL: {Number(goods.quantity).toLocaleString("en-US")}
                                  </div>
                                  {goods.orderHistory && goods.orderHistory.length > 0 && (
                                    <div style={{ paddingLeft: "15px", marginTop: "3px", color: "#16a34a", fontSize: "11px", display: "flex", flexDirection: "column", gap: "2px", fontWeight: "500" }}>
                                      {goods.orderHistory.map((hist: any, hIdx: number) => (
                                        <div key={hIdx} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                          <span style={{ display: "inline-block", width: "4px", height: "4px", borderRadius: "50%", backgroundColor: "#16a34a" }}></span>
                                          <span>Lần đặt {hIdx + 1}: {hist.poCode} - SL: <strong style={{ color: "#15803d", fontWeight: "700" }}>{Number(hist.quantity).toLocaleString("en-US")} {hist.unit || ""}</strong> (Dự kiến giao: {hist.deliveryDate})</span>
                                        </div>
                                      ))}
                                    </div>
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
          </div>
        </div>
      </div>

      {/* MOBILE VIEW (Đồng bộ chuẩn 100% Phê duyệt nhân sự) */}
      <div className="mobile-only" style={{ flexDirection: "column", gap: "6px", marginTop: "4px" }}>
        {/* 2-Tab Selector Bar: Cần phê duyệt vs Đã phê duyệt */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px",
          background: "#f1f5f9",
          padding: "3px",
          borderRadius: "10px",
          marginBottom: "6px"
        }}>
          {/* Tab 1: Cần phê duyệt */}
          <button
            onClick={() => { setActiveTab(1); setSelectedProposalId(null); }}
            style={{
              background: activeTab === 1 ? "#ffffff" : "transparent",
              border: "none",
              color: activeTab === 1 ? "#ea580c" : "#64748b",
              borderRadius: "7px",
              padding: "6px 8px",
              fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
              fontSize: "13px",
              fontWeight: activeTab === 1 ? 600 : 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              boxShadow: activeTab === 1 ? "0 2px 6px rgba(234, 88, 12, 0.12)" : "none",
              transform: activeTab === 1 ? "scale(1.02)" : "scale(1)",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            <span style={{ fontSize: "12px" }}>⏳</span>
            <span>Cần phê duyệt</span>
            <span style={{
              background: activeTab === 1 ? "#fee2e2" : "#e2e8f0",
              color: activeTab === 1 ? "#dc2626" : "#64748b",
              fontSize: "10.5px",
              fontWeight: 600,
              padding: "0px 5px",
              borderRadius: "8px",
              lineHeight: "1.2"
            }}>
              {proposals.filter(p => p.status === "Chờ duyệt").length}
            </span>
          </button>

          {/* Tab 2: Đã phê duyệt */}
          <button
            onClick={() => { setActiveTab(2); setSelectedProposalId(null); }}
            style={{
              background: activeTab === 2 ? "#ffffff" : "transparent",
              border: "none",
              color: activeTab === 2 ? "#059669" : "#64748b",
              borderRadius: "7px",
              padding: "6px 8px",
              fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
              fontSize: "13px",
              fontWeight: activeTab === 2 ? 600 : 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "5px",
              boxShadow: activeTab === 2 ? "0 2px 6px rgba(5, 150, 105, 0.12)" : "none",
              transform: activeTab === 2 ? "scale(1.02)" : "scale(1)",
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            <span style={{ fontSize: "12px" }}>✅</span>
            <span>Đã phê duyệt</span>
            <span style={{
              background: activeTab === 2 ? "#d1fae5" : "#e2e8f0",
              color: activeTab === 2 ? "#059669" : "#64748b",
              fontSize: "10.5px",
              fontWeight: 600,
              padding: "0px 5px",
              borderRadius: "8px",
              lineHeight: "1.2"
            }}>
              {proposals.filter(p => p.status !== "Chờ duyệt").length}
            </span>
          </button>
        </div>

        {/* Cards view (mobile) */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px 12px", color: "#64748b", background: "#ffffff", borderRadius: "14px", border: "1px solid #ffedd5", fontSize: "11px", fontWeight: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "16px", height: "16px", border: "2px solid #ea580c", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : filteredProposals.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 12px", color: "#64748b", background: "#ffffff", borderRadius: "14px", border: "1px solid #ffedd5", fontSize: "11px", fontWeight: 400 }}>
            {activeTab === 1 ? "Hiện không có dữ liệu cần phê duyệt" : "Hiện chưa có dữ liệu đã phê duyệt"}
          </div>
        ) : (
          filteredProposals.map((item) => {
            const isSelected = selectedProposalId === item.id;
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: activeTab === 2 ? "1px solid #d1fae5" : "1px solid #ffedd5",
                  boxShadow: activeTab === 2 ? "0 2px 8px rgba(5, 150, 105, 0.04)" : "0 2px 8px rgba(234, 88, 12, 0.04)",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}
              >
                {/* Row 1: Orange Capsule Badge + Proposal Code + Status Badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", width: "100%", marginBottom: "2px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{
                      fontSize: "9.5px",
                      fontWeight: 600,
                      background: (activeTab === 2 || item.status === "Đã phê duyệt" || item.status === "Chờ thực hiện") ? "#059669" : "#ea580c",
                      color: "#ffffff",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.2px",
                      whiteSpace: "nowrap",
                      display: "inline-block"
                    }}>
                      MUA HÀNG
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>
                      {item.proposalCode}
                    </span>
                  </div>

                  {(item.status === "Đã phê duyệt" || item.status === "Chờ thực hiện" || item.status === "Hoàn thành" || item.status === "Từ chối") && (
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 400,
                      color: (item.status === "Đã phê duyệt" || item.status === "Chờ thực hiện" || item.status === "Hoàn thành") ? "#059669" : "#dc2626",
                      background: (item.status === "Đã phê duyệt" || item.status === "Chờ thực hiện" || item.status === "Hoàn thành") ? "#ecfdf5" : "#fef2f2",
                      padding: "3px 10px",
                      borderRadius: "12px",
                      whiteSpace: "nowrap",
                      flexShrink: 0
                    }}>
                      {item.status}
                    </span>
                  )}
                </div>

                {/* Row 2: Main Info Column (Title + Ngày + NV + Mục đích) & Right Action Buttons */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  {/* Left Info Column */}
                  <div style={{ flex: 1 }}>
                    {/* Main Title Text */}
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", lineHeight: "1.3" }}>
                      Phê duyệt nhu cầu mua hàng
                    </div>

                    {/* Line 1: Ngày */}
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "3px", fontWeight: 400 }}>
                      Ngày: {new Date(item.proposalDate).toLocaleDateString("vi-VN")}
                    </div>

                    {/* Line 2: NV (Tên nhân viên) */}
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px", fontWeight: 400 }}>
                      NV: {item.proposer}
                    </div>

                    {/* Line 3: Mục đích */}
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px", fontWeight: 400, lineHeight: "1.35" }}>
                      Mục đích: {item.purpose}
                    </div>
                  </div>

                  {/* Right Side Buttons (Duyệt ngay & Từ chối / Bỏ duyệt) */}
                  {item.status === "Chờ duyệt" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-end", flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(item.id, item.proposalCode);
                        }}
                        style={{
                          background: "linear-gradient(135deg, #ff5c00 0%, #ea580c 100%)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          fontSize: "11px",
                          fontWeight: 400,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 6px rgba(234, 88, 12, 0.2)"
                        }}
                      >
                        Duyệt ngay →
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(item.id, item.proposalCode);
                        }}
                        style={{
                          background: "#ffffff",
                          color: "#dc2626",
                          border: "1px solid #fca5a5",
                          borderRadius: "8px",
                          padding: "5px 10px",
                          fontSize: "11px",
                          fontWeight: 400,
                          cursor: "pointer",
                          whiteSpace: "nowrap"
                        }}
                      >
                        ✕ Từ chối
                      </button>
                    </div>
                  )}

                  {(item.status === "Chờ thực hiện" || item.status === "Đã phê duyệt" || item.status === "Từ chối") && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-end", flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelApprove(item.id, item.proposalCode);
                        }}
                        style={{
                          background: "#fef3c7",
                          color: "#d97706",
                          border: "1px solid #fde68a",
                          borderRadius: "8px",
                          padding: "5px 10px",
                          fontSize: "11px",
                          fontWeight: 400,
                          cursor: "pointer",
                          whiteSpace: "nowrap"
                        }}
                      >
                        Bỏ duyệt
                      </button>
                    </div>
                  )}
                </div>

                {/* Toggle Expand Details */}
                <div
                  style={{
                    borderTop: activeTab === 2 ? "1px dashed #a7f3d0" : "1px dashed #fed7aa",
                    paddingTop: "4px",
                    marginTop: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedId(isExpanded ? null : item.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      fontSize: "11px",
                      fontWeight: 400,
                      color: activeTab === 2 ? "#059669" : "#ea580c",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <span>{isExpanded ? "▲ Thu gọn chi tiết" : "▼ Xem chi tiết đầy đủ"}</span>
                  </button>
                </div>

                {/* Collapsible Goods Detail Box */}
                {isExpanded && (
                  <div style={{
                    marginTop: "6px",
                    padding: "8px 10px",
                    background: "#fff7ed",
                    borderRadius: "8px",
                    border: "1px solid #ffedd5"
                  }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#ea580c", marginBottom: "6px", textTransform: "uppercase" }}>
                      Thông tin hàng hóa ({item.items?.length || 0})
                    </div>
                    {(!item.items || item.items.length === 0) ? (
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Không có hàng hóa</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {item.items.map((goods: any, gIdx: number) => (
                          <div key={goods.id || gIdx} style={{ fontSize: "11px", borderBottom: gIdx < (item.items.length - 1) ? "1px dashed #fed7aa" : "none", paddingBottom: "4px" }}>
                            <div style={{ fontWeight: 600, color: "#1e293b" }}>
                              {gIdx + 1}. {goods.productName}
                            </div>
                            <div style={{ color: "#64748b", fontSize: "11px" }}>
                              ĐVT: {goods.unit || "—"} | SL: <strong style={{ color: "#ea580c" }}>{Number(goods.quantity).toLocaleString("en-US")}</strong>
                            </div>
                            {goods.orderHistory && goods.orderHistory.length > 0 && (
                              <div style={{ paddingLeft: "8px", marginTop: "3px", color: "#16a34a", fontSize: "10.5px" }}>
                                {goods.orderHistory.map((hist: any, hIdx: number) => (
                                  <div key={hIdx}>
                                    • Lần đặt {hIdx + 1}: {hist.poCode} - SL: {Number(hist.quantity).toLocaleString("en-US")} {hist.unit || ""} (Giao: {hist.deliveryDate})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* History log modal */}
      {historyRecordId && (
        <HistoryModal 
          tableName="PurchasingProposal" 
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
              maxWidth: "900px",
              maxHeight: "85%",
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
            <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "12px 24px", margin: 0, background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", fontSize: "16px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔍 Chi tiết đề nghị mua hàng:</span>
              <span style={{ color: "#ff5c00" }}>{selectedProposal.proposalCode}</span>
            </h3>

            {/* Content */}
            <div className="scrollable-body" style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>I. Thông tin chung</h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1.25rem",
                  marginBottom: "1.5rem"
                }}
              >
                <div>
                  <label className="filter-label">Số đề nghị</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9" }} value={selectedProposal.proposalCode} readOnly />
                </div>
                <div>
                  <label className="filter-label">Ngày đề nghị</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9" }} value={new Date(selectedProposal.proposalDate).toLocaleDateString("vi-VN")} readOnly />
                </div>
                <div>
                  <label className="filter-label">Người đề nghị</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9" }} value={selectedProposal.proposer} readOnly />
                </div>
                <div>
                  <label className="filter-label">Chi nhánh</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9" }} value={selectedProposal.branch} readOnly />
                </div>
                <div>
                  <label className="filter-label">Mục đích</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9" }} value={selectedProposal.purpose} readOnly />
                </div>
                <div>
                  <label className="filter-label">Tình trạng</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9" }} value={selectedProposal.urgency} readOnly />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="filter-label">Ghi chú</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9" }} value={selectedProposal.note || ""} readOnly />
                </div>
              </div>

              <h4 style={{ margin: "20px 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>II. Chi tiết hàng hóa</h4>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                <table className="table tab3-goods-table" style={{ fontSize: "13px", width: "100%" }}>
                  <thead style={{ background: "#f8fafc" }}>
                    <tr>
                      <th style={{ padding: "8px 12px", textAlign: "center", width: "50px" }}>STT</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Tên hàng hóa</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>TC kỹ thuật</th>
                      <th style={{ padding: "8px 12px", textAlign: "center", width: "80px" }}>ĐVT</th>
                      <th style={{ padding: "8px 12px", textAlign: "center", width: "100px" }}>Số lượng</th>
                      <th style={{ padding: "8px 12px", textAlign: "right", width: "120px" }}>Đơn giá</th>
                      <th style={{ padding: "8px 12px", textAlign: "right", width: "130px" }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((d, index) => (
                      <tr key={d.id || index} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>{index + 1}</td>
                        <td style={{ padding: "8px 12px" }}>{d.productName}</td>
                        <td style={{ padding: "8px 12px" }}>{d.techStandard || "—"}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>{d.unit}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>{Number(d.quantity).toLocaleString("en-US")}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{Number(d.price).toLocaleString("en-US")}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{Number(d.amount).toLocaleString("en-US")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SECTION 3: Attachments */}
              <h4 style={{ margin: "20px 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>III. Đính kèm</h4>
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", width: "100%", marginBottom: "10px" }}>
                <table className="table" style={{ fontSize: "13px", width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#f8fafc" }}>
                    <tr>
                      <th style={{ width: "50px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1" }}>STT</th>
                      <th style={{ textAlign: "left", color: "#003466", textTransform: "uppercase", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1" }}>Tên tài liệu / mô tả</th>
                      <th style={{ width: "400px", textAlign: "left", color: "#003466", textTransform: "uppercase", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1" }}>Tệp đính kèm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachmentList.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                          Không có tệp đính kèm nào.
                        </td>
                      </tr>
                    ) : (
                      attachmentList.map((att, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ textAlign: "center", fontWeight: 500, padding: "8px" }}>{idx + 1}</td>
                          <td style={{ padding: "8px" }}>{att.name || "—"}</td>
                          <td style={{ padding: "8px" }}>
                            {att.fileName ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span 
                                  style={{ fontSize: "12px", color: "#1e293b", fontWeight: 500, cursor: "pointer", textDecoration: "underline" }}
                                  onClick={() => setPreviewFile(att)}
                                  title="Nhấn để xem trực tiếp"
                                >
                                  📄 {att.fileName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPreviewFile(att)}
                                  style={{ fontSize: "11px", color: "#059669", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "2px 8px", borderRadius: "4px", fontWeight: 700, cursor: "pointer" }}
                                >
                                  👁️ Xem trực tiếp
                                </button>
                                <a
                                  href={att.fileContent}
                                  download={att.fileName}
                                  style={{ fontSize: "11px", color: "#2563eb", textDecoration: "underline", fontWeight: 700 }}
                                >
                                  Tải xuống
                                </a>
                              </div>
                            ) : (
                              <span style={{ fontSize: "12px", color: "#64748b" }}>Chưa đính kèm tệp</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="sapo-btn sapo-btn-secondary" onClick={handleClose}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standardized Mobile Approval Confirmation Modal (createPortal + translateY(-45px) + CheckCircle2/XCircle + Đồng ý/Thoát) */}
      {typeof window !== "undefined" && confirmAction && createPortal(
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999,
          padding: "16px"
        }}>
          <div style={{
            width: "100%",
            maxWidth: "300px",
            padding: "18px 16px 14px 16px",
            textAlign: "center",
            borderRadius: "16px",
            background: "#ffffff",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            transform: "translateY(-45px)"
          }}>
            {/* Centered Circular Icon */}
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: confirmAction.type === "APPROVE" ? "#e0f2fe" : "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 10px auto"
            }}>
              {confirmAction.type === "APPROVE" ? (
                <CheckCircle2 size={22} color="#003466" strokeWidth={2.2} />
              ) : (
                <XCircle size={22} color="#ef4444" strokeWidth={2.2} />
              )}
            </div>

            {/* Simple content text */}
            <div style={{
              fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
              fontSize: "13px",
              fontWeight: 400,
              color: "#334155",
              marginBottom: confirmAction.type === "REJECT" ? "10px" : "14px",
              lineHeight: "1.3"
            }}>
              {confirmAction.type === "APPROVE" ? "Bạn có chắc chắn phê duyệt không?" : 
               confirmAction.type === "REJECT" ? "Bạn có chắc chắn từ chối không?" :
               "Bạn có chắc chắn bỏ duyệt không?"}
            </div>

            {confirmAction.type === "REJECT" && (
              <div style={{ marginBottom: "14px", textAlign: "left" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px", fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}>
                  Lý do từ chối <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input 
                  type="text" 
                  style={{
                    width: "100%",
                    height: "34px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    padding: "0 10px",
                    fontSize: "12px",
                    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                    outline: "none"
                  }}
                  placeholder="Nhập lý do từ chối..." 
                  value={rejectReason} 
                  onChange={(e) => setRejectReason(e.target.value)} 
                  required
                />
              </div>
            )}

            {/* Action Buttons: Thoát & Đồng ý */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  height: "36px",
                  borderRadius: "8px",
                  background: "#f1f5f9",
                  color: "#334155",
                  fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                  fontSize: "13px",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer"
                }}
                onClick={() => setConfirmAction(null)}
              >
                Thoát
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  height: "36px",
                  borderRadius: "8px",
                  background: confirmAction.type === "APPROVE" ? "#003466" : "#ef4444",
                  color: "#ffffff",
                  fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer"
                }}
                onClick={executeAction}
                disabled={isPending}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}
