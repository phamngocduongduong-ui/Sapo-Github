"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { 
  Plus, Trash2, Pencil, Send, Undo2, History, X, Eye, ArrowRightLeft, Calendar, AlertTriangle, CheckCircle, Save
} from "lucide-react";
import { 
  getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, 
  deletePurchaseOrder, updatePOStatus, getProducts, getWarehouses, getBranches,
  getMaintenanceProposals, createPOFromProposal, getSuppliers, completeProposal
} from "./actions";
import HistoryModal from "../../HistoryModal";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";

export default function PurchaseOrderPage() {
  const [items, setItems] = useState<any[]>([]);
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
  const [activeTab, setActiveTab] = useState<"pending" | "ordered">("pending");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  useRealTimeSync("purchase-orders", items, setItems, 3000, showModal || showProposalGoodsModal);
  useRealTimeSync("maintenance-proposals", proposals, setProposals, 3000, showModal || showProposalGoodsModal);

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

  // Combined List for Tabs
  const combinedList = useMemo(() => {
    const list: any[] = [];
    
    // Add Purchase Orders (PO)
    items.forEach(po => {
      const isPendingStatus = po.status === "Tạo mới" || po.status === "Chờ phê duyệt";
      if (activeTab === "pending" && isPendingStatus) {
        list.push({ 
          ...po, 
          rowType: "PO", 
          code: po.poCode, 
          date: po.requestedDate, 
          dateText: new Date(po.requestedDate).toLocaleDateString("vi-VN"), 
          creator: po.creator, 
          branch: po.branch, 
          purpose: po.purpose, 
          delivery: po.deliveryLocation || "—", 
          status: po.status, 
          itemsList: po.purchaseorderdetail || [] 
        });
      } else if (activeTab === "ordered" && !isPendingStatus) {
        list.push({ 
          ...po, 
          rowType: "PO", 
          code: po.poCode, 
          date: po.requestedDate, 
          dateText: new Date(po.requestedDate).toLocaleDateString("vi-VN"), 
          creator: po.creator, 
          branch: po.branch, 
          purpose: po.purpose, 
          delivery: po.deliveryLocation || "—", 
          status: po.status, 
          itemsList: po.purchaseorderdetail || [] 
        });
      }
    });

    // Add Maintenance Proposals
    proposals.forEach(prop => {
      if (activeTab === "pending" && prop.status === "Đã phê duyệt") {
        list.push({ 
          ...prop, 
          rowType: "PROPOSAL", 
          code: prop.proposalCode, 
          date: prop.proposalDate, 
          dateText: new Date(prop.proposalDate).toLocaleDateString("vi-VN"), 
          creator: prop.proposer, 
          branch: prop.branch, 
          purpose: prop.purpose, 
          delivery: "—", 
          status: "Đề nghị chưa đặt", 
          itemsList: prop.items || [] 
        });
      }
    });

    // Sort by createdAt desc
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, proposals, activeTab]);

  // Filter Logic
  const filteredList = useMemo(() => {
    return combinedList.filter((row) => {
      const matchSearch =
        !filterSearch ||
        row.code.toLowerCase().includes(filterSearch.toLowerCase()) ||
        row.creator.toLowerCase().includes(filterSearch.toLowerCase());
      
      const matchStatus = !filterStatus || (
        filterStatus === "Chờ mua hàng" 
          ? (row.status === "Chờ mua hàng" || row.status === "Chờ thực hiện")
          : row.status === filterStatus
      );

      const matchBranch = !filterBranch || row.branch === filterBranch;

      const matchMonth = !filterMonth || (() => {
        const d = new Date(row.date);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        return `${year}-${month}` === filterMonth;
      })();

      return matchSearch && matchStatus && matchBranch && matchMonth;
    });
  }, [combinedList, filterSearch, filterStatus, filterBranch, filterMonth]);

  const uniqueBranches = useMemo(() => {
    const list = Array.from(new Set(combinedList.map((p) => p.branch))).filter(Boolean);
    if (filterBranch && !list.includes(filterBranch)) {
      list.push(filterBranch);
    }
    return list.sort();
  }, [combinedList, filterBranch]);

  const handleTabChange = (tab: "pending" | "ordered") => {
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

  const handleView = (item: any) => {
    if (selectedType === "PROPOSAL") {
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
    if (!confirm(`Bạn có chắc chắn muốn chuyển đề nghị mua ${code} sang trạng thái 'Hoàn thành'?`)) return;
    startTransition(async () => {
      try {
        await completeProposal(id);
        fetchData();
        setSelectedId(null);
        setSelectedType(null);
      } catch (err: any) {
        alert(err.message);
      }
    });
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
          formData.set("branch", proposalToConvert.branch);
          formData.set("purpose", `Mua vật tư bảo trì theo đề xuất ${proposalToConvert.proposalCode}`);
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
        await updatePOStatus(id, status);
        fetchData();
        setSelectedId(null);
        setSelectedType(null);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleDelete = (id: string, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đơn mua hàng ${code} không?`)) return;
    startTransition(async () => {
      try {
        await deletePurchaseOrder(id);
        fetchData();
        setSelectedId(null);
        setSelectedType(null);
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
      ` }} />

      <div className="breadcrumb-banner">
        ĐƠN MUA HÀNG
      </div>

      {/* Tabs Layout */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", marginTop: "10px", overflowX: "auto", paddingBottom: "0.5rem" }}>
        <button 
          onClick={() => handleTabChange("pending")}
          className={`sapo-btn ${activeTab === "pending" ? "" : "btn-outline"}`}
          style={{ height: "32px", padding: "0 15px", borderRadius: "6px" }}
        >
          📝 Đề nghị mua chờ đặt hàng ({
            items.filter(i => i.status === "Tạo mới" || i.status === "Chờ phê duyệt").length + 
            proposals.filter(p => p.status === "Đã phê duyệt").length
          })
        </button>
        <button 
          onClick={() => handleTabChange("ordered")}
          className={`sapo-btn ${activeTab === "ordered" ? "" : "btn-outline"}`}
          style={{ height: "32px", padding: "0 15px", borderRadius: "6px" }}
        >
          ✅ Đề nghị mua đã đặt hàng ({
            items.filter(i => i.status !== "Tạo mới" && i.status !== "Chờ phê duyệt").length
          })
        </button>
      </div>

      {/* Filters Grid */}
      <div className="base-filters" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "10px", marginBottom: "10px" }}>
        <div>
          <label className="filter-label">Tìm kiếm</label>
          <input 
            type="text" 
            className="form-control" 
            style={{ width: "100%" }}
            placeholder="Tìm theo số đơn/đề nghị, người tạo..."
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
            {activeTab === "pending" ? (
              <>
                <option value="Đề nghị chưa đặt">Đề nghị chưa đặt</option>
                <option value="Tạo mới">Đơn nháp</option>
                <option value="Chờ phê duyệt">Chờ phê duyệt</option>
              </>
            ) : (
              <>
                <option value="Chờ mua hàng">Chờ mua hàng</option>
                <option value="Chờ giao hàng">Chờ giao hàng</option>
                <option value="Đã nhập kho">Đã nhập kho</option>
              </>
            )}
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

            {selectedItem && (
              <>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => handleView(selectedItem)}
                >
                  Xem
                </button>

                {selectedType === "PO" && selectedItem.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleEdit(selectedItem)}
                  >
                    Sửa
                  </button>
                )}

                {selectedType === "PROPOSAL" && activeTab === "pending" && (
                  <>
                    <button
                      type="button"
                      className="sapo-btn sapo-btn-success"
                      onClick={() => handleConvertProposal(selectedItem)}
                    >
                      <Plus size={14} /> Đặt hàng
                    </button>
                    <button
                      type="button"
                      className="sapo-btn"
                      style={{ backgroundColor: "#16a34a", color: "#fff" }}
                      onClick={() => handleCompleteProposal(selectedItem.id, selectedItem.code)}
                    >
                      Hoàn thành
                    </button>
                  </>
                )}

                {selectedType === "PO" && selectedItem.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusChange(selectedItem.id, "Chờ phê duyệt", selectedItem.poCode)}
                  >
                    Gửi
                  </button>
                )}

                {selectedType === "PO" && selectedItem.status === "Chờ phê duyệt" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusChange(selectedItem.id, "Tạo mới", selectedItem.poCode)}
                  >
                    Thu hồi
                  </button>
                )}

                {selectedType === "PO" && selectedItem.status === "Chờ phê duyệt" && (currentUser?.isAdmin || currentUser?.permissions?.includes("TM_APPROVE")) && (
                  <>
                    <button
                      type="button"
                      className="sapo-btn sapo-btn-success"
                      onClick={() => handleStatusChange(selectedItem.id, "Chờ thực hiện", selectedItem.poCode)}
                    >
                      Duyệt
                    </button>
                    <button
                      type="button"
                      className="sapo-btn sapo-btn-danger"
                      onClick={() => handleStatusChange(selectedItem.id, "Tạo mới", "Hủy: " + selectedItem.poCode)}
                    >
                      Từ chối
                    </button>
                  </>
                )}

                {selectedType === "PO" && currentUser?.isAdmin && (
                  <button
                    type="button"
                    className="sapo-btn sapo-btn-danger"
                    onClick={() => handleDelete(selectedItem.id, selectedItem.poCode)}
                  >
                    Xóa
                  </button>
                )}

                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => {
                    setHistoryTableName(selectedType === "PROPOSAL" ? "MaintenanceProposal" : "PurchaseOrder");
                    setHistoryRecordId(selectedItem.id);
                  }}
                >
                  Lịch sử
                </button>
              </>
            )}
          </div>

          {/* Table */}
          <div className="base-table-wrapper" style={filteredList.length === 0 ? { height: "auto" } : undefined}>
            <table className="base-table">
              <thead>
                <tr>
                  <th className="nowrap" style={{ width: "50px" }}>STT</th>
                  <th className="nowrap" style={{ width: "150px" }}>Loại</th>
                  <th className="nowrap" style={{ width: "140px" }}>Số đơn / đề nghị</th>
                  <th className="nowrap" style={{ width: "100px" }}>Ngày tạo</th>
                  <th className="nowrap" style={{ width: "100px" }}>Ngày đề nghị</th>
                  <th style={{ width: "150px" }}>Người đề nghị</th>
                  <th style={{ width: "150px" }}>Chi nhánh</th>
                  <th style={{ width: "200px" }}>Mục đích</th>
                  <th style={{ width: "150px" }}>Nơi giao</th>
                  <th style={{ minWidth: "250px" }}>Thông tin hàng hóa</th>
                  <th className="nowrap" style={{ width: "120px" }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                      Không tìm thấy đơn mua hàng hoặc đề nghị bảo trì nào
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item, idx) => {
                    const isSelected = selectedId === item.id && selectedType === item.rowType;
                    return (
                      <tr
                        key={`${item.rowType}-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) {
                            setSelectedId(null);
                            setSelectedType(null);
                          } else {
                            setSelectedId(item.id);
                            setSelectedType(item.rowType);
                          }
                        }}
                        onDoubleClick={() => handleView(item)}
                        className={`row-hoverable ${isSelected ? "row-selected" : ""}`}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{idx + 1}</td>
                        <td className="nowrap" style={{ textAlign: "center" }}>
                          <span style={{ 
                            fontWeight: 700, 
                            color: item.rowType === "PO" ? "#2563eb" : "#f43f5e",
                            background: item.rowType === "PO" ? "#eff6ff" : "#fff1f2",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px"
                          }}>
                            {item.rowType === "PO" ? "Đơn mua hàng" : "Đề nghị bảo trì"}
                          </span>
                        </td>
                        <td className="nowrap" style={{ textAlign: "center", fontWeight: 600, color: "var(--primary-color)" }}>{item.code}</td>
                        <td className="nowrap" style={{ textAlign: "center" }}>
                          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="nowrap" style={{ textAlign: "center" }}>
                          {new Date(item.date).toLocaleDateString("vi-VN")}
                        </td>
                        <td style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{item.creator}</td>
                        <td style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{item.branch}</td>
                        <td style={{ textAlign: "center" }}>{item.purpose}</td>
                        <td style={{ textAlign: "center" }}>{item.delivery}</td>
                        <td style={{ textAlign: "left", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {item.rowType === "PO" ? (
                              (item.itemsList || []).map((goods: any, gIdx: number) => (
                                <div key={goods.id} style={{ fontSize: "12px", borderBottom: gIdx < (item.itemsList.length - 1) ? "1px dashed #cbd5e1" : "none", paddingBottom: "2px", color: "#334155" }}>
                                  {gIdx + 1}. {goods.productName} - ĐVT: {goods.unit || "—"} - SL: {Number(goods.requestedQuantity).toLocaleString("en-US")}
                                </div>
                              ))
                            ) : (
                              (item.itemsList || []).map((goods: any, gIdx: number) => (
                                <div key={goods.id} style={{ fontSize: "12px", borderBottom: gIdx < (item.itemsList.length - 1) ? "1px dashed #cbd5e1" : "none", paddingBottom: "2px", color: "#334155" }}>
                                  {gIdx + 1}. {goods.productName} - ĐVT: {goods.unit || "—"} - SL: {Number(goods.quantity).toLocaleString("en-US")}
                                  {goods.orderedQuantity > 0 && (
                                    <span style={{ color: "#16a34a", fontWeight: "600" }}>
                                      {` (Đã đặt: ${Number(goods.orderedQuantity).toLocaleString("en-US")} - ${goods.poStatus || "Chờ giao hàng"})`}
                                    </span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="nowrap" style={{ textAlign: "center" }}>
                          <span
                            className={`status-pill ${
                              item.status === "Đã nhập kho" || item.status === "Chờ giao hàng" || item.status === "Chờ thực hiện" || item.status === "Chờ mua hàng" || item.status === "Hoàn thành"
                                ? "status-active"
                                : item.status === "Tạo mới" || item.status === "Đề nghị chưa đặt"
                                ? "status-new"
                                : item.status === "Chờ phê duyệt"
                                ? "status-pending"
                                : "status-inactive"
                            }`}
                          >
                            {item.status === "Chờ thực hiện" ? "Chờ mua hàng" : item.status}
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
            <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "16px 24px", margin: 0, background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🔍 Xem chi tiết đề nghị bảo trì:</span>
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
              <div className="responsive-table-wrapper" style={{ overflowX: "auto", overflowY: "hidden", border: "1px solid #e2e8f0", borderRadius: "8px", width: "100%" }}>
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
            </div>

            <div style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              {activeTab === "pending" && (
                <button type="button" className="sapo-btn sapo-btn-success" onClick={() => { setViewingProposal(null); handleConvertProposal(viewingProposal); }}>
                  Đặt hàng
                </button>
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
            <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "16px 24px", margin: 0, background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              {isViewOnly ? (
                <>
                  <span>🔍 Xem chi tiết đơn mua hàng:</span>
                  <span style={{ color: "#ff5c00" }}>{editingPO?.poCode}</span>
                </>
              ) : editingPO ? (
                <>
                  <span>✏️ Chỉnh sửa đơn mua hàng:</span>
                  <span style={{ color: "#ff5c00" }}>{editingPO?.poCode}</span>
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
                        💳 Công nợ nhà cung cấp: {s.debtPolicy || s.debtDays || 0} ngày
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
                      value={editingPO ? editingPO.poCode : "Hệ thống tự tạo"} 
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
                    gridTemplateColumns: "1fr 2fr",
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
                        value={proposalToConvert.purpose || `Mua vật tư bảo trì theo đề xuất ${proposalToConvert.proposalCode}`}
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
                        <Plus size={14} /> Thêm mặt hàng
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
        <div className="modal-overlay-base" style={{ zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)" }}>
          <div className="card" style={{ maxWidth: "450px", width: "90%", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", textAlign: "center", background: "#fff", borderRadius: "12px", border: "1px solid #cbd5e1" }}>
            <div style={{ 
              width: "60px", 
              height: "60px", 
              borderRadius: "50%", 
              background: confirmUpdate.status === "DELETE" ? "#fef2f2" : "#fff7ed", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              margin: "0 auto 0.5rem",
              color: confirmUpdate.status === "DELETE" ? "#ef4444" : "#f97316"
            }}>
              {confirmUpdate.status === "DELETE" ? <AlertTriangle size={32} /> : <CheckCircle size={32} />}
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, color: "#1e293b" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? "Gửi phê duyệt" : 
               confirmUpdate.status === "Tạo mới" ? (confirmUpdate.info.startsWith("Hủy") ? "Từ chối đơn mua" : "Thu hồi đơn mua") : 
               confirmUpdate.status === "Chờ thực hiện" ? "Phê duyệt đơn" : 
               "Xác nhận thay đổi"}
            </h3>
            <div style={{ color: "#475569", lineHeight: "1.6", margin: "0 0 1rem 0" }}>
              {confirmUpdate.status === "Chờ phê duyệt" ? (
                <>
                  <p style={{ margin: 0 }}>Bạn có chắc muốn gửi đơn mua hàng <strong>{confirmUpdate.info}</strong> để chờ phê duyệt không?</p>
                  <p style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "600", background: "#fef2f2", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                    ⚠️ Đơn mua hàng sẽ không được sửa đổi khi đang chờ phê duyệt.
                  </p>
                </>
              ) : confirmUpdate.status === "Tạo mới" ? (
                <>
                  <p style={{ margin: 0 }}>Bạn có chắc muốn {confirmUpdate.info.startsWith("Hủy") ? "từ chối" : "thu hồi"} đơn mua hàng <strong>{confirmUpdate.info.replace("Hủy: ", "")}</strong> về trạng thái nháp không?</p>
                </>
              ) : confirmUpdate.status === "Chờ thực hiện" ? (
                <>
                  <p style={{ margin: 0 }}>Bạn có chắc muốn phê duyệt đơn mua hàng <strong>{confirmUpdate.info}</strong> không?</p>
                  <p style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: "600", background: "#ecfdf5", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                    Đơn mua hàng sẽ chuyển sang trạng thái "Chờ mua hàng".
                  </p>
                </>
              ) : (
                <p style={{ margin: 0 }}>Chuyển trạng thái đơn mua hàng sang <strong>"{confirmUpdate.status}"</strong>?</p>
              )}
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button 
                type="button"
                className="sapo-btn sapo-btn-secondary" 
                style={{ flex: 1, justifyContent: "center" }} 
                onClick={() => setConfirmUpdate(null)}
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                className="sapo-btn" 
                style={{ flex: 1, background: "#2563eb", justifyContent: "center" }} 
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
