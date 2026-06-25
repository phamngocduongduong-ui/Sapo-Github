"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { 
  Plus, Trash2, Pencil, Send, Undo2, History, X, Eye, ArrowRightLeft, Calendar, AlertTriangle, CheckCircle, Search, ChevronDown
} from "lucide-react";
import { 
  getProposals, createProposal, updateProposal, 
  deleteProposal, updateProposalStatus, getBranches, getUnits
} from "./actions";
import HistoryModal from "../../HistoryModal";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";

export default function PurchasingProposalPage() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingProposal, setEditingProposal] = useState<any | null>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [attachmentList, setAttachmentList] = useState<any[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState<{ id: string, status: string, info: string } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  
  const [isPending, startTransition] = useTransition();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useRealTimeSync("purchasing-proposals-direct", proposals, setProposals, 3000, showModal);

  // Filters
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const selectedProposal = useMemo(() => {
    return proposals.find((p) => p.id === selectedProposalId) || null;
  }, [proposals, selectedProposalId]);

  useEffect(() => {
    const handleClick = () => setSelectedProposalId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    fetchData();
    fetchBranches();
    fetchUser();
    fetchUnits();
  }, []);

  useEffect(() => {
    if (showModal) {
      fetchUnits();
    }
  }, [showModal]);

  async function fetchData() {
    const data = await getProposals();
    setProposals(data);
  }

  async function fetchBranches() {
    const data = await getBranches();
    setBranches(data);
  }

  async function fetchUnits() {
    try {
      const data = await getUnits();
      setUnits(data);
    } catch (e) {
      console.error("Failed to fetch units", e);
    }
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
  }, [proposals, filterSearch, filterStatus, filterBranch, filterMonth]);

  const uniqueBranches = useMemo(() => {
    const list = Array.from(new Set(proposals.map((p) => p.branch))).filter(Boolean);
    if (filterBranch && !list.includes(filterBranch)) {
      list.push(filterBranch);
    }
    return list.sort();
  }, [proposals, filterBranch]);

  const handleAddDetail = () => {
    setDetails([
      ...details, 
      { productName: "", techStandard: "", unit: "", quantity: 1, price: 0, amount: 0, note: "" }
    ]);
  };

  const handleRemoveDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  const handleDetailChange = (index: number, field: string, value: any) => {
    const newDetails = [...details];
    newDetails[index][field] = value;

    if (field === "quantity" || field === "price") {
      const qty = parseFloat(newDetails[index].quantity) || 0;
      const prc = parseFloat(newDetails[index].price) || 0;
      newDetails[index].amount = qty * prc;
    }
    setDetails(newDetails);
  };

  const handleInputBlur = (index: number, field: string, value: string) => {
    if (!value) return;
    const capitalized = value.trim().charAt(0).toUpperCase() + value.trim().slice(1);
    const newDetails = [...details];
    newDetails[index][field] = capitalized;
    setDetails(newDetails);
  };

  const openAddModal = () => {
    setEditingProposal(null);
    setDetails([]);
    setAttachmentList([]);
    setIsViewMode(false);
    setShowModal(true);
  };

  const handleEdit = (proposal: any) => {
    setEditingProposal(proposal);
    setDetails(proposal.items || []);
    const atts = proposal.attachments ? JSON.parse(proposal.attachments) : [];
    setAttachmentList(atts);
    setIsViewMode(false);
    setShowModal(true);
  };

  const handleView = (proposal: any) => {
    setEditingProposal(proposal);
    setDetails(proposal.items || []);
    const atts = proposal.attachments ? JSON.parse(proposal.attachments) : [];
    setAttachmentList(atts);
    setIsViewMode(true);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingProposal(null);
    setIsViewMode(false);
    setDetails([]);
    setAttachmentList([]);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (details.length === 0) {
      alert("Vui lòng thêm ít nhất một hàng hóa chi tiết");
      return;
    }

    // Capitalize inputs on submit as fallback safety
    const formattedDetails = details.map(d => ({
      ...d,
      productName: d.productName.trim().charAt(0).toUpperCase() + d.productName.trim().slice(1),
      techStandard: d.techStandard ? d.techStandard.trim().charAt(0).toUpperCase() + d.techStandard.trim().slice(1) : "",
      unit: d.unit ? d.unit.trim().charAt(0).toUpperCase() + d.unit.trim().slice(1) : "",
    }));

    startTransition(async () => {
      try {
        if (editingProposal) {
          await updateProposal(editingProposal.id, formData, formattedDetails);
        } else {
          await createProposal(formData, formattedDetails);
        }
        handleClose();
        fetchData();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleStatusChange = (id: string, status: string, info: string) => {
    setConfirmUpdate({ id, status, info });
  };

  const executeStatusChange = () => {
    if (!confirmUpdate) return;
    const { id, status } = confirmUpdate;
    setConfirmUpdate(null);
    startTransition(async () => {
      try {
        await updateProposalStatus(id, status);
        fetchData();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleDelete = (id: string, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đề nghị ${code} không?`)) return;
    startTransition(async () => {
      try {
        await deleteProposal(id);
        fetchData();
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  return (
    <div className="maintenance-page-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        .maintenance-page-container {
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
        .maintenance-page-container .breadcrumb-banner {
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
        .sapo-btn-teal {
          background-color: #0d9488;
        }
        .sapo-btn-teal:hover {
          background-color: #0f766e;
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
          min-width: 1320px !important;
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
            margin-bottom: 10px !important;
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
      ` }} />

      <div className="breadcrumb-banner">
        ĐỀ NGHỊ MUA HÀNG
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
          <label className="filter-label">Trạng thái</label>
          <select 
            className="form-control" 
            style={{ width: "100%" }} 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">-- Tất cả trạng thái --</option>
            <option value="Tạo mới">Tạo mới</option>
            <option value="Chờ duyệt">Chờ duyệt</option>
            <option value="Chờ mua">Chờ mua</option>
            <option value="Đã phê duyệt">Đã phê duyệt</option>
            <option value="Từ chối">Từ chối</option>
            <option value="Hoàn thành">Hoàn thành</option>
            <option value="Đã hủy">Đã hủy</option>
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
            <button
              type="button"
              className="sapo-btn"
              onClick={openAddModal}
            >
              Thêm mới
            </button>

            {selectedProposal && (
              <>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => handleView(selectedProposal)}
                >
                  Xem
                </button>

                {selectedProposal.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleEdit(selectedProposal)}
                  >
                    Sửa
                  </button>
                )}

                {selectedProposal.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusChange(selectedProposal.id, "Chờ duyệt", selectedProposal.proposalCode)}
                  >
                    Gửi
                  </button>
                )}

                {selectedProposal.status === "Chờ duyệt" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusChange(selectedProposal.id, "Tạo mới", selectedProposal.proposalCode)}
                  >
                    Thu hồi
                  </button>
                )}

                {(selectedProposal.status === "Chờ mua" || selectedProposal.status === "Đã phê duyệt") && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusChange(selectedProposal.id, "Hoàn thành", selectedProposal.proposalCode)}
                  >
                    Hoàn thành
                  </button>
                )}

                {selectedProposal.status !== "Hoàn thành" && selectedProposal.status !== "Đã hủy" && selectedProposal.status !== "Từ chối" && selectedProposal.status !== "Đã phê duyệt" && selectedProposal.status !== "Chờ mua" && (
                  <button
                    type="button"
                    className="sapo-btn sapo-btn-danger"
                    onClick={() => handleStatusChange(selectedProposal.id, "Đã hủy", selectedProposal.proposalCode)}
                  >
                    Hủy
                  </button>
                )}

                {(currentUser?.isAdmin || currentUser?.username === "admin" || currentUser?.role === "Admin") && (
                  <button
                    type="button"
                    className="sapo-btn sapo-btn-danger"
                    onClick={() => handleDelete(selectedProposal.id, selectedProposal.proposalCode)}
                  >
                    Xóa
                  </button>
                )}

                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => setHistoryRecordId(selectedProposal.id)}
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
                        onDoubleClick={() => handleView(item)}
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
                              item.status === "Đã phê duyệt" || item.status === "Chờ mua" || item.status === "Hoàn thành"
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
                    onDoubleClick={() => handleView(item)}
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
                          item.status === "Đã phê duyệt" || item.status === "Chờ mua" || item.status === "Hoàn thành"
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
          tableName="PurchasingProposal" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {/* Add / Edit / View Proposal Modal */}
      {showModal && (
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
            <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 24px", margin: 0, background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", fontSize: "16px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              {isViewMode ? (
                <>
                  <span>🔍 Xem chi tiết đề nghị:</span>
                  <span style={{ color: "#ff5c00" }}>{editingProposal?.proposalCode}</span>
                </>
              ) : editingProposal ? (
                <>
                  <span>✏️ Chỉnh sửa đề nghị:</span>
                  <span style={{ color: "#ff5c00" }}>{editingProposal?.proposalCode}</span>
                </>
              ) : (
                <span>📦 Thêm mới đề nghị mua hàng</span>
              )}
            </h3>

            {/* Scrollable Form Body Container */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="scrollable-body" style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
                
                {/* SECTION 1: General Info */}
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
                  {/* Row for Số đề nghị & Ngày đề nghị on mobile */}
                  <div className="proposal-code-date-row" style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                    <div>
                      <label className="filter-label">Số đề nghị</label>
                      <input 
                        type="text" 
                        className="input" 
                        style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }}
                        value={editingProposal ? editingProposal.proposalCode : "Hệ thống tự tạo"} 
                        readOnly 
                      />
                    </div>
                    <div>
                      <label className="filter-label">Ngày đề nghị</label>
                      <input 
                        type="text" 
                        className="input" 
                        style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }}
                        value={editingProposal ? new Date(editingProposal.proposalDate).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")} 
                        readOnly 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="filter-label">Người đề nghị</label>
                    <input 
                      type="text" 
                      className="input" 
                      style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }}
                      value={editingProposal ? editingProposal.proposer : (currentUser?.employeeName || currentUser?.username || "")} 
                      readOnly 
                    />
                  </div>

                  <div>
                    <label className="filter-label">Chi nhánh <span style={{ color: "red" }}>(*)</span></label>
                    {editingProposal ? (
                      <input 
                        type="text" 
                        className="input" 
                        style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }}
                        value={editingProposal.branch} 
                        readOnly 
                      />
                    ) : (
                      currentUser?.allowedBranches?.length > 1 ? (
                        <select name="branch" className="input" style={{ width: "100%" }} required defaultValue={currentUser?.branch || ""}>
                          <option value="" disabled>-- Chọn chi nhánh --</option>
                          {currentUser.allowedBranches.map((b: string) => (
                            <option key={b.trim()} value={b.trim()}>{b.trim()}</option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          type="text" 
                          name="branch" 
                          className="input" 
                          style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }}
                          value={currentUser?.branch || ""} 
                          readOnly 
                        />
                      )
                    )}
                  </div>

                  <div>
                    <label className="filter-label">Mục đích *</label>
                    <select 
                      name="purpose" 
                      className="input" 
                      style={{ width: "100%" }}
                      required 
                      disabled={isViewMode} 
                      defaultValue={editingProposal?.purpose || "Mua nguyên liệu/Hàng hóa"}
                    >
                      <option value="Mua nguyên liệu/Hàng hóa">Mua nguyên liệu/Hàng hóa</option>
                      <option value="Mua vật tư sản xuất">Mua vật tư sản xuất</option>
                      <option value="Mua vật tư bảo trì">Mua vật tư bảo trì</option>
                      <option value="Mua TSCD">Mua TSCD</option>
                      <option value="Mua dịch vụ">Mua dịch vụ</option>
                      <option value="Mua khác">Mua khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="filter-label">Tình trạng *</label>
                    <select 
                      name="urgency" 
                      className="input" 
                      style={{ width: "100%" }}
                      required 
                      disabled={isViewMode} 
                      defaultValue={editingProposal?.urgency || "Không khẩn cấp"}
                    >
                      <option value="Khẩn cấp">Khẩn cấp</option>
                      <option value="Không khẩn cấp">Không khẩn cấp</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label className="filter-label">Ghi chú chung</label>
                    <input 
                      type="text" 
                      name="note" 
                      className="input" 
                      style={{ width: "100%" }}
                      disabled={isViewMode} 
                      defaultValue={editingProposal?.note || ""} 
                      placeholder="Ghi chú nội dung lý do đề nghị..." 
                    />
                  </div>
                </div>

                {/* SECTION 2: Proposal Items Details */}
                <h4 style={{ margin: "20px 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>II. Chi tiết đề nghị</h4>
                
                <div className="responsive-table-wrapper" style={{ overflowX: "auto", overflowY: "hidden", border: "1px solid #e2e8f0", borderRadius: "8px", width: "100%" }}>
                  <table className="table tab3-goods-table tab3-goods-table-cards" style={{ fontSize: "13px", width: "100%", minWidth: "1215px", tableLayout: "fixed" }}>
                    <thead style={{ background: "#f8fafc" }}>
                      <tr>
                        <th style={{ width: "250px", padding: "5px 6px", textAlign: "center" }}>Tên hàng hóa *</th>
                        <th style={{ width: "250px", padding: "5px 6px", textAlign: "center" }}>Tiêu chuẩn kỹ thuật</th>
                        <th style={{ width: "95px", padding: "5px 6px", textAlign: "center" }}>ĐVT *</th>
                        <th style={{ width: "90px", padding: "5px 6px", textAlign: "center" }}>Số lượng *</th>
                        <th style={{ width: "110px", padding: "5px 6px", textAlign: "center" }}>Đơn giá</th>
                        <th style={{ width: "120px", padding: "5px 6px", textAlign: "center" }}>Thành tiền</th>
                        <th style={{ width: "250px", padding: "5px 6px", textAlign: "center" }}>Ghi chú</th>
                        {!isViewMode && <th style={{ width: "50px", padding: "5px 6px", textAlign: "center" }}>#</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {details.length === 0 ? (
                        <tr>
                          <td colSpan={isViewMode ? 7 : 8} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                            Chưa có chi tiết đề nghị hàng hóa
                          </td>
                        </tr>
                      ) : (
                        details.map((d, index) => (
                          <tr key={index}>
                            <td data-label="Tên hàng" style={{ padding: "5px 6px" }}>
                              <input 
                                type="text"
                                className="input-sm"
                                style={{ 
                                  textOverflow: "ellipsis", 
                                  whiteSpace: "nowrap", 
                                  overflow: "hidden" 
                                }}
                                value={d.productName}
                                onChange={(e) => handleDetailChange(index, "productName", e.target.value)}
                                onBlur={(e) => handleInputBlur(index, "productName", e.target.value)}
                                placeholder="Tên hàng..."
                                required
                                disabled={isViewMode}
                                title={d.productName}
                              />
                            </td>
                            <td data-label="TC kỹ thuật" style={{ padding: "5px 6px" }}>
                              <input 
                                type="text"
                                className="input-sm"
                                style={{ 
                                  textOverflow: "ellipsis", 
                                  whiteSpace: "nowrap", 
                                  overflow: "hidden" 
                                }}
                                value={d.techStandard}
                                onChange={(e) => handleDetailChange(index, "techStandard", e.target.value)}
                                onBlur={(e) => handleInputBlur(index, "techStandard", e.target.value)}
                                placeholder="TCKT..."
                                disabled={isViewMode}
                                title={d.techStandard}
                              />
                            </td>
                            <td data-label="ĐVT" style={{ padding: "5px 6px" }}>
                              <select 
                                className="input-sm"
                                value={d.unit || ""}
                                onChange={(e) => handleDetailChange(index, "unit", e.target.value)}
                                required
                                disabled={isViewMode}
                              >
                                <option value="" disabled>ĐVT...</option>
                                {units.map((u: any) => (
                                  <option key={u.id} value={u.name}>
                                    {u.name}
                                  </option>
                                ))}
                                {d.unit && !units.some((u: any) => u.name === d.unit) && (
                                  <option value={d.unit}>{d.unit}</option>
                                )}
                              </select>
                            </td>
                            <td data-label="Số lượng" style={{ padding: "5px 6px" }}>
                              {isViewMode ? (
                                <div style={{ textAlign: "center", fontSize: "13px" }}>
                                  {Number(d.quantity).toLocaleString("en-US")}
                                </div>
                              ) : (
                                <input 
                                  type="number"
                                  className="input-sm"
                                  style={{ textAlign: "center" }}
                                  value={d.quantity}
                                  min="0.001"
                                  step="any"
                                  onChange={(e) => handleDetailChange(index, "quantity", e.target.value)}
                                  required
                                />
                              )}
                            </td>
                            <td data-label="Đơn giá" style={{ padding: "5px 6px" }}>
                              {isViewMode ? (
                                <div style={{ textAlign: "right", fontSize: "13px" }}>
                                  {Number(d.price).toLocaleString("en-US")}
                                </div>
                              ) : (
                                <input 
                                  type="number"
                                  className="input-sm"
                                  style={{ textAlign: "right" }}
                                  value={d.price}
                                  min="0"
                                  step="any"
                                  onChange={(e) => handleDetailChange(index, "price", e.target.value)}
                                  required
                                />
                              )}
                            </td>
                            <td data-label="Thành tiền" style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>
                              {(d.amount || 0).toLocaleString("en-US")}
                            </td>
                            <td data-label="Ghi chú" style={{ padding: "5px 6px" }}>
                              <input 
                                type="text"
                                className="input-sm"
                                value={d.note}
                                onChange={(e) => handleDetailChange(index, "note", e.target.value)}
                                placeholder="Ghi chú..."
                                disabled={isViewMode}
                              />
                            </td>
                            {!isViewMode && (
                              <td data-label="Thao tác" style={{ padding: "5px 6px", textAlign: "center" }}>
                                <button 
                                  type="button" 
                                  className="action-btn text-red-500 hover:text-red-700" 
                                  onClick={() => handleRemoveDetail(index)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {!isViewMode && (
                  <button 
                    type="button" 
                    className="sapo-btn" 
                    onClick={handleAddDetail}
                    style={{ marginTop: "10px" }}
                  >
                    <Plus size={14} /> Thêm mặt hàng
                  </button>
                )}

                {/* SECTION 3: Attachments */}
                <h4 style={{ margin: "20px 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>III. Đính kèm</h4>
                <input type="hidden" name="attachments" value={JSON.stringify(attachmentList)} />
                
                {!isViewMode && (
                  <button
                    type="button"
                    className="sapo-btn"
                    style={{ fontSize: "12px", marginBottom: "12px" }}
                    onClick={() => {
                      setAttachmentList([...attachmentList, { name: "", fileName: "", fileContent: "" }]);
                    }}
                  >
                    <Plus size={14} /> Thêm tệp đính kèm
                  </button>
                )}

                <div className="responsive-table-wrapper" style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", width: "100%", marginBottom: "10px" }}>
                  <table className="table" style={{ fontSize: "13px", width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#f8fafc" }}>
                      <tr>
                        <th style={{ width: "50px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1" }}>STT</th>
                        <th style={{ textAlign: "left", color: "#003466", textTransform: "uppercase", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1" }}>Tên tài liệu / mô tả</th>
                        <th style={{ width: "400px", textAlign: "left", color: "#003466", textTransform: "uppercase", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1" }}>Tệp đính kèm</th>
                        {!isViewMode && <th style={{ width: "80px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1" }}>Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {attachmentList.length === 0 ? (
                        <tr>
                          <td colSpan={isViewMode ? 3 : 4} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                            Không có tệp đính kèm nào.
                          </td>
                        </tr>
                      ) : (
                        attachmentList.map((att, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ textAlign: "center", fontWeight: 500, padding: "8px" }}>{idx + 1}</td>
                            <td style={{ padding: "8px" }}>
                              <input
                                type="text"
                                className="input-sm"
                                placeholder="Nhập tên/mô tả tài liệu..."
                                value={att.name}
                                disabled={isViewMode}
                                onChange={(e) => {
                                  const newList = [...attachmentList];
                                  newList[idx].name = e.target.value;
                                  setAttachmentList(newList);
                                }}
                                style={{ width: "100%" }}
                              />
                            </td>
                            <td style={{ padding: "8px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {!isViewMode && (
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (evt) => {
                                          const content = evt.target?.result as string;
                                          const newList = [...attachmentList];
                                          newList[idx].fileName = file.name;
                                          newList[idx].fileContent = content;
                                          setAttachmentList(newList);
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                    style={{ fontSize: "12px", width: "100%" }}
                                  />
                                )}
                                {att.fileName ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                                    <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: 500 }}>📄 {att.fileName}</span>
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
                              </div>
                            </td>
                            {!isViewMode && (
                              <td style={{ textAlign: "center", padding: "8px" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttachmentList(attachmentList.filter((_, i) => i !== idx));
                                  }}
                                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 600 }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sticky Footer */}
              <div style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="sapo-btn sapo-btn-secondary" onClick={handleClose}>
                  Đóng
                </button>
                {!isViewMode && (
                  <button 
                    type="submit" 
                    className="sapo-btn" 
                    disabled={isPending || details.length === 0}
                  >
                    {isPending ? "Đang lưu..." : "Lưu thông tin"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation & Status Change Popups */}
      {confirmUpdate && (
        <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
          <div className="modal-content-base" style={{ maxWidth: "450px", width: "90%", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", textAlign: "center" }}>
            <div style={{ 
              width: "60px", 
              height: "60px", 
              borderRadius: "50%", 
              background: (confirmUpdate.status === "DELETE" || confirmUpdate.status === "Đã hủy") ? "#fef2f2" : "#fff7ed", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto 1.25rem",
              color: (confirmUpdate.status === "DELETE" || confirmUpdate.status === "Đã hủy") ? "#ef4444" : "#f97316"
            }}>
              {(confirmUpdate.status === "DELETE" || confirmUpdate.status === "Đã hủy") ? <AlertTriangle size={32} /> : <CheckCircle size={32} />}
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: "0 auto 0.75rem", color: "#1e293b" }}>
              {confirmUpdate.status === "Chờ duyệt" ? "Gửi phê duyệt" : 
               confirmUpdate.status === "Tạo mới" ? "Thu hồi đề nghị" : 
               confirmUpdate.status === "Hoàn thành" ? "Hoàn thành đề nghị" : 
               confirmUpdate.status === "Đã hủy" ? "Hủy đề nghị" : 
               "Xác nhận thay đổi"}
            </h3>
            <div style={{ color: "#475569", lineHeight: "1.6", margin: "0 auto 1.75rem" }}>
              {confirmUpdate.status === "Chờ duyệt" ? (
                <>
                  <p style={{ margin: 0 }}>Bạn có chắc muốn gửi đề nghị <strong>{confirmUpdate.info}</strong> để chờ phê duyệt không?</p>
                  <p style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "600", background: "#fef2f2", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                    ⚠️ Đề nghị sẽ không được sửa đổi khi đang chờ phê duyệt.
                  </p>
                </>
              ) : confirmUpdate.status === "Tạo mới" ? (
                <>
                  <p style={{ margin: 0 }}>Bạn có chắc muốn thu hồi đề nghị <strong>{confirmUpdate.info}</strong> về trạng thái nháp không?</p>
                </>
              ) : confirmUpdate.status === "Hoàn thành" ? (
                <>
                  <p style={{ margin: 0 }}>Bạn có chắc muốn hoàn thành đề nghị <strong>{confirmUpdate.info}</strong>?</p>
                  <p style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "600", background: "#ecfdf5", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                    Đề nghị sẽ chuyển sang trạng thái "Hoàn thành".
                  </p>
                </>
              ) : confirmUpdate.status === "Đã hủy" ? (
                <>
                  <p style={{ margin: 0 }}>Bạn có chắc muốn hủy đề nghị <strong>{confirmUpdate.info}</strong> không?</p>
                  <p style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "600", background: "#fef2f2", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                    Sau khi hủy, đề nghị sẽ không thể chỉnh sửa hoặc thực hiện phê duyệt tiếp.
                  </p>
                </>
              ) : (
                <p style={{ margin: 0 }}>Chuyển trạng thái đề nghị mua sang <strong>"{confirmUpdate.status}"</strong>?</p>
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
                  backgroundColor: confirmUpdate.status === "Đã hủy" ? "#ef4444" : "#003466",
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
