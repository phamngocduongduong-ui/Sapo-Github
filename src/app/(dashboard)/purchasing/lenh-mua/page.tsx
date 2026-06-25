"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { 
  Plus, Trash2, Pencil, Send, Undo2, History, X, Eye, ArrowRightLeft, Calendar, AlertTriangle, CheckCircle, Save
} from "lucide-react";
import { 
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, 
  deletePurchaseOrder, updatePOStatus, getProducts, getWarehouses, getBranches,
  getMaintenanceProposals, createPOFromProposal, getSuppliers, completeProposal,
  confirmPOPayment, rejectProposal, recallPurchaseOrder
} from "./actions";
import HistoryModal from "../../HistoryModal";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";

function getPODisplayCode(po: any) {
  if (!po) return "";
  if (po.status === "Tạo mới" && po.purpose) {
    const match = po.purpose.match(/đề xuất\s+([A-Z0-9]+)/i);
    if (match && match[1]) {
      return match[1];
    }
  }
  return po.poCode || "";
}

export default function PurchaseOrderPage() {
  const [items, setItems] = useState<any[]>([]);
  const [dismissedPOIds, setDismissedPOIds] = useState<string[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>("");
  
  const [showModal, setShowModal] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [editingPO, setEditingPO] = useState<any | null>(null);
  const [proposalToConvert, setProposalToConvert] = useState<any | null>(null);
  const [viewingProposal, setViewingProposal] = useState<any | null>(null);
  const [showProposalGoodsModal, setShowProposalGoodsModal] = useState(false);
  const [selectedProposalGoods, setSelectedProposalGoods] = useState<string[]>([]);
  
  const [details, setDetails] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"PO" | "PROPOSAL" | null>(null);
  
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [historyTableName, setHistoryTableName] = useState<string>("PurchaseOrder");
  const [confirmUpdate, setConfirmUpdate] = useState<{ id: string, status: string, info: string } | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "waiting_approval" | "waiting_payment" | "waiting_delivery" | "waiting_debt" | "completed">("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  useRealTimeSync("purchase-orders", items, setItems, 3000, showModal || showProposalGoodsModal);
  useRealTimeSync("purchasing-proposals", proposals, setProposals, 3000, showModal || showProposalGoodsModal);
  useRealTimeSync("suppliers", suppliers, setSuppliers, 3000, false);

  const selectedItem = useMemo(() => {
    if (selectedType === "PO") {
      return items.find((p) => p.id === selectedId) || null;
    }
    if (selectedType === "PROPOSAL") {
      return proposals.find((p) => p.id === selectedId) || null;
    }
    return null;
  }, [items, proposals, selectedId, selectedType]);

  useEffect(() => {
    const handleClick = () => {
      setSelectedId(null);
      setSelectedType(null);
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    fetchData();
    fetchBranches();
    fetchProducts();
    fetchWarehouses();
    fetchSuppliers();
    fetchUser();
  }, []);

  async function fetchData() {
    const [poData, propData] = await Promise.all([
      getPurchaseOrders(),
      getMaintenanceProposals()
    ]);
    setItems(poData);
    setProposals(propData);
  }

  async function fetchBranches() {
    const data = await getBranches();
    setBranches(data);
  }

  async function fetchProducts() {
    const data = await getProducts();
    setProducts(data);
  }

  async function fetchWarehouses() {
    const data = await getWarehouses();
    setWarehouses(data);
  }

  async function fetchSuppliers() {
    const data = await getSuppliers();
    setSuppliers(data);
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

  const rejectedPOs = useMemo(() => {
    return items.filter(po => po.status === "Từ chối" && !dismissedPOIds.includes(po.id));
  }, [items, dismissedPOIds]);

  // Left side: proposals that are approved and waiting to be ordered
  const filteredProposals = useMemo(() => {
    return proposals.filter(prop => {
      const isPending = prop.proposalCode.startsWith("BT")
        ? (prop.status === "Đã phê duyệt")
        : (prop.status === "Chờ mua" || prop.status === "Đã phê duyệt");

      if (!isPending) return false;

      const matchSearch = !filterSearch || 
        prop.proposalCode.toLowerCase().includes(filterSearch.toLowerCase()) ||
        prop.proposer.toLowerCase().includes(filterSearch.toLowerCase());

      const matchBranch = !filterBranch || prop.branch === filterBranch;

      const matchMonth = !filterMonth || (() => {
        const d = new Date(prop.proposalDate);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        return `${year}-${month}` === filterMonth;
      })();

      return matchSearch && matchBranch && matchMonth;
    });
  }, [proposals, filterSearch, filterBranch, filterMonth]);

  // Right side: created POs
  const filteredPOs = useMemo(() => {
    return items.filter(po => {
      if (po.status === "Từ chối") return false;

      let matchTab = false;
      if (activeTab === "all") {
        matchTab = true;
      } else if (activeTab === "waiting_approval" && po.status === "Chờ phê duyệt") {
        matchTab = true;
      } else if (activeTab === "waiting_payment" && po.status === "Chờ thanh toán") {
        matchTab = true;
      } else if (activeTab === "waiting_delivery" && po.status === "Chờ giao hàng") {
        matchTab = true;
      } else if (activeTab === "waiting_debt" && po.status === "Đã nhập kho" && po.paymentStatus !== "Đã thanh toán") {
        matchTab = true;
      } else if (activeTab === "completed" && po.status === "Đã nhập kho" && po.paymentStatus === "Đã thanh toán") {
        matchTab = true;
      }

      if (!matchTab) return false;

      const matchSearch = !filterSearch || 
        po.poCode.toLowerCase().includes(filterSearch.toLowerCase()) ||
        po.creator.toLowerCase().includes(filterSearch.toLowerCase());

      const matchBranch = !filterBranch || po.branch === filterBranch;

      const matchStatus = !filterStatus || po.status === filterStatus;

      const matchMonth = !filterMonth || (() => {
        const d = new Date(po.requestedDate);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        return `${year}-${month}` === filterMonth;
      })();

      return matchSearch && matchBranch && matchStatus && matchMonth;
    });
  }, [items, activeTab, filterSearch, filterBranch, filterStatus, filterMonth]);

  const uniqueBranches = useMemo(() => {
    const branchesFromItems = items.map(po => po.branch);
    const branchesFromProposals = proposals.map(p => p.branch);
    const list = Array.from(new Set([...branchesFromItems, ...branchesFromProposals])).filter(Boolean);
    if (filterBranch && !list.includes(filterBranch)) {
      list.push(filterBranch);
    }
    return list.sort();
  }, [items, proposals, filterBranch]);

  const handleTabChange = (tab: "all" | "waiting_approval" | "waiting_payment" | "waiting_delivery" | "waiting_debt" | "completed") => {
    setActiveTab(tab);
    setFilterStatus("");
    setSelectedId(null);
    setSelectedType(null);
  };

  const handleAddDetail = () => {
    setDetails([
      ...details, 
      { productCode: "", productName: "", requestedQuantity: 1, unit: "", price: 0, amount: 0, note: "" }
    ]);
  };

  const handleRemoveDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  const handleDetailChange = (index: number, field: string, value: any) => {
    const newDetails = [...details];
    newDetails[index][field] = value;

    if (field === "productCode") {
      const product = products.find(p => p.code === value);
      newDetails[index].productName = product ? product.name : "";
      newDetails[index].unit = (product?.unit?.[0]?.name) || "";
    }
    
    // Automatically recalculate amount
    const qty = parseFloat(newDetails[index].requestedQuantity) || 0;
    const price = parseFloat(newDetails[index].price) || 0;
    newDetails[index].amount = qty * price;

    setDetails(newDetails);
  };

  const openAddModal = () => {
    setEditingPO(null);
    setProposalToConvert(null);
    setDetails([]);
    setIsViewOnly(false);
    setShowModal(true);
    setSelectedSupplierName("");
  };

  const handleEdit = (item: any) => {
    setEditingPO(item);
    setProposalToConvert(null);
    const mappedDetails = (item.purchaseorderdetail || []).map((d: any) => ({
      productCode: d.productCode,
      productName: d.productName,
      proposalProductName: d.proposalProductName,
      originalProposalProductName: d.proposalProductName,
      requestedQuantity: d.requestedQuantity,
      proposalQuantity: d.proposalQuantity,
      unit: d.unit || "",
      price: d.price || 0,
      amount: d.amount || 0,
      note: d.note || ""
    }));
    setDetails(mappedDetails);
    setIsViewOnly(false);
    setShowModal(true);
    setSelectedSupplierName(item.supplier || "");
  };

  const handleView = (item: any, type?: "PROPOSAL" | "PO") => {
    const isProposal = type === "PROPOSAL" || item.rowType === "PROPOSAL" || (!item.poCode && item.proposalCode);
    if (isProposal) {
      setViewingProposal(item);
    } else {
      setEditingPO(item);
      setProposalToConvert(null);
      const mappedDetails = (item.purchaseorderdetail || []).map((d: any) => ({
        productCode: d.productCode,
        productName: d.productName,
        proposalProductName: d.proposalProductName,
        originalProposalProductName: d.proposalProductName,
        requestedQuantity: d.requestedQuantity,
        proposalQuantity: d.proposalQuantity,
        unit: d.unit || "",
        price: d.price || 0,
        amount: d.amount || 0,
        note: d.note || ""
      }));
      setDetails(mappedDetails);
      setIsViewOnly(true);
      setShowModal(true);
      setSelectedSupplierName(item.supplier || "");
    }
  };

  const handleConvertProposal = (proposal: any) => {
    setProposalToConvert(proposal);
    setEditingPO(null);
    setIsViewOnly(false);

    // Details table is not automatically populated when creating PO from a proposal
    setDetails([]);
    setSelectedProposalGoods([]);

    setShowModal(true);
    setSelectedSupplierName("");
  };

  const handleCompleteProposal = (id: string, code: string) => {
    setConfirmUpdate({ id, status: "COMPLETE", info: code });
  };

  const handleRejectProposal = (id: string, code: string) => {
    setConfirmUpdate({ id, status: "REJECT_PROPOSAL", info: code });
  };



  const handleConfirmProposalGoods = () => {
    if (!proposalToConvert) return;
    const newDetails = proposalToConvert.items
      .filter((item: any) => selectedProposalGoods.includes(item.id))
      .map((item: any) => {
        const existing = details.find(d => (d.proposalProductName || d.productName) === item.productName);
        if (existing) return existing;

        const remainingQty = item.quantity - (item.orderedQuantity || 0);
        const matchedProd = products.find(p => p.name.trim().toLowerCase() === item.productName.trim().toLowerCase());
        return {
          productCode: matchedProd ? matchedProd.code : "",
          productName: matchedProd ? matchedProd.name : item.productName,
          proposalProductName: item.productName,
          originalProposalProductName: item.productName,
          requestedQuantity: remainingQty > 0 ? remainingQty : 0,
          proposalQuantity: item.quantity,
          unit: item.unit || (matchedProd?.unit?.[0]?.name) || "",
          price: item.price || 0,
          amount: (remainingQty > 0 ? remainingQty : 0) * (item.price || 0),
          note: item.note || ""
        };
      });
    setDetails(newDetails);
    setShowProposalGoodsModal(false);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingPO(null);
    setProposalToConvert(null);
    setIsViewOnly(false);
    setDetails([]);
    setSelectedSupplierName("");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (details.length === 0) {
      alert("Vui lòng thêm ít nhất một mặt hàng chi tiết");
      return;
    }

    startTransition(async () => {
      try {
        if (proposalToConvert) {
          // Pre-populate read-only values
          const isMaintenance = proposalToConvert.proposalCode.startsWith("BT");
          formData.set("branch", proposalToConvert.branch);
          formData.set("purpose", isMaintenance 
            ? `Mua vật tư bảo trì theo đề xuất ${proposalToConvert.proposalCode}`
            : `Mua hàng theo đề xuất ${proposalToConvert.proposalCode}`);
          await createPOFromProposal(proposalToConvert.id, formData, details);
          setProposalToConvert(null);
        } else if (editingPO) {
          await updatePurchaseOrder(editingPO.id, formData, details);
        } else {
          await createPurchaseOrder(formData, details);
        }
        handleClose();
        fetchData();
        setSelectedId(null);
        setSelectedType(null);
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
        if (status === "DELETE") {
          await deletePurchaseOrder(id);
        } else if (status === "RECALL") {
          await recallPurchaseOrder(id);
        } else if (status === "COMPLETE") {
          await completeProposal(id);
        } else if (status === "REJECT_PROPOSAL") {
          await rejectProposal(id);
        } else {
          await updatePOStatus(id, status);
        }
        fetchData();
        setSelectedId(null);
        setSelectedType(null);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleDelete = (id: string, code: string) => {
    setConfirmUpdate({ id, status: "DELETE", info: code });
  };

  let attachmentList: any[] = [];
  if (viewingProposal && viewingProposal.attachments) {
    try {
      attachmentList = JSON.parse(viewingProposal.attachments);
    } catch (e) {
      console.error("Failed to parse attachments", e);
    }
  }

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
        .sapo-btn.btn-outline {
          background: white !important;
          color: #003466 !important;
          border: 1px solid #003466 !important;
        }
        .sapo-btn.btn-outline:hover {
          background: #f0f7ff !important;
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

        .left-deck {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 680px;
          overflow-y: auto;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
        }
        .empty-placeholder {
          text-align: center;
          padding: 30px 10px;
          color: #64748b;
          border: 1px dashed #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          font-size: 13px;
        }
        .proposal-deck {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 4px;
        }
        .proposal-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-left: 4px solid #003466;
          border-radius: 6px;
          padding: 10px 12px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .proposal-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04);
          border-color: #ff5c00;
        }
        .proposal-card.selected {
          border-color: #ff5c00;
          background: #f8fafc;
          border-left-width: 5px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
        }
        .proposal-card-title {
          font-weight: 700;
          color: #003466;
          margin-bottom: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px !important;
        }
        .proposal-card-meta {
          font-size: 11px !important;
          color: #64748b;
          margin-bottom: 6px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 8px;
        }
        .proposal-card-items {
          font-size: 11px !important;
          background: #f1f5f9;
          padding: 6px 8px;
          border-radius: 4px;
          color: #334155;
          word-break: break-all;
          max-height: 120px;
          overflow-y: auto;
        }
      ` }} />

      <div className="breadcrumb-banner">
        ĐƠN MUA HÀNG
      </div>

      {/* Filters Grid (Common for both sides) */}
      <div className="base-filters" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "10px", marginBottom: "15px" }}>
        <div>
          <label className="filter-label">Tìm kiếm</label>
          <input 
            type="text" 
            className="form-control" 
            style={{ width: "100%" }}
            placeholder="Tìm theo mã, người tạo, hàng hóa..."
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
          <label className="filter-label">Trạng thái đơn mua</label>
          <select 
            className="form-control" 
            style={{ width: "100%" }} 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">-- Tất cả trạng thái --</option>
            {activeTab === "all" && (
              <>
                <option value="Chờ phê duyệt">Chờ phê duyệt</option>
                <option value="Chờ thanh toán">Chờ thanh toán</option>
                <option value="Chờ giao hàng">Chờ giao hàng</option>
                <option value="Đã nhập kho">Đã nhập kho</option>
              </>
            )}
            {activeTab === "waiting_approval" && <option value="Chờ phê duyệt">Chờ phê duyệt</option>}
            {activeTab === "waiting_payment" && <option value="Chờ thanh toán">Chờ thanh toán</option>}
            {activeTab === "waiting_delivery" && <option value="Chờ giao hàng">Chờ giao hàng</option>}
            {activeTab === "waiting_debt" && <option value="Đã nhập kho">Đã nhập kho</option>}
            {activeTab === "completed" && <option value="Đã nhập kho">Đã nhập kho</option>}
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

      <div style={{ display: "flex", gap: "1rem", width: "100%", minWidth: 0, alignItems: "flex-start" }}>
        {/* LEFT COLUMN: Proposals (Đề nghị chờ mua) */}
        <div className="left-deck" style={{ flex: "0 0 32%", minWidth: "300px" }}>
          <div style={{ paddingBottom: "8px", borderBottom: "1px solid #cbd5e1", marginBottom: "4px" }}>
            <h4 style={{ margin: 0, color: "#003466", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
              📋 Đề nghị chờ mua ({filteredProposals.length})
            </h4>
            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>
              Danh sách đề nghị đã duyệt, chờ tạo đơn mua.
            </p>
          </div>
            
          {/* Actions for Left Column */}
          {selectedType === "PROPOSAL" && selectedId && (
            <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center", minHeight: "32px", margin: "5px 0" }}>
              {(() => {
                const selectedProposal = filteredProposals.find(p => p.id === selectedId);
                if (!selectedProposal) return null;
                return (
                  <>
                    <button
                      type="button"
                      className="sapo-btn"
                      onClick={() => handleView(selectedProposal, "PROPOSAL")}
                    >
                      Xem
                    </button>
                    <button
                      type="button"
                      className="sapo-btn sapo-btn-success"
                      onClick={() => handleConvertProposal(selectedProposal)}
                    >
                      Tạo đơn mua
                    </button>
                    <button
                      type="button"
                      className="sapo-btn"
                      style={{ backgroundColor: "#16a34a", color: "#fff" }}
                      onClick={() => handleCompleteProposal(selectedProposal.id, selectedProposal.proposalCode)}
                    >
                      Hoàn thành
                    </button>
                    <button
                      type="button"
                      className="sapo-btn sapo-btn-danger"
                      onClick={() => handleRejectProposal(selectedProposal.id, selectedProposal.proposalCode)}
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      className="sapo-btn"
                      onClick={() => {
                        setHistoryTableName("MaintenanceProposal");
                        setHistoryRecordId(selectedProposal.id);
                      }}
                    >
                      Lịch sử
                    </button>
                  </>
                );
              })()}
            </div>
          )}

          {/* Left Card Deck */}
          <div className="proposal-deck">
            {filteredProposals.length === 0 ? (
              <div className="empty-placeholder">
                🎉 Không có đề nghị mua hàng nào chờ tạo đơn.
              </div>
            ) : (
              filteredProposals.map((item, idx) => {
                const isSelected = selectedId === item.id && selectedType === "PROPOSAL";
                return (
                  <div
                    key={`PROPOSAL-${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(item.id);
                      setSelectedType("PROPOSAL");
                      handleView(item, "PROPOSAL");
                    }}
                    className={`proposal-card ${isSelected ? "selected" : ""}`}
                  >
                    <div className="proposal-card-title">
                      <span style={{ color: "var(--primary-color)", fontWeight: 700 }}>{item.proposalCode}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                        <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 400 }}>
                          📅 {new Date(item.proposalDate).toLocaleDateString("vi-VN")}
                        </span>
                        <button
                          type="button"
                          className="sapo-btn sapo-btn-success"
                          style={{ height: "22px", padding: "0 8px", fontSize: "11px", borderRadius: "4px", lineHeight: "22px", display: "inline-flex", alignItems: "center" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConvertProposal(item);
                          }}
                        >
                          Tạo đơn mua
                        </button>
                      </div>
                    </div>
                    <div className="proposal-card-meta">
                      <div><strong>Người đề xuất:</strong> {item.proposer}</div>
                      <div><strong>Chi nhánh:</strong> {item.branch}</div>
                      <div style={{ gridColumn: "span 2" }}><strong>Mục đích:</strong> {item.purpose}</div>
                    </div>
                    <div className="proposal-card-items">
                      {(item.items || []).map((goods: any, gIdx: number) => (
                        <div key={goods.id} style={{ fontSize: "11px", borderBottom: gIdx < (item.items.length - 1) ? "1px dashed #cbd5e1" : "none", paddingBottom: "2px", color: "#334155" }}>
                          {gIdx + 1}. {goods.productName} - ĐVT: {goods.unit || "—"} - SL: {Number(goods.quantity).toLocaleString("en-US")}
                          {goods.orderedQuantity > 0 && (
                            <span style={{ color: "#16a34a", fontWeight: "600" }}>
                              {` (Đã đặt: ${Number(goods.orderedQuantity).toLocaleString("en-US")})`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Purchase Orders (Đơn mua đã tạo) */}
        <div className="left-deck" style={{ flex: "1 1 68%", minWidth: 0 }}>
          <div style={{ paddingBottom: "8px", borderBottom: "1px solid #cbd5e1", marginBottom: "4px" }}>
            <h4 style={{ margin: 0, color: "#003466", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}>
              📝 Đơn mua đã tạo ({filteredPOs.length})
            </h4>
            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>
              Danh sách đơn mua hàng đã tạo để theo dõi và thực hiện.
            </p>
          </div>
            
            {/* Tabs for Right Column */}
            <div style={{ display: "flex", gap: "0.25rem", overflowX: "auto", paddingBottom: "4px", borderBottom: "1px solid #cbd5e1" }}>
              <button 
                onClick={() => handleTabChange("all")}
                className={`sapo-btn ${activeTab === "all" ? "" : "btn-outline"}`}
                style={{ height: "26px", fontSize: "11px", padding: "0 8px", borderRadius: "4px" }}
              >
                Tất cả ({items.filter(i => i.status !== "Từ chối").length})
              </button>
              <button 
                onClick={() => handleTabChange("waiting_approval")}
                className={`sapo-btn ${activeTab === "waiting_approval" ? "" : "btn-outline"}`}
                style={{ height: "26px", fontSize: "11px", padding: "0 8px", borderRadius: "4px" }}
              >
                Chờ duyệt ({items.filter(i => i.status === "Chờ phê duyệt").length})
              </button>
              <button 
                onClick={() => handleTabChange("waiting_payment")}
                className={`sapo-btn ${activeTab === "waiting_payment" ? "" : "btn-outline"}`}
                style={{ height: "26px", fontSize: "11px", padding: "0 8px", borderRadius: "4px" }}
              >
                Chờ thanh toán ({items.filter(i => i.status === "Chờ thanh toán").length})
              </button>
              <button 
                onClick={() => handleTabChange("waiting_delivery")}
                className={`sapo-btn ${activeTab === "waiting_delivery" ? "" : "btn-outline"}`}
                style={{ height: "26px", fontSize: "11px", padding: "0 8px", borderRadius: "4px" }}
              >
                Chờ giao ({items.filter(i => i.status === "Chờ giao hàng").length})
              </button>
              <button 
                onClick={() => handleTabChange("waiting_debt")}
                className={`sapo-btn ${activeTab === "waiting_debt" ? "" : "btn-outline"}`}
                style={{ height: "26px", fontSize: "11px", padding: "0 8px", borderRadius: "4px" }}
              >
                Chờ nợ ({items.filter(i => i.status === "Đã nhập kho" && i.paymentStatus !== "Đã thanh toán").length})
              </button>
              <button 
                onClick={() => handleTabChange("completed")}
                className={`sapo-btn ${activeTab === "completed" ? "" : "btn-outline"}`}
                style={{ height: "26px", fontSize: "11px", padding: "0 8px", borderRadius: "4px" }}
              >
                Hoàn tất ({items.filter(i => i.status === "Đã nhập kho" && i.paymentStatus === "Đã thanh toán").length})
              </button>
            </div>

            {/* Actions for Right Column */}
            {selectedType === "PO" && selectedId && (
              <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center", minHeight: "32px", margin: "5px 0" }}>
                {(() => {
                  const selectedPO = filteredPOs.find(p => p.id === selectedId);
                  if (!selectedPO) return null;
                  return (
                    <>
                      <button
                        type="button"
                        className="sapo-btn"
                        onClick={() => handleView(selectedPO, "PO")}
                      >
                        Xem
                      </button>
                      {(selectedPO.status === "Chờ phê duyệt" || selectedPO.status === "Chờ thanh toán") && (
                        <button
                          type="button"
                          className="sapo-btn"
                          onClick={() => handleStatusChange(selectedPO.id, "RECALL", selectedPO.poCode)}
                        >
                          Thu hồi
                        </button>
                      )}
                      {selectedPO.status === "Chờ phê duyệt" && (currentUser?.isAdmin || currentUser?.permissions?.includes("TM_APPROVE")) && (
                        <>
                          <button
                            type="button"
                            className="sapo-btn sapo-btn-success"
                            onClick={() => handleStatusChange(selectedPO.id, "Chờ thực hiện", selectedPO.poCode)}
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            className="sapo-btn sapo-btn-danger"
                            onClick={() => handleStatusChange(selectedPO.id, "Từ chối", "Từ chối: " + selectedPO.poCode)}
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                      {currentUser?.isAdmin && (
                        <button
                          type="button"
                          className="sapo-btn sapo-btn-danger"
                          onClick={() => handleDelete(selectedPO.id, selectedPO.poCode)}
                        >
                          Xóa
                        </button>
                      )}
                      <button
                        type="button"
                        className="sapo-btn"
                        onClick={() => {
                          setHistoryTableName("PurchaseOrder");
                          setHistoryRecordId(selectedPO.id);
                        }}
                      >
                        Lịch sử
                      </button>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Right Table */}
            <div className="base-table-wrapper" style={{ overflowX: "auto" }}>
              <table className="base-table">
                <thead>
                  <tr>
                    <th className="nowrap" style={{ width: "40px" }}>STT</th>
                    <th className="nowrap" style={{ width: "120px" }}>Số đơn mua</th>
                    <th className="nowrap" style={{ width: "90px" }}>Ngày mua</th>
                    <th style={{ width: "110px" }}>Chi nhánh</th>
                    <th style={{ width: "180px" }}>Thông tin hàng hóa</th>
                    <th className="nowrap" style={{ width: "110px" }}>Trạng thái</th>
                    <th className="nowrap" style={{ width: "110px" }}>Thanh toán</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPOs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                        Không có đơn mua hàng nào
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map((item, idx) => {
                      const isSelected = selectedId === item.id && selectedType === "PO";
                      return (
                        <tr
                          key={`PO-${item.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelected) {
                              setSelectedId(null);
                              setSelectedType(null);
                            } else {
                              setSelectedId(item.id);
                              setSelectedType("PO");
                            }
                          }}
                          onDoubleClick={() => handleView(item, "PO")}
                          className={`row-hoverable ${isSelected ? "row-selected" : ""}`}
                          style={{ cursor: "pointer" }}
                        >
                          <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{idx + 1}</td>
                          <td className="nowrap" style={{ textAlign: "center", fontWeight: 600, color: "var(--primary-color)" }}>{getPODisplayCode(item)}</td>
                          <td className="nowrap" style={{ textAlign: "center" }}>
                            {new Date(item.requestedDate).toLocaleDateString("vi-VN")}
                          </td>
                          <td style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{item.branch}</td>
                          <td style={{ textAlign: "left", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {(item.purchaseorderdetail || []).map((goods: any, gIdx: number) => (
                                <div key={goods.id} style={{ fontSize: "12px", borderBottom: gIdx < (item.purchaseorderdetail.length - 1) ? "1px dashed #cbd5e1" : "none", paddingBottom: "2px", color: "#334155" }}>
                                  {gIdx + 1}. {goods.productName} - ĐVT: {goods.unit || "—"} - SL: {Number(goods.requestedQuantity).toLocaleString("en-US")}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="nowrap" style={{ textAlign: "center" }}>
                            <span
                              className={`status-pill ${
                                item.status === "Đã nhập kho" || item.status === "Chờ giao hàng" || item.status === "Chờ thực hiện" || item.status === "Chờ mua hàng" || item.status === "Hoàn thành" || item.status === "Chờ thanh toán"
                                  ? "status-active"
                                  : item.status === "Tạo mới"
                                  ? "status-new"
                                  : item.status === "Chờ phê duyệt"
                                  ? "status-pending"
                                  : "status-inactive"
                              }`}
                            >
                              {item.status === "Chờ thực hiện" ? "Chờ mua hàng" : item.status}
                            </span>
                          </td>
                          <td className="nowrap" style={{ textAlign: "center" }}>
                            <span
                              className={`status-pill ${
                                item.paymentStatus === "Đã thanh toán" 
                                  ? "status-active" 
                                  : "status-pending"
                              }`}
                              style={item.paymentStatus === "Đã thanh toán" ? { color: "#16a34a" } : undefined}
                            >
                              {item.paymentStatus || "Chờ thanh toán"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

        {/* Floating/Side Notification Panel for Rejected POs */}
        {rejectedPOs.length > 0 && (
          <div style={{ width: "260px", flexShrink: 0, backgroundColor: "#fff", borderLeft: "2px solid #ef4444", paddingLeft: "1rem", paddingRight: "0.25rem", display: "flex", flexDirection: "column", gap: "10px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#ef4444", margin: "10px 0 5px 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ef4444" }}></span>
              ĐƠN BỊ TỪ CHỐI ({rejectedPOs.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "600px", overflowY: "auto", paddingRight: "5px" }}>
              {rejectedPOs.map(po => (
                <div key={po.id} style={{ border: "1px solid #fecaca", backgroundColor: "#fff5f5", borderRadius: "6px", padding: "10px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700, color: "#b91c1c" }}>{po.poCode}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ color: "#7f1d1d", fontSize: "10px" }}>{new Date(po.updatedAt).toLocaleDateString("vi-VN")}</span>
                      <button 
                        type="button" 
                        onClick={() => setDismissedPOIds(prev => [...prev, po.id])} 
                        style={{ border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center", opacity: 0.6 }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                  <div style={{ color: "#7f1d1d", marginBottom: "4px", fontWeight: 600 }}>
                    Mục đích: {po.purpose.replace(/đề xuất [A-Z0-9]+/g, "đơn mua " + po.poCode)}
                  </div>
                  {po.note && (
                    <div style={{ color: "#991b1b", fontStyle: "italic" }}>
                      Ghi chú: {po.note}
                    </div>
                  )}
                  {currentUser?.isAdmin && (
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                      <button
                        type="button"
                        className="sapo-btn"
                        style={{ height: "22px", fontSize: "10px", padding: "0 6px", backgroundColor: "#ef4444", borderColor: "#ef4444", color: "#fff" }}
                        onClick={() => handleDelete(po.id, po.poCode)}
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* History Log Modal */}
      {historyRecordId && (
        <HistoryModal 
          tableName={historyTableName} 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {/* Viewing Maintenance Proposal Details Modal */}
      {viewingProposal && (
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
            <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 24px", margin: 0, background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", fontSize: "16px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔍 Xem chi tiết đề nghị mua hàng:</span>
              <span style={{ color: "#ff5c00" }}>{viewingProposal.proposalCode}</span>
            </h3>

            <div className="scrollable-body" style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>I. Thông tin chung</h4>
              <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", rowGap: "10px", columnGap: "1.25rem", marginBottom: "1.5rem" }}>
                <div>
                  <label className="filter-label">Số đề nghị</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={viewingProposal.proposalCode} readOnly />
                </div>
                <div>
                  <label className="filter-label">Người đề nghị</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={viewingProposal.proposer} readOnly />
                </div>
                <div>
                  <label className="filter-label">Chi nhánh</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={viewingProposal.branch} readOnly />
                </div>
                <div>
                  <label className="filter-label">Ngày đề nghị</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={new Date(viewingProposal.proposalDate).toLocaleDateString("vi-VN")} readOnly />
                </div>
                <div>
                  <label className="filter-label">Mục đích</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={viewingProposal.purpose} readOnly />
                </div>
                <div>
                  <label className="filter-label">Tình trạng</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={viewingProposal.urgency} readOnly />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label className="filter-label">Ghi chú chung</label>
                  <input type="text" className="input" style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }} value={viewingProposal.note || "—"} readOnly />
                </div>
              </div>

              <h4 style={{ margin: "20px 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>II. Chi tiết đề nghị</h4>
              <div className="responsive-table-wrapper" style={{ overflowX: "auto", overflowY: "hidden", border: "1px solid #e2e8f0", borderRadius: "8px", width: "100%", marginBottom: "20px" }}>
                <table className="table tab3-goods-table" style={{ fontSize: "13px", width: "100%", minWidth: "1215px", tableLayout: "fixed" }}>
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
                    {(viewingProposal.items || []).map((d: any, index: number) => (
                      <tr key={index}>
                        <td style={{ padding: "5px 6px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={d.productName}>{d.productName}</td>
                        <td style={{ padding: "5px 6px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={d.techStandard}>{d.techStandard || "—"}</td>
                        <td style={{ padding: "5px 6px", textAlign: "center" }}>{d.unit || "—"}</td>
                        <td style={{ padding: "5px 6px", textAlign: "center" }}>{Number(d.quantity).toLocaleString("en-US")}</td>
                        <td style={{ padding: "5px 6px", textAlign: "right" }}>{Number(d.price).toLocaleString("en-US")}</td>
                        <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>{Number(d.amount).toLocaleString("en-US")}</td>
                        <td style={{ padding: "5px 6px" }}>{d.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SECTION III: Attachments */}
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
                    {(() => {
                      const attachmentList = viewingProposal.attachments ? JSON.parse(viewingProposal.attachments) : [];
                      if (attachmentList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={3} style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                              Không có tệp đính kèm nào.
                            </td>
                          </tr>
                        );
                      }
                      return attachmentList.map((att: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ textAlign: "center", fontWeight: 500, padding: "8px" }}>{idx + 1}</td>
                          <td style={{ padding: "8px" }}>{att.name || "—"}</td>
                          <td style={{ padding: "8px" }}>
                            {att.fileName ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {(viewingProposal.status === "Chờ mua" || viewingProposal.status === "Đã phê duyệt") && (
                <>
                  <button
                    type="button"
                    className="sapo-btn sapo-btn-danger"
                    onClick={() => {
                      setViewingProposal(null);
                      handleRejectProposal(viewingProposal.id, viewingProposal.proposalCode);
                    }}
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    className="sapo-btn"
                    style={{ backgroundColor: "#16a34a", color: "#fff" }}
                    onClick={() => {
                      setViewingProposal(null);
                      handleCompleteProposal(viewingProposal.id, viewingProposal.proposalCode);
                    }}
                  >
                    Hoàn thành
                  </button>
                  <button
                    type="button"
                    className="sapo-btn sapo-btn-success"
                    onClick={() => {
                      setViewingProposal(null);
                      handleConvertProposal(viewingProposal);
                    }}
                  >
                    Đặt hàng
                  </button>
                </>
              )}
              <button type="button" className="sapo-btn sapo-btn-secondary" onClick={() => setViewingProposal(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Creation / Editing / Conversion Modal */}
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
              {isViewOnly ? (
                <>
                  <span>🔍 Xem chi tiết đơn mua hàng:</span>
                  <span style={{ color: "#ff5c00" }}>{getPODisplayCode(editingPO)}</span>
                </>
              ) : editingPO ? (
                <>
                  <span>✏️ Chỉnh sửa đơn mua hàng:</span>
                  <span style={{ color: "#ff5c00" }}>{getPODisplayCode(editingPO)}</span>
                </>
              ) : proposalToConvert ? (
                <>
                  <span>📦 Lập đơn mua hàng từ đề nghị:</span>
                  <span style={{ color: "#ff5c00" }}>{proposalToConvert.proposalCode}</span>
                </>
              ) : (
                <span>📦 Thêm mới đơn mua hàng</span>
              )}
            </h3>

            {/* Scrollable Form Body Container */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="scrollable-body" style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
                
                {/* SECTION 1: General Info */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", margin: "0 0 12px 0" }}>
                  <h4 style={{ margin: 0, color: "#003466", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>I. THÔNG TIN CHUNG</h4>
                  {selectedSupplierName ? (() => {
                    const s = suppliers.find(sup => sup.name === selectedSupplierName);
                    return s ? (
                      <span style={{ fontSize: "0.85rem", color: "#f97316", fontWeight: 600 }}>
                        💳 Công nợ nhà cung cấp: {s.debtPolicy || `${s.debtDays || 0} ngày`}
                      </span>
                    ) : null;
                  })() : (
                    <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
                      <span style={{ color: "#ef4444" }}>(*)</span> Các trường có dấu sao đỏ là bắt buộc nhập
                    </span>
                  )}
                </div>
                
                {/* Dòng 1 */}
                <div
                  className="responsive-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    rowGap: "10px",
                    columnGap: "1.25rem",
                    marginBottom: "1rem"
                  }}
                >
                  <div>
                    <label className="filter-label">Số đơn mua</label>
                    <input 
                      type="text" 
                      className="input" 
                      style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }}
                      value={editingPO ? getPODisplayCode(editingPO) : "Hệ thống tự tạo"} 
                      readOnly 
                    />
                  </div>
                  <div>
                    <label className="filter-label">Ngày mua</label>
                    <input 
                      type="text" 
                      className="input" 
                      style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }}
                      value={editingPO ? new Date(editingPO.requestedDate).toLocaleDateString("vi-VN") : new Date().toLocaleDateString("vi-VN")} 
                      readOnly 
                    />
                    <input 
                      type="hidden" 
                      name="requestedDate" 
                      value={editingPO ? new Date(editingPO.requestedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
                    />
                  </div>
                  <div>
                    <label className="filter-label">Người đề nghị</label>
                    <input 
                      type="text" 
                      className="input" 
                      style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }}
                      value={editingPO ? editingPO.creator : (proposalToConvert ? proposalToConvert.proposer : (currentUser?.employeeName || currentUser?.username || ""))} 
                      readOnly 
                    />
                  </div>
                  <div>
                    <label className="filter-label">Chi nhánh</label>
                    {proposalToConvert ? (
                      <input 
                        type="text" 
                        name="branch"
                        className="input" 
                        style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }}
                        value={proposalToConvert.branch} 
                        readOnly 
                      />
                    ) : editingPO ? (
                      <input 
                        type="text" 
                        name="branch"
                        className="input" 
                        style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }}
                        value={editingPO.branch} 
                        readOnly 
                      />
                    ) : (
                      currentUser?.branch?.split(",").length > 1 ? (
                        <select name="branch" className="input" style={{ width: "100%" }} required defaultValue="">
                          <option value="" disabled>-- Chọn chi nhánh --</option>
                          {currentUser.branch.split(",").map((b: string) => (
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
                </div>

                {/* Dòng 2 */}
                <div
                  className="responsive-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    rowGap: "10px",
                    columnGap: "1.25rem",
                    marginBottom: "1rem"
                  }}
                >
                  <div>
                    <label className="filter-label">Nhà cung cấp *</label>
                    <select 
                      name="supplier" 
                      className="input" 
                      style={{ width: "100%" }}
                      required 
                      disabled={isViewOnly} 
                      defaultValue={editingPO?.supplier || ""}
                      onChange={(e) => setSelectedSupplierName(e.target.value)}
                    >
                      <option value="" disabled>-- Chọn nhà cung cấp --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
                      ))}
                      {editingPO?.supplier && !suppliers.some(s => s.name === editingPO.supplier) && (
                        <option value={editingPO.supplier}>{editingPO.supplier} (Ngưng hoạt động)</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="filter-label">Nơi giao *</label>
                    <select 
                      name="deliveryLocation" 
                      className="input" 
                      style={{ width: "100%" }}
                      required 
                      disabled={isViewOnly} 
                      defaultValue={editingPO?.deliveryLocation || ""}
                    >
                      <option value="" disabled>-- Chọn kho nhận --</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.name}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dòng 3 */}
                <div
                  className="responsive-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1.2fr 1.6fr",
                    rowGap: "10px",
                    columnGap: "1.25rem",
                    marginBottom: "1.5rem"
                  }}
                >
                  <div>
                    <label className="filter-label">Mục đích</label>
                    {proposalToConvert ? (
                      <input 
                        type="text" 
                        name="purpose"
                        className="input" 
                        style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }}
                        value={proposalToConvert.purpose || (proposalToConvert.proposalCode.startsWith("BT") 
                          ? `Mua vật tư bảo trì theo đề xuất ${proposalToConvert.proposalCode}`
                          : `Mua hàng theo đề xuất ${proposalToConvert.proposalCode}`)}
                        readOnly 
                      />
                    ) : editingPO ? (
                      <input 
                        type="text" 
                        name="purpose"
                        className="input" 
                        style={{ width: "100%", background: "#f1f5f9", cursor: "not-allowed" }}
                        value={editingPO.purpose}
                        readOnly 
                      />
                    ) : (
                      <select 
                        name="purpose" 
                        className="input" 
                        style={{ width: "100%" }}
                        required 
                        defaultValue="Mua vật tư"
                      >
                        <option value="Mua vật tư">Mua vật tư</option>
                        <option value="Mua nguyên liệu">Mua nguyên liệu</option>
                        <option value="Mua máy móc">Mua máy móc</option>
                        <option value="Mua hóa chất">Mua hóa chất</option>
                        <option value="Mua vật tư bảo trì">Mua vật tư bảo trì</option>
                        <option value="Mua dịch vụ">Mua dịch vụ</option>
                        <option value="Mua khác">Mua khác</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="filter-label">Kiểu thanh toán *</label>
                    <select 
                      name="paymentType" 
                      className="input" 
                      style={{ width: "100%" }}
                      required 
                      disabled={isViewOnly} 
                      defaultValue={editingPO?.paymentType || "Phê duyệt trước, thanh toán sau"}
                    >
                      <option value="Phê duyệt trước, thanh toán sau">Phê duyệt trước, thanh toán sau</option>
                      <option value="Thanh toán trước, phê duyệt sau">Thanh toán trước, phê duyệt sau</option>
                    </select>
                  </div>
                  <div>
                    <label className="filter-label">Ghi chú</label>
                    <input 
                      type="text" 
                      name="note" 
                      className="input" 
                      style={{ width: "100%" }}
                      disabled={isViewOnly} 
                      defaultValue={editingPO?.note || proposalToConvert?.note || ""} 
                      placeholder="Ghi chú lý do mua..." 
                    />
                  </div>
                </div>

                {/* SECTION 2: Items Details */}
                <h4 style={{ margin: "20px 0 12px 0", color: "#003466", borderBottom: "2px solid #ff5c00", paddingBottom: "4px", textTransform: "uppercase", fontSize: "0.9rem", fontWeight: 700 }}>II. Chi tiết hàng hóa</h4>
                
                <div className="responsive-table-wrapper" style={{ overflowX: "auto", overflowY: "hidden", border: "1px solid #e2e8f0", borderRadius: "8px", width: "100%" }}>
                  <table className="table tab3-goods-table" style={{ fontSize: "13px", width: "100%", minWidth: "1050px", tableLayout: "fixed" }}>
                    <thead style={{ background: "#f8fafc" }}>
                      <tr>
                        <th style={{ width: "250px", padding: "5px 6px", textAlign: "center" }}>Tên hàng *</th>
                        <th style={{ width: "90px", padding: "5px 6px", textAlign: "center" }}>SL đề nghị</th>
                        <th style={{ width: "90px", padding: "5px 6px", textAlign: "center" }}>Số lượng *</th>
                        <th style={{ width: "90px", padding: "5px 6px", textAlign: "center" }}>ĐVT *</th>
                        <th style={{ width: "120px", padding: "5px 6px", textAlign: "center" }}>Đơn giá *</th>
                        <th style={{ width: "130px", padding: "5px 6px", textAlign: "center" }}>Thành tiền</th>
                        <th style={{ minWidth: "210px", padding: "5px 6px", textAlign: "center" }}>Ghi chú</th>
                        {!isViewOnly && !proposalToConvert && <th style={{ width: "50px", padding: "5px 6px", textAlign: "center" }}>#</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {details.length === 0 ? (
                        <tr>
                          <td colSpan={isViewOnly || proposalToConvert !== null ? 7 : 8} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                            {proposalToConvert !== null 
                              ? "Chưa có chi tiết hàng hóa nào được chọn. Vui lòng click 'Chọn hàng từ đề nghị' để chọn mặt hàng cần mua." 
                              : "Chưa có chi tiết hàng hóa nào được thêm"}
                          </td>
                        </tr>
                      ) : (
                        details.map((d, index) => {
                          const selectedProduct = products.find(p => p.code === d.productCode);
                          const availableUnits = selectedProduct?.unit || [];

                          return (
                            <tr key={index}>
                              <td style={{ padding: "5px 6px" }}>
                                {isViewOnly || proposalToConvert !== null ? (
                                  <div style={{ fontSize: "13px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={`${d.productCode} - ${d.productName}`}>
                                    {d.productCode ? `${d.productCode} - ${d.productName}` : d.productName}
                                    {d.originalProposalProductName && (
                                      <div style={{ fontSize: "11px", color: "#6366f1", fontStyle: "italic", marginTop: "2px" }}>
                                        Đề nghị: {d.originalProposalProductName}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <select 
                                      className="input-sm"
                                      value={d.productCode}
                                      onChange={(e) => handleDetailChange(index, "productCode", e.target.value)}
                                      required
                                    >
                                      <option value="">-- Chọn hàng --</option>
                                      {products.map(p => (
                                        <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                                      ))}
                                    </select>
                                    {d.originalProposalProductName && (
                                      <div style={{ fontSize: "11px", color: "#6366f1", fontStyle: "italic", marginTop: "2px" }}>
                                        Đề nghị: {d.originalProposalProductName}
                                      </div>
                                    )}
                                    {!d.originalProposalProductName && d.productName && (
                                      <div style={{ fontSize: "11px", color: "#64748b", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", paddingLeft: "4px" }} title={d.productName}>
                                        {d.productName}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: "5px 6px", textAlign: "center" }}>
                                {d.proposalQuantity !== undefined && d.proposalQuantity !== null ? Number(d.proposalQuantity).toLocaleString("en-US") : "—"}
                              </td>
                              <td style={{ padding: "5px 6px" }}>
                                {isViewOnly ? (
                                  <div style={{ textAlign: "center", fontSize: "13px" }}>
                                    {Number(d.requestedQuantity).toLocaleString("en-US")}
                                  </div>
                                ) : (
                                  <input 
                                    type="number"
                                    className="input-sm"
                                    style={{ textAlign: "center" }}
                                    value={d.requestedQuantity}
                                    min="0.01"
                                    step="0.01"
                                    onChange={(e) => handleDetailChange(index, "requestedQuantity", e.target.value)}
                                    required
                                  />
                                )}
                              </td>
                              <td style={{ padding: "5px 6px" }}>
                                {isViewOnly || proposalToConvert !== null ? (
                                  <div style={{ textAlign: "center", fontSize: "13px" }}>
                                    {d.unit || "—"}
                                  </div>
                                ) : (
                                  <select 
                                    className="input-sm"
                                    value={d.unit}
                                    onChange={(e) => handleDetailChange(index, "unit", e.target.value)}
                                    required
                                  >
                                    <option value="">-- ĐVT --</option>
                                    {availableUnits.map((u: any) => (
                                      <option key={u.id} value={u.name}>{u.name}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              <td style={{ padding: "5px 6px" }}>
                                {isViewOnly ? (
                                  <div style={{ textAlign: "right", fontSize: "13px" }}>
                                    {Number(d.price || 0).toLocaleString("en-US")}
                                  </div>
                                ) : (
                                  <input 
                                    type="number"
                                    className="input-sm"
                                    style={{ textAlign: "right" }}
                                    value={d.price}
                                    min="0"
                                    step="0.01"
                                    onChange={(e) => handleDetailChange(index, "price", e.target.value)}
                                    required
                                  />
                                )}
                              </td>
                              <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>
                                {Number((parseFloat(d.requestedQuantity) || 0) * (parseFloat(d.price) || 0)).toLocaleString("en-US")}
                              </td>
                              <td style={{ padding: "5px 6px" }}>
                                <input 
                                  type="text"
                                  className="input-sm"
                                  value={d.note || ""}
                                  onChange={(e) => handleDetailChange(index, "note", e.target.value)}
                                  placeholder="Ghi chú..."
                                  disabled={isViewOnly}
                                />
                              </td>
                              {!isViewOnly && !proposalToConvert && (
                                <td style={{ padding: "5px 6px", textAlign: "center" }}>
                                  <button 
                                    type="button" 
                                    className="action-btn text-red-500 hover:text-red-700" 
                                    onClick={() => handleRemoveDetail(index)}
                                    style={{ background: "none", border: "none", cursor: "pointer" }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {!isViewOnly && (
                  <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    {!proposalToConvert && (
                      <button 
                        type="button" 
                        className="sapo-btn" 
                        onClick={handleAddDetail}
                      >
                        Thêm mặt hàng
                      </button>
                    )}
                    {proposalToConvert && (
                      <button 
                        type="button" 
                        className="sapo-btn sapo-btn-success" 
                        onClick={() => {
                          const currentNames = details.map(d => d.proposalProductName || d.productName);
                          const activeIds = proposalToConvert.items
                            .filter((it: any) => currentNames.includes(it.productName))
                            .map((it: any) => it.id);
                          setSelectedProposalGoods(activeIds);
                          setShowProposalGoodsModal(true);
                        }}
                        style={{ background: "#10b981" }}
                      >
                        Chọn hàng từ đề nghị
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="sapo-btn sapo-btn-secondary" onClick={handleClose}>
                  Đóng
                </button>
                {!isViewOnly && (
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

            {showProposalGoodsModal && proposalToConvert && (
              <div className="custom-modal-overlay" style={{ zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{
                  width: "90%",
                  maxWidth: "680px",
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                }}>
                  <h3 style={{ margin: "0 0 15px 0", fontSize: "1.15rem", fontWeight: 700, color: "#1e293b" }}>
                    Chọn hàng hóa cần đặt mua từ đề nghị: {proposalToConvert.proposalCode}
                  </h3>
                  
                  <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px", marginBottom: "20px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                        <tr style={{ borderBottom: "1px solid #cbd5e1" }}>
                          <th style={{ width: "40px", padding: "8px", textAlign: "center" }}>
                            <input 
                              type="checkbox" 
                              checked={
                                proposalToConvert.items.filter((it: any) => (it.quantity - (it.orderedQuantity || 0)) > 0).length > 0 &&
                                proposalToConvert.items
                                  .filter((it: any) => (it.quantity - (it.orderedQuantity || 0)) > 0)
                                  .every((it: any) => selectedProposalGoods.includes(it.id))
                              }
                              onChange={(e) => {
                                const activeItems = proposalToConvert.items.filter((it: any) => (it.quantity - (it.orderedQuantity || 0)) > 0);
                                if (e.target.checked) {
                                  setSelectedProposalGoods(activeItems.map((it: any) => it.id));
                                } else {
                                  setSelectedProposalGoods([]);
                                }
                              }}
                            />
                          </th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Tên hàng hóa</th>
                          <th style={{ width: "90px", padding: "8px", textAlign: "center" }}>SL đề nghị</th>
                          <th style={{ width: "90px", padding: "8px", textAlign: "center" }}>SL đã đặt</th>
                          <th style={{ width: "90px", padding: "8px", textAlign: "center" }}>SL còn lại</th>
                          <th style={{ width: "70px", padding: "8px", textAlign: "center" }}>ĐVT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposalToConvert.items.map((item: any) => {
                          const isChecked = selectedProposalGoods.includes(item.id);
                          const orderedQty = item.orderedQuantity || 0;
                          const remainingQty = item.quantity - orderedQty;
                          const isFullyOrdered = remainingQty <= 0;
                          return (
                            <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0", background: isFullyOrdered ? "#f8fafc" : "transparent" }}>
                              <td style={{ padding: "8px", textAlign: "center" }}>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  disabled={isFullyOrdered}
                                  onChange={() => {
                                    setSelectedProposalGoods(prev => 
                                      isChecked ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                    );
                                  }}
                                />
                              </td>
                              <td style={{ padding: "8px", color: isFullyOrdered ? "#94a3b8" : "inherit" }}>
                                {item.productName}
                              </td>
                              <td style={{ padding: "8px", textAlign: "center", color: isFullyOrdered ? "#94a3b8" : "inherit" }}>
                                {Number(item.quantity).toLocaleString("en-US")}
                              </td>
                              <td style={{ padding: "8px", textAlign: "center", color: isFullyOrdered ? "#94a3b8" : "#16a34a", fontWeight: 600 }}>
                                {Number(orderedQty).toLocaleString("en-US")}
                              </td>
                              <td style={{ padding: "8px", textAlign: "center", color: remainingQty > 0 ? "#ef4444" : "#94a3b8", fontWeight: 600 }}>
                                {Number(remainingQty > 0 ? remainingQty : 0).toLocaleString("en-US")}
                              </td>
                              <td style={{ padding: "8px", textAlign: "center", color: isFullyOrdered ? "#94a3b8" : "inherit" }}>
                                {item.unit || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button 
                      type="button" 
                      className="sapo-btn sapo-btn-secondary" 
                      onClick={() => setShowProposalGoodsModal(false)}
                    >
                      Hủy
                    </button>
                    <button 
                      type="button" 
                      className="sapo-btn" 
                      onClick={handleConfirmProposalGoods}
                    >
                      Xác nhận
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      {confirmUpdate && (
        <div className="modal-overlay-base" style={{ zIndex: 100000 }}>
          <div className="modal-content-base" style={{ maxWidth: "440px", width: "90%", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", textAlign: "center" }}>
            <div style={{ 
              width: "60px", 
              height: "60px", 
              borderRadius: "50%", 
              background: confirmUpdate.status === "DELETE" || confirmUpdate.status === "RECALL" || confirmUpdate.status === "REJECT_PROPOSAL" ? "#fef2f2" : "#fff7ed", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto 1.25rem",
              color: confirmUpdate.status === "DELETE" || confirmUpdate.status === "RECALL" || confirmUpdate.status === "Từ chối" || confirmUpdate.status === "REJECT_PROPOSAL" ? "#ef4444" : "#f97316"
            }}>
              {confirmUpdate.status === "DELETE" || confirmUpdate.status === "RECALL" || confirmUpdate.status === "Từ chối" || confirmUpdate.status === "REJECT_PROPOSAL" ? <AlertTriangle size={32} /> : <CheckCircle size={32} />}
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: "0 auto 0.75rem", color: "#1e293b" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? "Gửi phê duyệt" : 
               confirmUpdate.status === "RECALL" ? "Thu hồi đơn mua" : 
               confirmUpdate.status === "Từ chối" ? "Từ chối đơn mua" : 
               confirmUpdate.status === "Chờ thực hiện" ? "Phê duyệt đơn" : 
               confirmUpdate.status === "DELETE" ? "Xóa đơn mua hàng" :
               confirmUpdate.status === "COMPLETE" ? "Hoàn thành đề nghị" :
               confirmUpdate.status === "REJECT_PROPOSAL" ? "Từ chối đề nghị" :
               "Xác nhận thay đổi"}
            </h3>
            <div style={{ color: "#475569", lineHeight: "1.6", margin: "0 auto 1.75rem" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? (
                <>
                  <p style={{ margin: 0 }}>Bạn có chắc muốn gửi đơn mua hàng <strong>{confirmUpdate.info}</strong> để chờ phê duyệt không?</p>
                  <p style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "600", background: "#fef2f2", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                    ⚠️ Đơn mua hàng sẽ không được sửa đổi khi đang chờ phê duyệt.
                  </p>
                </>
              ) : confirmUpdate.status === "RECALL" ? (
                <>
                  <p style={{ margin: 0 }}>
                    Bạn có chắc muốn thu hồi đơn mua hàng <strong>{confirmUpdate.info}</strong> không? Đơn mua này sẽ bị xóa.
                  </p>
                </>
              ) : confirmUpdate.status === "Từ chối" ? (
                <>
                  <p style={{ margin: 0 }}>Bạn có chắc muốn từ chối đơn mua hàng <strong>{confirmUpdate.info.replace("Từ chối: ", "")}</strong> không?</p>
                  <p style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "600", background: "#fef2f2", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                    Đơn hàng sẽ chuyển sang trạng thái "Từ chối" và hiện thông báo ở cột bên phải.
                  </p>
                </>
              ) : confirmUpdate.status === "Chờ thực hiện" ? (
                <>
                  <p style={{ margin: 0 }}>Bạn có chắc muốn phê duyệt đơn mua hàng <strong>{confirmUpdate.info}</strong> không?</p>
                  <p style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "600", background: "#ecfdf5", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                    Đơn mua hàng sẽ chuyển sang trạng thái "Chờ mua hàng".
                  </p>
                </>
              ) : confirmUpdate.status === "DELETE" ? (
                <p style={{ margin: 0 }}>Bạn có chắc muốn xóa đơn mua hàng <strong>{confirmUpdate.info}</strong> không?</p>
              ) : confirmUpdate.status === "COMPLETE" ? (
                <p style={{ margin: 0 }}>Bạn có chắc chắn muốn chuyển đề nghị mua <strong>{confirmUpdate.info}</strong> sang trạng thái 'Hoàn thành'?</p>
              ) : confirmUpdate.status === "REJECT_PROPOSAL" ? (
                <p style={{ margin: 0 }}>Bạn có chắc chắn muốn từ chối đề nghị mua <strong>{confirmUpdate.info}</strong> và chuyển trạng thái thành "Tạo mới"?</p>
              ) : (
                <p style={{ margin: 0 }}>Chuyển trạng thái đơn mua hàng sang <strong>"{confirmUpdate.status}"</strong>?</p>
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
                  backgroundColor: confirmUpdate.status === "DELETE" || confirmUpdate.status === "RECALL" || confirmUpdate.status === "REJECT_PROPOSAL" ? "#ef4444" : "#003466",
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
    </div>
  );
}
