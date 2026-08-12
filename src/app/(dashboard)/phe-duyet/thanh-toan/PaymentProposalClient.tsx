"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { 
  createPaymentProposal, 
  updateProposalStatus, 
  deletePaymentProposal 
} from "./actions";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { User, CheckCircle2, XCircle } from "lucide-react";

interface Supplier {
  id: string;
  code: string;
  name: string;
  bankAccountInfo: string;
}

interface PaymentProposalItem {
  id: string;
  content: string;
  unit: string | null;
  quantity: number;
  price: number;
  amount: number;
  rate: number;
  total: number;
}

interface PaymentProposal {
  id: string;
  proposalNumber: string;
  date: string | Date;
  proposer: string;
  supplierCode: string | null;
  supplierName: string | null;
  accountInfo: string | null;
  purpose: string | null;
  status: string;
  note: string | null;
  createdAt: string | Date;
  items: PaymentProposalItem[];
}

interface PaymentProposalClientProps {
  initialProposals: PaymentProposal[];
  suppliers: Supplier[];
  currentUserName: string;
  nextProposalNumber: string;
  isApprovalPage?: boolean;
}

export default function PaymentProposalClient({
  initialProposals,
  suppliers,
  currentUserName,
  nextProposalNumber,
  isApprovalPage = false
}: PaymentProposalClientProps) {
  const router = useRouter();
  const [suppliersList, setSuppliersList] = useState<Supplier[]>(suppliers);
  useRealTimeSync("suppliers", suppliersList, setSuppliersList, 3000, false);
  const [proposals, setProposals] = useState<PaymentProposal[]>(initialProposals);
  const [isPending, startTransition] = useTransition();

  // Active tab state: "new" (Tạo mới), "manager" (Chờ quản lý phê duyệt), "debt" (Chờ duyệt công nợ), "ktt" (Chờ KTT), "director" (Chờ GĐ), "waiting_payment" (Chờ thanh toán), "done" (Hoàn thành)
  const [activeTab, setActiveTab] = useState<"new" | "manager" | "debt" | "ktt" | "director" | "waiting_payment" | "done">("new");

  // Selection & Expansion state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);

  // Form states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customConfirm, setCustomConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [formActiveTab, setFormActiveTab] = useState(1);
  const [purpose, setPurpose] = useState("");
  const [note, setNote] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [bankAccountInfo, setBankAccountInfo] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  useRealTimeSync("payment-proposals", proposals, setProposals, 3000, isCreateOpen || customConfirm !== null);

  // Form detail items
  const [formItems, setFormItems] = useState<Array<{
    content: string;
    unit: string;
    quantity: number;
    price: number;
    rate: number;
  }>>([
    { content: "", unit: "", quantity: 1, price: 0, rate: 0 }
  ]);

  // Handle clicking outside supplier dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSupplierOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter suppliers based on search query
  const filteredSuppliers = suppliersList.filter(s => 
    s.code.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  // Group proposals by status
  const proposalsNew = proposals.filter(p => p.status === "Tạo mới");
  const proposalsManager = proposals.filter(p => p.status === "Chờ quản lý phê duyệt");
  const proposalsDebt = proposals.filter(p => p.status === "Chờ phê duyệt công nợ");
  const proposalsKTT = proposals.filter(p => p.status === "Chờ KTT phê duyệt");
  const proposalsDirector = proposals.filter(p => p.status === "Chờ giám đốc phê duyệt");
  const proposalsWaitingPayment = proposals.filter(p => p.status === "Chờ thanh toán");
  const proposalsDone = proposals.filter(p => p.status === "Hoàn thành");

  // Clear selection on tab change
  useEffect(() => {
    setSelectedProposalId(null);
    setExpandedId(null);
  }, [activeTab]);

  const selectedProposal = proposals.find(p => p.id === selectedProposalId) || null;

  // Form details calculation helpers
  const handleItemChange = (index: number, key: string, value: string | number) => {
    setFormItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const addFormItem = () => {
    setFormItems(prev => [...prev, { content: "", unit: "", quantity: 1, price: 0, rate: 0 }]);
  };

  const removeFormItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  // Submit form handler
  const handleSaveProposal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplier) {
      alert("Vui lòng chọn Nhà cung cấp.");
      return;
    }

    if (formItems.some(item => !item.content.trim())) {
      alert("Vui lòng nhập Nội dung cho tất cả các dòng chi tiết.");
      return;
    }

    startTransition(async () => {
      try {
        await createPaymentProposal({
          proposer: currentUserName,
          supplierCode: selectedSupplier.code,
          supplierName: selectedSupplier.name,
          accountInfo: bankAccountInfo,
          purpose,
          note,
          items: formItems
        });
        
        // Reset form
        setPurpose("");
        setNote("");
        setSelectedSupplier(null);
        setSupplierSearch("");
        setBankAccountInfo("");
        setFormItems([{ content: "", unit: "", quantity: 1, price: 0, rate: 0 }]);
        setIsCreateOpen(false);
        alert("Thêm đề nghị thanh toán thành công!");
        router.refresh();
      } catch (err: any) {
        alert(err.message || "Lỗi khi lưu đề nghị thanh toán.");
      }
    });
  };

  // Action status updates
  const handleStatusUpdate = async (id: string, nextStatus: string, actionLabel: string) => {
    setCustomConfirm({
      message: `Bạn có chắc chắn muốn ${actionLabel} đề nghị thanh toán này?`,
      onConfirm: () => {
        setCustomConfirm(null);
        startTransition(async () => {
          try {
            await updateProposalStatus(id, nextStatus);
            setSelectedProposalId(null);
            setExpandedId(null);
            router.refresh();
          } catch (err: any) {
            alert(err.message || "Có lỗi xảy ra.");
          }
        });
      }
    });
  };

  const handleDeleteProposal = async (id: string) => {
    setCustomConfirm({
      message: "Bạn có chắc chắn muốn xóa đề nghị thanh toán này?",
      onConfirm: () => {
        setCustomConfirm(null);
        startTransition(async () => {
          try {
            await deletePaymentProposal(id);
            setSelectedProposalId(null);
            setExpandedId(null);
            router.refresh();
          } catch (err: any) {
            alert(err.message || "Có lỗi xảy ra.");
          }
        });
      }
    });
  };

  // Calculate sum totals for the active form
  const formTotalAmount = formItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const formTotalPayment = formItems.reduce((sum, item) => {
    const amount = item.quantity * item.price;
    return sum + (amount - (amount * (item.rate || 0) / 100));
  }, 0);

  // Get active list to render
  const getActiveList = () => {
    switch (activeTab) {
      case "new": return proposalsNew;
      case "manager": return proposalsManager;
      case "debt": return proposalsDebt;
      case "ktt": return proposalsKTT;
      case "director": return proposalsDirector;
      case "waiting_payment": return proposalsWaitingPayment;
      case "done": return proposalsDone;
      default: return [];
    }
  };

  const activeList = getActiveList();

  const getFormTabButtonStyle = (tabNum: number) => ({
    padding: "8px 12px",
    border: "none",
    background: "none",
    cursor: "pointer",
    borderBottom: formActiveTab === tabNum ? "2px solid #ff5c00" : "2px solid transparent",
    fontWeight: formActiveTab === tabNum ? 700 : 500,
    color: formActiveTab === tabNum ? "#ff5c00" : "#4b5563",
    fontSize: "13px",
    transition: "all 0.15s ease",
    marginBottom: "-2px",
    whiteSpace: "nowrap" as const,
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .payment-page-container {
          width: 100%;
          min-width: 0;
        }
        .employee-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px 10px 0px;
        }
        .employee-layout input,
        .employee-layout select,
        .employee-layout textarea,
        .employee-layout button,
        .employee-layout table,
        .employee-layout td,
        .employee-layout th,
        .employee-layout label,
        .employee-layout .badge,
        .payment-page-container .breadcrumb-banner {
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
        .tab-bar-container {
          margin-top: 10px !important; /* Distance with title frame: 10px */
          display: flex;
          gap: 0.5rem;
          flex-wrap: nowrap;
          align-items: center;
          overflow-x: auto;
          padding: 2px 0px;
        }
        .panel-full {
          flex: 1 1 100%;
          width: 100%;
          min-width: 0;
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
          transition: background-color 0.2s, border-color 0.2s !important;
          border: 1px solid #003466 !important;
          height: 32px !important;
        }
        .sapo-btn:hover {
          background-color: #002244;
          border-color: #002244 !important;
          border-top: 1px solid #002244 !important; /* Keep top border */
        }
        .sapo-btn.btn-outline {
          background-color: white !important;
          color: #003466 !important;
          border: 1px solid #003466 !important;
        }
        .sapo-btn.btn-outline:hover {
          background-color: #f0f7ff !important;
          border-color: #003466 !important;
          border-top: 1px solid #003466 !important; /* Keep top border */
        }
        /* Disable click transform scale effects */
        .sapo-btn:active, .sapo-btn.btn-outline:active {
          transform: none !important;
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
          padding-bottom: 0px !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          table-layout: auto !important;
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
          padding: 2px 0.75rem !important;
          vertical-align: middle !important;
          color: #000 !important;
          font-weight: 600 !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
        .nowrap, .base-table .nowrap {
          white-space: nowrap !important;
        }
        .code-pill {
          background: #e2e8f0 !important;
          color: #475569 !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          font-weight: 700 !important;
          font-family: monospace !important;
        }
        .status-pill {
          font-weight: 700;
        }
        .supplier-item-hover:hover {
          background-color: #f0f7ff;
        }
        .detail-row-cell {
          padding: 0 !important;
          background: #f8fafc;
        }
        .detail-box {
          padding: 1rem;
          border-bottom: 2px solid #003466;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }
        .detail-content {
          background: white;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem 1rem;
          margin-bottom: 1rem;
        }
        @media (max-width: 768px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }
        }
        .detail-item {
          display: flex;
          gap: 0.5rem;
        }
        .detail-label {
          color: #64748b;
          min-width: 120px;
        }
        .detail-value {
          font-weight: 600;
        }
        
        /* Custom Export-Contract Modal Styling */
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
          display: block;
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
          width: 100%;
          outline: none;
          background: #ffffff;
          font-size: 13px;
        }
        .custom-modal-overlay .input:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }
        .custom-modal-overlay textarea.input {
          height: auto !important;
        }
        `
      }} />

      <div className="payment-page-container">
        {/* Title Banner */}
        <div className="breadcrumb-banner">
          {isApprovalPage ? "PHÊ DUYỆT THANH TOÁN" : "KẾ TOÁN - THANH TOÁN"}
        </div>

        {/* Tab Selection Bar */}
        <div className="tab-bar-container">
          <button
            onClick={() => setActiveTab("new")}
            className={`sapo-btn ${activeTab === "new" ? "" : "btn-outline"}`}
          >
            Tạo mới ({proposalsNew.length})
          </button>
          <button
            onClick={() => setActiveTab("manager")}
            className={`sapo-btn ${activeTab === "manager" ? "" : "btn-outline"}`}
          >
            Chờ quản lý phê duyệt ({proposalsManager.length})
          </button>
          <button
            onClick={() => setActiveTab("debt")}
            className={`sapo-btn ${activeTab === "debt" ? "" : "btn-outline"}`}
          >
            Chờ phê duyệt công nợ ({proposalsDebt.length})
          </button>
          <button
            onClick={() => setActiveTab("ktt")}
            className={`sapo-btn ${activeTab === "ktt" ? "" : "btn-outline"}`}
          >
            Chờ KTT phê duyệt ({proposalsKTT.length})
          </button>
          <button
            onClick={() => setActiveTab("director")}
            className={`sapo-btn ${activeTab === "director" ? "" : "btn-outline"}`}
          >
            Chờ giám đốc phê duyệt ({proposalsDirector.length})
          </button>
          <button
            onClick={() => setActiveTab("waiting_payment")}
            className={`sapo-btn ${activeTab === "waiting_payment" ? "" : "btn-outline"}`}
          >
            Chờ thanh toán ({proposalsWaitingPayment.length})
          </button>
          <button
            onClick={() => setActiveTab("done")}
            className={`sapo-btn ${activeTab === "done" ? "" : "btn-outline"}`}
          >
            Hoàn thành ({proposalsDone.length})
          </button>
        </div>

        <div className="employee-layout">
          <div className="panel-full">
            <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center" }}>
              {!isApprovalPage && (
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => {
                    setIsCreateOpen(true);
                    setFormActiveTab(1);
                  }}
                >
                  Thêm mới
                </button>
              )}

              {selectedProposal && (
                <>
                  {selectedProposal.status === "Tạo mới" && !isApprovalPage && (
                    <>
                      <button
                        type="button"
                        className="sapo-btn"
                        onClick={() => handleStatusUpdate(selectedProposal.id, "Chờ quản lý phê duyệt", "trình thanh toán")}
                      >
                        Trình thanh toán
                      </button>
                      <button
                        type="button"
                        className="sapo-btn btn-outline"
                        style={{ color: "#ef4444", borderColor: "#ef4444" }}
                        onClick={() => handleDeleteProposal(selectedProposal.id)}
                      >
                        Xóa
                      </button>
                    </>
                  )}

                  {selectedProposal.status === "Chờ quản lý phê duyệt" && (
                    <>
                      <button
                        type="button"
                        className="sapo-btn"
                        onClick={() => handleStatusUpdate(selectedProposal.id, "Chờ phê duyệt công nợ", "phê duyệt")}
                      >
                        Quản lý duyệt
                      </button>
                      <button
                        type="button"
                        className="sapo-btn btn-outline"
                        style={{ color: "#ef4444", borderColor: "#ef4444" }}
                        onClick={() => handleStatusUpdate(selectedProposal.id, "Tạo mới", "từ chối")}
                      >
                        Từ chối
                      </button>
                    </>
                  )}

                  {selectedProposal.status === "Chờ phê duyệt công nợ" && (
                    <>
                      <button
                        type="button"
                        className="sapo-btn"
                        onClick={() => handleStatusUpdate(selectedProposal.id, "Chờ KTT phê duyệt", "phê duyệt công nợ")}
                      >
                        Duyệt công nợ
                      </button>
                      <button
                        type="button"
                        className="sapo-btn btn-outline"
                        style={{ color: "#ef4444", borderColor: "#ef4444" }}
                        onClick={() => handleStatusUpdate(selectedProposal.id, "Tạo mới", "từ chối")}
                      >
                        Từ chối
                      </button>
                    </>
                  )}

                  {selectedProposal.status === "Chờ KTT phê duyệt" && (
                    <>
                      <button
                        type="button"
                        className="sapo-btn"
                        onClick={() => handleStatusUpdate(selectedProposal.id, "Chờ giám đốc phê duyệt", "phê duyệt")}
                      >
                        KTT duyệt
                      </button>
                      <button
                        type="button"
                        className="sapo-btn btn-outline"
                        style={{ color: "#ef4444", borderColor: "#ef4444" }}
                        onClick={() => handleStatusUpdate(selectedProposal.id, "Tạo mới", "từ chối")}
                      >
                        Từ chối
                      </button>
                    </>
                  )}

                  {selectedProposal.status === "Chờ giám đốc phê duyệt" && (
                    <>
                      <button
                        type="button"
                        className="sapo-btn"
                        onClick={() => handleStatusUpdate(selectedProposal.id, "Chờ thanh toán", "phê duyệt")}
                      >
                        GĐ duyệt
                      </button>
                      <button
                        type="button"
                        className="sapo-btn btn-outline"
                        style={{ color: "#ef4444", borderColor: "#ef4444" }}
                        onClick={() => handleStatusUpdate(selectedProposal.id, "Tạo mới", "từ chối")}
                      >
                        Từ chối
                      </button>
                    </>
                  )}

                  {selectedProposal.status === "Chờ thanh toán" && (
                    <>
                      <button
                        type="button"
                        className="sapo-btn"
                        onClick={() => handleStatusUpdate(selectedProposal.id, "Hoàn thành", "xác nhận hoàn thành thanh toán")}
                      >
                        Xác nhận thanh toán
                      </button>
                      <button
                        type="button"
                        className="sapo-btn btn-outline"
                        style={{ color: "#ef4444", borderColor: "#ef4444" }}
                        onClick={() => handleStatusUpdate(selectedProposal.id, "Tạo mới", "từ chối")}
                      >
                        Từ chối
                      </button>
                    </>
                  )}

                  {selectedProposal.status === "Hoàn thành" && (
                    <span style={{ color: "#16a34a", fontSize: "13px", fontWeight: 700, marginLeft: "10px" }}>
                      ĐÃ HOÀN TẤT
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="base-table-wrapper" style={{ marginTop: "10px", minHeight: "150px" }}>
              <table className="base-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>STT</th>
                    <th style={{ width: "100px" }}>Mã đề nghị</th>
                    <th style={{ width: "110px" }}>Ngày lập</th>
                    <th style={{ width: "150px" }}>Người đề nghị</th>
                    <th>Nhà cung cấp</th>
                    <th>Mục đích</th>
                    <th style={{ width: "140px", textAlign: "right" }}>Tổng thanh toán (đ)</th>
                    <th style={{ width: "130px", textAlign: "center" }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", color: "#64748b", padding: "3rem" }}>
                        Không có đề nghị thanh toán nào trong phân mục này.
                      </td>
                    </tr>
                  ) : (
                    activeList.map((proposal, idx) => {
                      const isExpanded = expandedId === proposal.id;
                      const isSelected = selectedProposalId === proposal.id;
                      
                      // Calc total payment for this proposal
                      const proposalTotal = proposal.items.reduce((sum, item) => sum + item.total, 0);

                      // Trạng thái color
                      let statusColor = "#f59e0b";
                      if (proposal.status === "Chờ quản lý phê duyệt") statusColor = "#0ea5e9";
                      if (proposal.status === "Chờ phê duyệt công nợ") statusColor = "#2563eb";
                      if (proposal.status === "Chờ KTT phê duyệt") statusColor = "#7c3aed";
                      if (proposal.status === "Chờ giám đốc phê duyệt") statusColor = "#db2777";
                      if (proposal.status === "Chờ thanh toán") statusColor = "#d97706";
                      if (proposal.status === "Hoàn thành") statusColor = "#16a34a";

                      return (
                        <React.Fragment key={proposal.id}>
                          <tr
                            className={`row-hoverable ${isSelected ? "row-selected" : ""}`}
                            style={{ cursor: "pointer" }}
                            onClick={() => {
                              const nextSelected = isSelected ? null : proposal.id;
                              setSelectedProposalId(nextSelected);
                              setExpandedId(nextSelected);
                            }}
                          >
                            <td style={{ textAlign: "center", fontWeight: 600 }}>{idx + 1}</td>
                            <td>
                              <span className="code-pill">{proposal.proposalNumber}</span>
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {new Date(proposal.date).toLocaleDateString("vi-VN")}
                            </td>
                            <td style={{ fontWeight: 600 }}>{proposal.proposer}</td>
                            <td style={{ fontWeight: 600 }}>
                              {proposal.supplierCode ? `${proposal.supplierCode} - ${proposal.supplierName}` : "—"}
                            </td>
                            <td style={{ fontWeight: 600 }}>{proposal.purpose}</td>
                            <td style={{ textAlign: "right", fontWeight: 700, color: "#ff5c00" }}>
                              {proposalTotal.toLocaleString("vi-VN")}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className="status-pill" style={{ color: statusColor }}>
                                {proposal.status}
                              </span>
                            </td>
                          </tr>

                          {/* Detail Expansion Drawer Row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="detail-row-cell">
                                <div className="detail-box">
                                  <div className="detail-content">
                                    <div style={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", color: "#003466", marginBottom: "0.5rem" }}>
                                      THÔNG TIN CHI TIẾT ĐỀ NGHỊ
                                    </div>
                                    <div className="detail-grid">
                                      <div className="detail-item">
                                        <span className="detail-label">Số đề nghị:</span>
                                        <span className="detail-value">{proposal.proposalNumber}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Ngày đề nghị:</span>
                                        <span className="detail-value">{new Date(proposal.date).toLocaleDateString("vi-VN")}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Người đề nghị:</span>
                                        <span className="detail-value">{proposal.proposer}</span>
                                      </div>
                                      <div className="detail-item">
                                        <span className="detail-label">Nhà cung cấp:</span>
                                        <span className="detail-value">
                                          {proposal.supplierCode ? `${proposal.supplierCode} - ${proposal.supplierName}` : "—"}
                                        </span>
                                      </div>
                                      <div className="detail-item" style={{ gridColumn: "span 2" }}>
                                        <span className="detail-label">Thông tin tài khoản:</span>
                                        <span className="detail-value">{proposal.accountInfo || "—"}</span>
                                      </div>
                                      <div className="detail-item" style={{ gridColumn: "span 3" }}>
                                        <span className="detail-label">Mục đích:</span>
                                        <span className="detail-value">{proposal.purpose || "—"}</span>
                                      </div>
                                      <div className="detail-item" style={{ gridColumn: "span 3" }}>
                                        <span className="detail-label">Ghi chú:</span>
                                        <span className="detail-value" style={{ fontStyle: "italic" }}>{proposal.note || "—"}</span>
                                      </div>
                                    </div>

                                    <div style={{ fontWeight: 700, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.25rem", color: "#003466", marginBottom: "0.5rem" }}>
                                      CHI TIẾT CÁC MỤC THANH TOÁN
                                    </div>
                                    <table className="base-table" style={{ fontSize: "12px", border: "1px solid #cbd5e1" }}>
                                      <thead>
                                        <tr style={{ background: "#f8fafc" }}>
                                          <th style={{ color: "#003466", padding: "4px" }}>STT</th>
                                          <th style={{ color: "#003466", padding: "4px", textAlign: "left" }}>Nội dung</th>
                                          <th style={{ color: "#003466", padding: "4px" }}>ĐVT</th>
                                          <th style={{ color: "#003466", padding: "4px", textAlign: "right" }}>Số lượng</th>
                                          <th style={{ color: "#003466", padding: "4px", textAlign: "right" }}>Đơn giá (đ)</th>
                                          <th style={{ color: "#003466", padding: "4px", textAlign: "right" }}>Thành tiền (đ)</th>
                                          <th style={{ color: "#003466", padding: "4px", textAlign: "right" }}>Tỷ lệ (%)</th>
                                          <th style={{ color: "#003466", padding: "4px", textAlign: "right" }}>Tổng thanh toán (đ)</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {proposal.items.map((item, index) => (
                                          <tr key={item.id}>
                                            <td style={{ padding: "4px", textAlign: "center" }}>{index + 1}</td>
                                            <td style={{ padding: "4px" }}>{item.content}</td>
                                            <td style={{ padding: "4px", textAlign: "center" }}>{item.unit || "—"}</td>
                                            <td style={{ padding: "4px", textAlign: "right" }}>{item.quantity}</td>
                                            <td style={{ padding: "4px", textAlign: "right" }}>{item.price.toLocaleString("vi-VN")}</td>
                                            <td style={{ padding: "4px", textAlign: "right" }}>{item.amount.toLocaleString("vi-VN")}</td>
                                            <td style={{ padding: "4px", textAlign: "right" }}>{item.rate}%</td>
                                            <td style={{ padding: "4px", textAlign: "right", fontWeight: 700, color: "#003466" }}>
                                              {item.total.toLocaleString("vi-VN")}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Popup Modal Form to Create Payment Proposal (giống form thêm mới hợp đồng xuất khẩu) */}
        {isCreateOpen && (
          <div className="custom-modal-overlay">
            <div
              style={{
                width: "95%",
                maxWidth: "800px",
                maxHeight: "90%",
                height: "500px",
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
              {/* Sticky Header */}
              <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 24px", margin: 0, background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", fontSize: "16px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📦 Thêm mới đề nghị thanh toán</span>
              </h3>

              {/* Sticky Modal Tabs Navigation */}
              <div style={{ display: "flex", gap: "0.15rem", borderBottom: "2px solid #e2e8f0", padding: "0 1rem", background: "#f8fafc", overflowX: "auto", scrollbarWidth: "none" }}>
                <button
                  type="button"
                  onClick={() => setFormActiveTab(1)}
                  style={getFormTabButtonStyle(1)}
                >
                  1. Thông tin chung
                </button>
                <button
                  type="button"
                  onClick={() => setFormActiveTab(2)}
                  style={getFormTabButtonStyle(2)}
                >
                  2. Chi tiết thanh toán
                </button>
              </div>

              {/* Scrollable Form Body Container */}
              <form onSubmit={handleSaveProposal} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                <div className="scrollable-body" style={{ flex: 1, overflowX: "auto", overflowY: "auto", padding: "16px 1.5rem" }}>
                  
                  {/* Tab 1: General Info */}
                  <div
                    style={{
                      display: formActiveTab === 1 ? "grid" : "none",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      rowGap: "10px",
                      columnGap: "1.25rem",
                    }}
                  >
                    <div>
                      <label className="filter-label">Số đề nghị</label>
                      <input
                        type="text"
                        className="input"
                        value={nextProposalNumber}
                        readOnly
                        style={{ width: "100%", background: "#f1f5f9" }}
                      />
                    </div>
                    <div>
                      <label className="filter-label">Ngày đề nghị</label>
                      <input
                        type="text"
                        className="input"
                        value={new Date().toLocaleDateString("vi-VN")}
                        readOnly
                        style={{ width: "100%", background: "#f1f5f9" }}
                      />
                    </div>
                    <div>
                      <label className="filter-label">Người đề nghị</label>
                      <input
                        type="text"
                        className="input"
                        value={currentUserName}
                        readOnly
                        style={{ width: "100%", background: "#f1f5f9" }}
                      />
                    </div>

                    <div style={{ position: "relative" }} ref={dropdownRef}>
                      <label className="filter-label">Nhà cung cấp <span style={{ color: "red" }}>(*)</span></label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Gõ để tìm nhà cung cấp..."
                        value={selectedSupplier ? `${selectedSupplier.code} - ${selectedSupplier.name}` : supplierSearch}
                        onChange={(e) => {
                          setSupplierSearch(e.target.value);
                          if (selectedSupplier) {
                            setSelectedSupplier(null);
                            setBankAccountInfo("");
                          }
                        }}
                        onFocus={() => setSupplierOpen(true)}
                      />
                      {supplierOpen && (
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          background: "white",
                          border: "1px solid #cbd5e1",
                          borderRadius: "4px",
                          maxHeight: "180px",
                          overflowY: "auto",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
                        }}>
                          {filteredSuppliers.length === 0 ? (
                            <div style={{ padding: "8px 12px", color: "#64748b" }}>Không tìm thấy nhà cung cấp</div>
                          ) : (
                            filteredSuppliers.map(s => (
                              <div
                                key={s.id}
                                onClick={() => {
                                  setSelectedSupplier(s);
                                  setBankAccountInfo(s.bankAccountInfo || "Chưa cập nhật thông tin tài khoản");
                                  setSupplierOpen(false);
                                }}
                                style={{
                                  padding: "6px 12px",
                                  cursor: "pointer",
                                  borderBottom: "1px solid #f1f5f9",
                                }}
                                className="supplier-item-hover"
                              >
                                <strong>{s.code}</strong> - {s.name}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ gridColumn: "span 2" }}>
                      <label className="filter-label">Thông tin tài khoản</label>
                      <input
                        type="text"
                        className="input"
                        value={bankAccountInfo}
                        placeholder="Truy vấn tự động từ nhà cung cấp..."
                        readOnly
                        style={{ width: "100%", background: "#f1f5f9" }}
                      />
                    </div>

                    <div style={{ gridColumn: "span 3" }}>
                      <label className="filter-label">Mục đích thanh toán <span style={{ color: "red" }}>(*)</span></label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Nhập mục đích thanh toán..."
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ gridColumn: "span 3" }}>
                      <label className="filter-label">Ghi chú</label>
                      <textarea
                        className="input"
                        style={{ height: "60px", resize: "none" }}
                        placeholder="Nhập ghi chú (nếu có)..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Tab 2: Payment Details */}
                  <div style={{ display: formActiveTab === 2 ? "block" : "none" }}>
                    <div className="base-table-wrapper" style={{ marginTop: "0px", overflowX: "auto" }}>
                      <table className="base-table">
                        <thead>
                          <tr>
                            <th style={{ width: "40px" }}>STT</th>
                            <th style={{ minWidth: "200px" }}>Nội dung thanh toán <span style={{ color: "red" }}>(*)</span></th>
                            <th style={{ width: "80px" }}>ĐVT</th>
                            <th style={{ width: "90px" }}>Số lượng</th>
                            <th style={{ width: "120px" }}>Đơn giá (đ)</th>
                            <th style={{ width: "130px" }}>Thành tiền (đ)</th>
                            <th style={{ width: "80px" }}>Tỷ lệ (%)</th>
                            <th style={{ width: "130px" }}>Tổng thanh toán (đ)</th>
                            <th style={{ width: "50px" }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formItems.map((item, index) => {
                            const amount = item.quantity * item.price;
                            const total = amount - (amount * (item.rate || 0) / 100);
                            return (
                              <tr key={index}>
                                <td style={{ textAlign: "center", fontWeight: 600 }}>{index + 1}</td>
                                <td>
                                  <input
                                    type="text"
                                    className="input"
                                    placeholder="Nhập nội dung..."
                                    value={item.content}
                                    onChange={(e) => handleItemChange(index, "content", e.target.value)}
                                    required
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="input"
                                    placeholder="Cái, bộ..."
                                    value={item.unit}
                                    onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="input"
                                    style={{ textAlign: "right" }}
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value, 10) || 1)}
                                    required
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="input"
                                    style={{ textAlign: "right" }}
                                    min="0"
                                    value={item.price}
                                    onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                                    required
                                  />
                                </td>
                                <td style={{ textAlign: "right", fontWeight: 700, color: "#475569" }}>
                                  {amount.toLocaleString("vi-VN")}
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="input"
                                    style={{ textAlign: "right" }}
                                    min="0"
                                    max="100"
                                    value={item.rate}
                                    onChange={(e) => handleItemChange(index, "rate", parseFloat(e.target.value) || 0)}
                                  />
                                </td>
                                <td style={{ textAlign: "right", fontWeight: 700, color: "#003466" }}>
                                  {total.toLocaleString("vi-VN")}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => removeFormItem(index)}
                                    style={{
                                      border: "none",
                                      background: "none",
                                      color: "#ef4444",
                                      cursor: formItems.length === 1 ? "not-allowed" : "pointer",
                                      fontSize: "16px",
                                      fontWeight: "bold"
                                    }}
                                    disabled={formItems.length === 1}
                                  >
                                    &times;
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginTop: "10px",
                      flexWrap: "wrap",
                      gap: "1rem"
                    }}>
                      <button
                        type="button"
                        className="sapo-btn btn-outline"
                        onClick={addFormItem}
                      >
                        Thêm dòng
                      </button>

                      <div style={{
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "0.75rem 1.25rem",
                        minWidth: "280px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                          <span style={{ color: "#64748b" }}>Tổng thành tiền:</span>
                          <strong style={{ fontSize: "14px" }}>{formTotalAmount.toLocaleString("vi-VN")} đ</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.25rem", borderTop: "1px dashed #cbd5e1" }}>
                          <span style={{ color: "#003466", fontWeight: 700 }}>Tổng thanh toán:</span>
                          <strong style={{ fontSize: "15px", color: "#ff5c00" }}>{formTotalPayment.toLocaleString("vi-VN")} đ</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "flex-end",
                    borderTop: "1px solid #eee",
                    padding: "12px 24px",
                    background: "#fff",
                    borderBottomLeftRadius: "16px",
                    borderBottomRightRadius: "16px",
                  }}
                >
                  <button type="button" className="modal-footer-btn-secondary" onClick={() => setIsCreateOpen(false)}>
                    Thoát
                  </button>
                  <button type="submit" className="modal-footer-btn-success" disabled={isPending}>
                    {isPending ? "Đang lưu..." : "💾 Lưu đề nghị"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {customConfirm && typeof window !== "undefined" && createPortal(
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999999,
            backdropFilter: "blur(2px)",
            padding: "16px"
          }}>
            <div style={{
              width: "100%",
              maxWidth: "300px",
              padding: "18px 16px 14px 16px",
              textAlign: "center",
              borderRadius: "16px",
              background: "#ffffff",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
              transform: "translateY(-45px)"
            }}>
              {/* Centered Circular Icon Container */}
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: customConfirm.message.includes("từ chối") || customConfirm.message.includes("xóa") ? "#fee2e2" : "#e0f2fe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 10px auto"
              }}>
                {customConfirm.message.includes("từ chối") || customConfirm.message.includes("xóa") ? (
                  <XCircle size={22} color="#ef4444" strokeWidth={2.2} />
                ) : (
                  <CheckCircle2 size={22} color="#003466" strokeWidth={2.2} />
                )}
              </div>
              
              {/* Message Content */}
              <div style={{
                fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                fontSize: "13px",
                fontWeight: 400,
                color: "#334155",
                marginBottom: "14px",
                lineHeight: "1.3"
              }}>
                {customConfirm.message.includes("từ chối") ? "Bạn có chắc chắn từ chối không?" : "Bạn có chắc chắn phê duyệt không?"}
              </div>
              
              {/* Action Buttons: Thoát & Đồng ý */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setCustomConfirm(null)}
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
                >
                  Thoát
                </button>
                <button
                  type="button"
                  onClick={customConfirm.onConfirm}
                  style={{
                    flex: 1,
                    height: "36px",
                    borderRadius: "8px",
                    background: customConfirm.message.includes("từ chối") || customConfirm.message.includes("xóa") ? "#ef4444" : "#003466",
                    color: "#ffffff",
                    fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                    fontSize: "13px",
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Đồng ý
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  );
}
