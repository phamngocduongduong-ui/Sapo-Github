"use client";

import { useState, useTransition, useRef, useEffect, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { Check, RotateCcw, MoreHorizontal, Pencil, History, CheckCircle, PowerOff, Mail, Clock, Eye, Trash2 } from "lucide-react";
import { createOrder, updateOrder, deleteOrder, approveOrder, updateOrderStatus } from "./actions";
import HistoryModal from "../../HistoryModal";
import { formatNumber, formatCurrency } from "@/lib/format";

const getYearMonthString = (dateInput: any) => {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatYearMonth = (dateInput: any) => {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Formatting helper: Commas for thousands, dot for decimals
export function formatLocaleNumber(num: number): string {
  if (num === undefined || num === null) return "0";
  const parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

// Parsing helper: Strips commas (thousands)
export function parseLocaleNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str
    .replace(/\s/g, "")
    .replace(/,/g, ""); // remove commas (thousands)
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Translate packaging to Vietnamese helper
export function translatePackagingToVietnamese(pkg: string | null | undefined): string {
  if (!pkg) return "";
  let result = pkg.toLowerCase();
  
  result = result.replace(/cartons|carton|ctns|ctn/g, "thùng");
  result = result.replace(/bags|bag/g, "túi");
  result = result.replace(/boxes|box/g, "hộp");
  result = result.replace(/drums|drum/g, "phuy");
  result = result.replace(/jars|jar/g, "hũ");
  result = result.replace(/bottles|bottle/g, "chai");
  result = result.replace(/packs|pack/g, "gói");
  result = result.replace(/cans|can/g, "lon");
  result = result.replace(/sachets|sachet/g, "gói nhỏ");
  
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export default function OrderTable({
  initialOrders,
  customers,
  branches,
  salesEmployees,
  currentUser,
  contracts = [],
  customersFull = [],
  products = []
}: {
  initialOrders: any[],
  customers: string[],
  branches: string[],
  salesEmployees: string[],
  currentUser: string,
  contracts?: any[],
  customersFull?: any[],
  products?: { code: string; name: string; englishName?: string | null; packaging?: string | null; unit?: { name: string }[] }[]
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [showModal, setShowModal] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  
  // State selected order
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // State bộ lọc
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState<{ id: string, status: string, info: string } | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  // Form controlled states
  const [formOrderCode, setFormOrderCode] = useState("");
  const [formCustomerCode, setFormCustomerCode] = useState("");
  const [formEmployeeName, setFormEmployeeName] = useState("");
  const [formBranch, setFormBranch] = useState("");
  const [formRequestDeliveryDate, setFormRequestDeliveryDate] = useState("");
  const [formThermometer, setFormThermometer] = useState(false);
  const [formNote, setFormNote] = useState("");

  // Contract selection states
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractSearchQuery, setContractSearchQuery] = useState("");
  const [selectedContractNumber, setSelectedContractNumber] = useState<string | null>(null);
  const [showContractItemModal, setShowContractItemModal] = useState(false);
  const [selectedContractItemIds, setSelectedContractItemIds] = useState<string[]>([]);




  const selectedContractObj = selectedContractNumber 
    ? (contracts || []).find(c => c.contractNumber === selectedContractNumber) 
    : null;

  // Helper function to extract abbreviation
  const getCustomerAbbreviation = (buyerName: string) => {
    const cust = customersFull.find(c => c.name.toLowerCase() === buyerName.toLowerCase());
    return cust?.abbreviation || "";
  };

  // Helper function to parse contract delivery date
  const parseDeliveryDate = (deliveryDateStr: string | null, contractDate: any) => {
    if (!deliveryDateStr) return getYearMonthString(contractDate);
    if (/^\d{4}-\d{2}$/.test(deliveryDateStr)) {
      return deliveryDateStr;
    }
    const match = deliveryDateStr.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
    const d = new Date(deliveryDateStr);
    if (!isNaN(d.getTime())) {
      return getYearMonthString(d);
    }
    return getYearMonthString(contractDate);
  };

  const filteredContracts = useMemo(() => {
    const approvedContracts = (contracts || []).filter(c => c.status === "Đã phê duyệt");
    if (!contractSearchQuery) return approvedContracts;
    const query = contractSearchQuery.toLowerCase().trim();
    return approvedContracts.filter(c => {
      const cust = customersFull.find(cust => cust.name.toLowerCase() === c.buyer.toLowerCase());
      const abbreviation = cust?.abbreviation?.toLowerCase() || "";
      const name = cust?.name?.toLowerCase() || c.buyer.toLowerCase();
      
      return (
        c.contractNumber.toLowerCase().includes(query) ||
        name.includes(query) ||
        abbreviation.includes(query)
      );
    });
  }, [contracts, contractSearchQuery, customersFull]);

  function handleSelectContract(contract: any) {
    const cust = customersFull.find(
      c => c.name.toLowerCase() === contract.buyer.toLowerCase() ||
           c.abbreviation?.toLowerCase() === contract.buyer.toLowerCase()
    );
    if (cust) {
      setFormCustomerCode(cust.code);
    }
    
    if (contract.salesEmployee) {
      setFormEmployeeName(contract.salesEmployee);
    }
    
    setFormThermometer(contract.thermometer);
    
    if (contract.deliveryDate) {
      setFormRequestDeliveryDate(parseDeliveryDate(contract.deliveryDate, contract.contractDate));
    } else {
      setFormRequestDeliveryDate(getYearMonthString(contract.contractDate));
    }
    
    const contractNote = `Hợp đồng: ${contract.contractNumber}`;
    let cleanNote = formNote || "";
    const match = cleanNote.match(/Hợp đồng:\s*(.*?)(?:\s+-\s+|$)/);
    if (match) {
      cleanNote = cleanNote.replace(match[0], "").trim();
    }
    
    if (cleanNote) {
      setFormNote(`${contractNote} - ${cleanNote}`);
    } else {
      setFormNote(contractNote);
    }

    // Auto-generate orderCode
    const contractOrders = orders.filter(o => 
      o.note && o.note.includes(`Hợp đồng: ${contract.contractNumber}`)
    );
    const nextSeq = contractOrders.length + 1;
    const seqStr = String(nextSeq).padStart(2, '0');
    const contractSuffix = contract.contractNumber.slice(-7);
    const generatedOrderCode = `PO${contractSuffix}.${seqStr}`;
    setFormOrderCode(generatedOrderCode);
    
    setSelectedContractNumber(contract.contractNumber);
    setShowContractModal(false);
  }

  function handleConfirmSelectItems() {
    const contractItems = selectedContractObj?.contractitem || [];
    const selectedItems = contractItems.filter(item => selectedContractItemIds.includes(item.id));
    
    if (selectedItems.length === 0) {
      setShowContractItemModal(false);
      return;
    }

    const mappedItems = selectedItems.map(item => {
      // Tìm sản phẩm tương ứng theo productCode để lấy tên tiếng Việt
      const matchedProduct = item.productCode ? (products || []).find(p => p.code === item.productCode) : null;
      const vName = matchedProduct ? matchedProduct.name : item.productName;
      
      const pkg = matchedProduct?.packaging || item.packaging || "";
      const translatedPkg = translatePackagingToVietnamese(pkg);

      return {
        productName: vName,
        packaging: translatedPkg,
        unit: item.unit || matchedProduct?.unit?.[0]?.name || (matchedProduct?.unit as any)?.name || "",
        quantity: item.quantity || 1,
        quantityInput: formatLocaleNumber(item.quantity || 1),
        hasPallet: selectedContractObj?.pallet ?? false,
        hasCornerGuard: false,
        printedBag: false,
        printedBox: false,
        brix: "",
        otherRequirements: "",
        note: item.note || ""
      };
    });

    setItems(prev => {
      if (prev.length === 1 && prev[0].productName === "") {
        return mappedItems;
      }
      return [...prev, ...mappedItems];
    });

    setShowContractItemModal(false);
  }


  function handleDelete(id: string, code: string) {
    if (confirm(`Bạn có chắc chắn muốn xóa đơn hàng số ${code} không?`)) {
      startTransition(async () => {
        try {
          await deleteOrder(id);
          setSelectedOrderId(null);
        } catch (err: any) { alert(err.message); }
      });
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Auto-Sync
  useRealTimeSync("orders", orders, setOrders);

  // Logic lọc dữ liệu
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchCustomer = !filterCustomer || order.customerCode === filterCustomer;
      const matchStatus = !filterStatus || order.status === filterStatus;
      const matchEmployee = !filterEmployee || order.employeeName === filterEmployee;
      const matchMonth = !filterMonth || (new Date(order.orderDate).getMonth() + 1).toString().padStart(2, '0') === filterMonth.split('-')[1];
      return matchCustomer && matchStatus && matchEmployee && matchMonth;
    });
  }, [orders, filterCustomer, filterStatus, filterEmployee, filterMonth]);

  const uniqueCustomersInOrders = useMemo(() => {
    return Array.from(new Set(orders.map(o => o.customerCode)));
  }, [orders]);

  function handleClose() {
    setShowModal(false);
    setEditingOrder(null);
    setIsViewMode(false);
    setItems([]);
    setError(null);

    // Reset form states
    setFormOrderCode("");
    setFormCustomerCode("");
    setFormEmployeeName("");
    setFormBranch("");
    setFormRequestDeliveryDate("");
    setFormThermometer(false);
    setFormNote("");
    setSelectedContractNumber(null);
  }

  function handleEdit(order: any) {
    setEditingOrder(order);
    setIsViewMode(false);
    setItems(order.orderitem.length > 0 
      ? order.orderitem.map((item: any) => ({
          ...item,
          quantityInput: formatLocaleNumber(item.quantity ?? 1),
          unit: item.unit ?? "",
          printedBag: item.printedBag ?? false,
          printedBox: item.printedBox ?? false,
          brix: item.brix ?? "",
          otherRequirements: item.otherRequirements ?? ""
        }))
      : []
    );
    setShowModal(true);

    // Initialize form states
    setFormOrderCode(order.orderCode);
    setFormCustomerCode(order.customerCode);
    setFormEmployeeName(order.employeeName);
    setFormBranch(order.branch ?? "");
    setFormRequestDeliveryDate(order.requestDeliveryDate ? getYearMonthString(order.requestDeliveryDate) : "");
    setFormThermometer(order.thermometer);
    setFormNote(order.note ?? "");
    
    // Parse contract number from note if it exists
    const match = order.note?.match(/Hợp đồng:\s*(.*?)(?:\s+-\s+|$)/);
    if (match) {
      setSelectedContractNumber(match[1]);
    } else {
      setSelectedContractNumber(null);
    }
  }

  function handleView(order: any) {
    setEditingOrder(order);
    setIsViewMode(true);
    setItems(order.orderitem.length > 0 
      ? order.orderitem.map((item: any) => ({
          ...item,
          quantityInput: formatLocaleNumber(item.quantity ?? 1),
          unit: item.unit ?? "",
          printedBag: item.printedBag ?? false,
          printedBox: item.printedBox ?? false,
          brix: item.brix ?? "",
          otherRequirements: item.otherRequirements ?? ""
        }))
      : []
    );
    setShowModal(true);

    // Initialize form states
    setFormOrderCode(order.orderCode);
    setFormCustomerCode(order.customerCode);
    setFormEmployeeName(order.employeeName);
    setFormBranch(order.branch ?? "");
    setFormRequestDeliveryDate(order.requestDeliveryDate ? getYearMonthString(order.requestDeliveryDate) : "");
    setFormThermometer(order.thermometer);
    setFormNote(order.note ?? "");
    
    // Parse contract number from note if it exists
    const match = order.note?.match(/Hợp đồng:\s*(.*?)(?:\s+-\s+|$)/);
    if (match) {
      setSelectedContractNumber(match[1]);
    } else {
      setSelectedContractNumber(null);
    }
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
        if (newStatus === "Chờ tiếp nhận") {
          await approveOrder(id);
        } else {
          await updateOrderStatus(id, newStatus);
        }
      } catch (err: any) { alert(err.message); }
    });
  }


  function removeItem(index: number) {
    if (isViewMode) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: any) {
    if (isViewMode) return;
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  // Handle formatted Quantity input changes
  const handleQuantityChange = (idx: number, rawVal: string) => {
    if (isViewMode) return;
    const cleanInput = rawVal.replace(/[^0-9.,-]/g, "");
    const newItems = [...items];
    newItems[idx].quantityInput = cleanInput;
    
    const parsed = parseLocaleNumber(cleanInput);
    newItems[idx].quantity = parsed;
    setItems(newItems);
  };
  
  const handleQuantityBlur = (idx: number) => {
    if (isViewMode) return;
    const newItems = [...items];
    const num = newItems[idx].quantity || 0;
    newItems[idx].quantityInput = formatLocaleNumber(num);
    setItems(newItems);
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isViewMode) return;
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingOrder) await updateOrder(editingOrder.id, formData, items);
        else await createOrder(formData, items);
        handleClose();
      } catch (err: any) { setError(err.message); }
    });
  }



  return (
    <div className="contract-page-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        .contract-page-container {
          width: 100%;
          min-width: 0;
        }
        .contract-page-container th,
        .custom-modal-overlay th,
        .modal-overlay-base th,
        .base-table th,
        .table th {
          font-family: "Segoe UI", -apple-system, sans-serif !important;
        }
        .contract-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px 10px 0px;
        }
        .contract-layout input,
        .contract-layout select,
        .contract-layout textarea,
        .contract-layout button,
        .contract-layout table,
        .contract-layout td,
        .contract-layout th,
        .contract-layout label,
        .contract-layout .badge,
        .contract-layout .blue-panel-header,
        .contract-page-container .breadcrumb-banner {
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
          gap: 1rem;
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
        .row-hoverable:hover {
          background-color: #f8fafc;
        }
        .row-selected {
          background-color: #eff6ff !important;
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
          gap: 5px !important;
        }
        .toolbar-right {
          display: flex !important;
          align-items: center !important;
          gap: 0.75rem !important;
        }
        .btn-group-base {
          display: flex !important;
          gap: 0.75rem !important;
        }
        .page-title-base {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: #000000 !important;
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          margin: 0 !important;
        }
        .badge-count {
          background: #e2e8f0 !important;
          color: #000000 !important;
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          padding: 2px 8px !important;
          border-radius: 999px !important;
          margin-left: 0.25rem !important;
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
          min-width: 1100px !important;
          table-layout: fixed !important;
        }
        .base-table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          background: #f1f5f9 !important;
          border-bottom: 2px solid #ff5c00 !important;
          border-right: 1px solid #cbd5e1 !important;
          text-align: center !important;
          height: 35px !important;
          padding-top: 6px !important;
          padding-bottom: 6px !important;
          white-space: normal !important;
          vertical-align: middle !important;
        }
        .base-table th:last-child {
          border-right: none !important;
        }
        .base-table td {
          padding: 6px 0.75rem !important;
          vertical-align: middle !important;
          white-space: normal !important;
          word-break: break-word !important;
          border-right: 1px solid #cbd5e1 !important;
        }
        .base-table td:last-child {
          border-right: none !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
        .nowrap, .base-table .nowrap {
          white-space: nowrap !important;
        }
        .search-box-base {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
        }
        .search-box-base input {
          width: 220px !important;
          padding: 6px 10px 6px 30px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          outline: none !important;
          font-weight: 500 !important;
        }
        .search-box-base .search-icon {
          position: absolute !important;
          left: 10px !important;
          color: #94a3b8 !important;
        }
        .base-filters {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          padding: 10px !important;
        }
        .form-control {
          padding: 6px 10px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          outline: none !important;
          background: white !important;
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
        .filter-label { display: block; margin-bottom: 0.4rem; font-size: 0.85rem; font-weight: 700; color: #003466; text-transform: uppercase; }
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
        .select-contract-btn {
          background-color: #003466 !important;
          color: #ffffff !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          padding: 6px 12px !important;
          border-radius: 6px !important;
          border: none !important;
          cursor: pointer !important;
        }
        .select-contract-btn:hover {
          background-color: #003466 !important;
          color: #ffffff !important;
          opacity: 1 !important;
        }
        .custom-modal-overlay .modal-footer-btn-secondary {
          background-color: #003466 !important;
          color: white !important;
          font-weight: 500 !important;
          border-radius: 6px !important;
          padding: 8px 20px !important;
          font-size: 14px !important;
          border: none !important;
          cursor: pointer !important;
        }
        .custom-modal-overlay .modal-footer-btn-secondary:hover {
          background-color: #003466 !important;
        }
        .custom-modal-overlay .modal-footer-btn-success {
          background-color: #003466 !important;
          color: white !important;
          font-weight: 500 !important;
          border-radius: 6px !important;
          padding: 8px 20px !important;
          font-size: 14px !important;
          border: none !important;
          cursor: pointer !important;
        }
        .custom-modal-overlay .modal-footer-btn-success:hover {
          background-color: #003466 !important;
        }
        
        .custom-modal-overlay .input {
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 5px 12px !important;
          height: 32px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        .custom-modal-overlay .input:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }
        .custom-modal-overlay select.input {
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 5px 12px !important;
          height: 32px !important;
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
        }
        .custom-modal-overlay .input-sm:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }
        .custom-modal-overlay textarea.input-sm {
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
        }
        .input-sm { width: 100%; padding: 5px 10px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.85rem; outline: none; }
        .input-sm:focus { border-color: #3498db; }
        .input-sm:disabled { background: #f8fafc; cursor: not-allowed; border: none; }
        .action-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
        .action-btn:hover { background: #f1f5f9; }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
        .search-item-hover:hover {
          background-color: #f1f5f9 !important;
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
        .base-table .status-pill.status-waiting {
          color: #7c3aed !important;
        }
        .base-table .status-pill.status-pending {
          color: #d97706 !important;
        }
        .base-table .status-pill.status-planning {
          color: #2563eb !important;
        }
        .base-table .status-pill.status-inactive {
          color: #dc2626 !important;
        }
        `
      }} />

      <div className="breadcrumb-banner">
        PHÂN HỆ ĐƠN HÀNG
      </div>

      <div className="base-filters" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "10px", marginBottom: "10px" }}>
        <div>
          <label className="filter-label">Mã khách hàng</label>
          <select className="form-control" style={{ width: "100%" }} value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}>
            <option value="">-- Tất cả khách hàng --</option>
            {uniqueCustomersInOrders.map(c => {
              const cust = (customersFull || []).find(custObj => custObj.code === c);
              const label = cust?.abbreviation ? `${cust.abbreviation}` : c;
              return <option key={c} value={c}>{label}</option>;
            })}
          </select>
        </div>
        <div>
          <label className="filter-label">Trạng thái</label>
          <select className="form-control" style={{ width: "100%" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">-- Tất cả trạng thái --</option>
            <option value="Tạo mới">Tạo mới</option>
            <option value="Chờ tiếp nhận">Chờ tiếp nhận</option>
            <option value="Chờ kế hoạch">Chờ kế hoạch</option>
            <option value="Chờ giao hàng">Chờ giao hàng</option>
            <option value="Đã giao hàng">Đã giao hàng</option>
          </select>
        </div>
        <div>
          <label className="filter-label">Nhân viên</label>
          <select className="form-control" style={{ width: "100%" }} value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
            <option value="">-- Tất cả nhân viên --</option>
            {salesEmployees.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="filter-label">Tháng</label>
          <input type="month" className="form-control" style={{ width: "100%" }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
        </div>
      </div>

      <div className="contract-layout" style={{ paddingTop: "0px" }}>
        <div className="panel-full">
          {/* Action Toolbar */}
          <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center", marginTop: "0px" }}>
            <button
              type="button"
              className="sapo-btn"
              onClick={() => {
                setIsViewMode(false);
                setShowModal(true);
                // Initialize form states for new order
                setFormOrderCode("");
                setFormCustomerCode("");
                setFormEmployeeName(currentUser);
                setFormBranch("");
                setFormRequestDeliveryDate("");
                setFormThermometer(false);
                setFormNote("");
                setSelectedContractNumber(null);
              }}
            >
              Thêm mới
            </button>
            <button
              type="button"
              className="sapo-btn sapo-btn-secondary"
              onClick={() => router.refresh()}
            >
              Làm mới
            </button>

            {selectedOrder && (
              <>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => handleView(selectedOrder)}
                >
                  Xem
                </button>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => setHistoryRecordId(selectedOrder.id)}
                >
                  Lịch sử
                </button>

                {selectedOrder.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleEdit(selectedOrder)}
                  >
                    Sửa
                  </button>
                )}
                {selectedOrder.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusChange(selectedOrder.id, "Chờ tiếp nhận", `đơn ${selectedOrder.orderCode}`)}
                  >
                    Gửi tiếp nhận
                  </button>
                )}
                {selectedOrder.status === "Chờ tiếp nhận" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusChange(selectedOrder.id, "Tạo mới", `đơn ${selectedOrder.orderCode}`)}
                  >
                    Thu hồi
                  </button>
                )}
                {selectedOrder.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn sapo-btn-danger"
                    onClick={() => handleDelete(selectedOrder.id, selectedOrder.orderCode)}
                  >
                    Xóa
                  </button>
                )}
              </>
            )}


          </div>

          {/* Orders Table */}
          <div className="base-table-wrapper" style={filteredOrders.length === 0 ? { height: "auto" } : undefined}>
            <table className="base-table">
              <thead>
                <tr>
                  <th className="th-first" style={{ width: "45px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>STT</th>
                  <th style={{ width: "105px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Mã ĐH</th>
                  <th style={{ width: "65px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Mã KH</th>
                  <th style={{ width: "150px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Nhân viên</th>
                  <th style={{ width: "100px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Ngày tạo</th>
                  <th style={{ width: "95px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Chi nhánh</th>
                  <th style={{ width: "110px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Thời gian giao đề nghị</th>
                  <th style={{ width: "95px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Ngày xuất dự kiến</th>
                  <th style={{ width: "90px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Tổng số lượng</th>
                  <th style={{ width: "90px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Tổng giá trị</th>
                  <th className="th-last" style={{ width: "100px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => (
                  <tr
                    key={order.id}
                    onClick={() => {
                      const isSelected = selectedOrderId === order.id;
                      setSelectedOrderId(isSelected ? null : order.id);
                    }}
                    title="Nhấp để chọn đơn hàng"
                    className={`row-hoverable ${selectedOrderId === order.id ? "row-selected" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{idx + 1}</td>
                    <td className="nowrap" style={{ fontWeight: 600, textAlign: "center" }}>{order.orderCode}</td>
                    <td className="nowrap" style={{ textAlign: "center" }}>
                      {(() => {
                        const cust = (customersFull || []).find(c => c.code === order.customerCode);
                        return cust?.abbreviation || order.customerCode;
                      })()}
                    </td>
                    <td className="nowrap" style={{ textAlign: "center" }}>{order.employeeName}</td>
                    <td className="nowrap" style={{ textAlign: "center" }}>{new Date(order.orderDate).toLocaleDateString("vi-VN")}</td>
                    <td className="nowrap" style={{ textAlign: "center" }}>{order.branch}</td>
                    <td className="nowrap" style={{ textAlign: "center" }}>{formatYearMonth(order.requestDeliveryDate)}</td>
                    <td className="nowrap" style={{ textAlign: "center" }}>{order.shipDate ? new Date(order.shipDate).toLocaleDateString("vi-VN") : "—"}</td>
                    {(() => {
                      const match = order.note?.match(/Hợp đồng:\s*(.*?)(?:\s+-\s+|$)/);
                      const contractNo = match ? match[1]?.trim() : null;
                      const contractObj = contractNo ? contracts.find((c: any) => c.contractNumber?.trim() === contractNo) : null;
                      
                      const totalQty = order.orderitem?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
                      
                      const totalAmount = order.orderitem?.reduce((sum: number, item: any) => {
                        if (contractObj && contractObj.contractitem) {
                          const itemProdName = (item.productName || "").trim().toLowerCase();
                          const matchedProduct = (products || []).find(p => 
                            (p.name || "").trim().toLowerCase() === itemProdName ||
                            (p.englishName && (p.englishName || "").trim().toLowerCase() === itemProdName)
                          );
                          const matchedContractItem = contractObj.contractitem.find(
                            (ci: any) => {
                              const ciCode = (ci.productCode || "").trim().toLowerCase();
                              const ciName = (ci.productName || "").trim().toLowerCase();
                              return (matchedProduct && ciCode === (matchedProduct.code || "").trim().toLowerCase()) ||
                                     ciName === itemProdName;
                            }
                          );
                          if (matchedContractItem) {
                            return sum + (item.quantity || 0) * (matchedContractItem.price || 0);
                          }
                        }
                        return sum;
                      }, 0) || 0;

                      return (
                        <>
                          <td className="nowrap" style={{ textAlign: "right", paddingRight: "15px", fontWeight: 600 }}>{formatNumber(totalQty)}</td>
                          <td className="nowrap" style={{ textAlign: "right", paddingRight: "15px", fontWeight: 600 }}>{"$" + formatNumber(totalAmount)}</td>
                        </>
                      );
                    })()}
                    <td className="nowrap" style={{ textAlign: "center" }}>
                      <span
                        className={`status-pill ${
                          order.status === "Đã giao hàng"
                            ? "status-active"
                            : order.status === "Tạo mới"
                            ? "status-new"
                            : order.status === "Chờ tiếp nhận"
                            ? "status-waiting"
                            : order.status === "Chờ kế hoạch"
                            ? "status-planning"
                            : order.status === "Đã hủy"
                            ? "status-inactive"
                            : "status-pending"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ textAlign: "center", padding: "2rem", color: "#000", fontWeight: 600 }}>
                      Chưa có đơn hàng nào phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {historyRecordId && (
        <HistoryModal 
          tableName="Order" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {showModal && (
        <div className="custom-modal-overlay">
          <div
            style={{
              width: "95%",
              maxWidth: "1010px",
              maxHeight: "90%",
              height: "auto",
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
            <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "16px 30px", margin: 0, background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              {isViewMode ? (
                <>
                  <span>🔍 Chi tiết đơn hàng:</span>
                  <span style={{ color: "#ff5c00" }}>{editingOrder?.orderCode}</span>
                </>
              ) : editingOrder ? (
                <>
                  <span>✏️ Chỉnh sửa đơn hàng:</span>
                  <span style={{ color: "#ff5c00" }}>{editingOrder?.orderCode}</span>
                </>
              ) : (
                <span>📦 Thêm mới đơn hàng</span>
              )}
            </h3>
            
            {/* Sticky Header Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", borderBottom: "2px solid #e2e8f0", padding: "8px 30px", background: "#f8fafc" }}>
              {/* Nút Chọn hợp đồng */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {selectedContractNumber && (
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#ff5c00" }}>
                    Hợp đồng: {selectedContractNumber} {selectedContractObj ? `(SL nhiệt kế: ${selectedContractObj.thermometerQty})` : ""}
                  </span>
                )}
                {!isViewMode && (
                  <button
                    type="button"
                    className="select-contract-btn"
                    onClick={() => {
                      setContractSearchQuery("");
                      setShowContractModal(true);
                    }}
                  >
                    Chọn hợp đồng
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Form Body Container */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="scrollable-body" style={{ flex: 1, overflowY: "auto", padding: "12px 30px 20px" }}>
                {error && <div style={{ color: "#e74c3c", marginBottom: "1rem" }}>⚠️ {error}</div>}
                
                {/* General Info Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "1.5rem", maxWidth: "780px" }}>
                  {/* Dòng 1: Mã đơn hàng, Mã khách hàng, Chi nhánh thực hiện */}
                  <div style={{ display: "flex", gap: "20px", width: "100%" }}>
                    <div style={{ width: "140px", flexShrink: 0 }}>
                      <label className="filter-label">Mã đơn hàng <span style={{ color: "red" }}>(*)</span></label>
                      <input 
                        type="text" 
                        name="orderCode" 
                        className="input" 
                        value={formOrderCode} 
                        readOnly
                        tabIndex={-1}
                        required 
                        style={{ width: "100%", backgroundColor: "#f1f5f9", pointerEvents: "none" }} 
                      />
                    </div>
                    <div style={{ width: "400px", flexShrink: 0 }}>
                      <label className="filter-label">Mã khách hàng <span style={{ color: "red" }}>(*)</span></label>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="Vui lòng chọn hợp đồng"
                        value={(() => {
                          const cust = (customersFull || []).find(c => c.code === formCustomerCode);
                          return cust ? `${cust.code} - ${cust.name}` : formCustomerCode;
                        })()} 
                        readOnly
                        tabIndex={-1}
                        style={{ width: "100%", backgroundColor: "#f1f5f9", pointerEvents: "none" }} 
                      />
                      <input type="hidden" name="customerCode" value={formCustomerCode} />
                    </div>
                    <div style={{ width: "200px", flexShrink: 0 }}>
                      <label className="filter-label">Chi nhánh thực hiện <span style={{ color: "red" }}>(*)</span></label>
                      <select 
                        name="branch" 
                        className="input" 
                        value={formBranch} 
                        onChange={(e) => setFormBranch(e.target.value)} 
                        disabled={isViewMode}
                        required
                        style={{ 
                          width: "100%",
                          backgroundColor: isViewMode ? "#f1f5f9" : "white",
                          pointerEvents: isViewMode ? "none" : "auto"
                        }}
                      >
                        <option value="">-- Chọn chi nhánh --</option>
                        {branches.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Dòng 2: Ghi chú, Thời gian giao dự kiến */}
                  <div style={{ display: "flex", gap: "20px", width: "100%" }}>
                    <div style={{ flex: 1 }}>
                      <label className="filter-label">Ghi chú</label>
                      <input 
                        type="text" 
                        name="note" 
                        className="input" 
                        placeholder={isViewMode ? "" : "Nhập ghi chú..."}
                        value={formNote} 
                        onChange={(e) => setFormNote(e.target.value)}
                        disabled={isViewMode} 
                        style={{ 
                          width: "100%",
                          backgroundColor: isViewMode ? "#f1f5f9" : "white",
                          pointerEvents: isViewMode ? "none" : "auto"
                        }} 
                      />
                    </div>
                    <div style={{ width: "200px", flexShrink: 0 }}>
                      <label className="filter-label">Thời gian giao dự kiến <span style={{ color: "red" }}>(*)</span></label>
                      {isViewMode ? (
                        <input 
                          type="text" 
                          className="input" 
                          value={formatYearMonth(formRequestDeliveryDate)} 
                          disabled 
                          style={{ width: "100%", backgroundColor: "#f1f5f9", pointerEvents: "none" }} 
                        />
                      ) : (
                        <input 
                          type="month" 
                          name="requestDeliveryDate" 
                          className="input" 
                          value={formRequestDeliveryDate} 
                          onChange={(e) => setFormRequestDeliveryDate(e.target.value)} 
                          required
                          style={{ width: "100%" }} 
                        />
                      )}
                    </div>
                  </div>
                  
                  {editingOrder && (
                    <input type="hidden" name="status" value={editingOrder?.status ?? "Tạo mới"} />
                  )}
                  <input
                    type="hidden"
                    name="thermometer"
                    value={formThermometer ? "on" : "off"}
                  />
                  <input type="hidden" name="employeeName" value={formEmployeeName} />
                  <input
                    type="hidden"
                    name="shipDate"
                    value={editingOrder?.shipDate ? new Date(editingOrder.shipDate).toISOString().split('T')[0] : ""}
                  />
                </div>

                {/* Phần 1: Thông tin bên bán bên mua */}
                <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", maxWidth: "950px", flexWrap: "wrap" }}>
                  {/* Bên bán */}
                  {(() => {
                    const sellerCust = (customersFull || []).find(
                      c => c.name.toLowerCase() === selectedContractObj?.seller?.toLowerCase() ||
                           c.abbreviation?.toLowerCase() === selectedContractObj?.seller?.toLowerCase()
                    );
                    return (
                      <div style={{
                        flex: "1 1 400px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        background: "#f8fafc",
                        padding: "12px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                      }}>
                        <h4 style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: 700, color: "#003466", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", textTransform: "uppercase" }}>
                          🏢 BÊN BÁN (SELLER)
                        </h4>
                        <div>
                          <span style={{ fontWeight: 600, color: "#475569" }}>Tên đơn vị: </span>
                          <span style={{ color: "#0f172a" }}>{selectedContractObj?.seller || "—"}</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "#475569" }}>Địa chỉ: </span>
                          <span style={{ color: "#0f172a" }}>{sellerCust?.address || "—"}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <div>
                            <span style={{ fontWeight: 600, color: "#475569" }}>Điện thoại: </span>
                            <span style={{ color: "#0f172a" }}>{sellerCust?.phone || "—"}</span>
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: "#475569" }}>Email: </span>
                            <span style={{ color: "#0f172a" }}>{sellerCust?.email || "—"}</span>
                          </div>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "#475569" }}>Người đại diện: </span>
                          <span style={{ color: "#0f172a" }}>{sellerCust?.representative || "—"}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bên mua */}
                  {(() => {
                    const cust = (customersFull || []).find(c => c.code === formCustomerCode);
                    return (
                      <div style={{
                        flex: "1 1 450px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        background: "#f8fafc",
                        padding: "12px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                      }}>
                        <h4 style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: 700, color: "#003466", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", textTransform: "uppercase" }}>
                          🤝 BÊN MUA (BUYER)
                        </h4>
                        <div>
                          <span style={{ fontWeight: 600, color: "#475569" }}>Tên khách hàng: </span>
                          <span style={{ color: "#0f172a" }}>{cust?.name || selectedContractObj?.buyer || "—"}</span>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "#475569" }}>Địa chỉ: </span>
                          <span style={{ color: "#0f172a" }}>{cust?.address || "—"}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <div>
                            <span style={{ fontWeight: 600, color: "#475569" }}>Điện thoại: </span>
                            <span style={{ color: "#0f172a" }}>{cust?.phone || "—"}</span>
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: "#475569" }}>Email: </span>
                            <span style={{ color: "#0f172a" }}>{cust?.email || "—"}</span>
                          </div>
                        </div>
                        <div>
                          <span style={{ fontWeight: 600, color: "#475569" }}>Người đại diện: </span>
                          <span style={{ color: "#0f172a" }}>{cust?.representative || "—"}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Phần 2: Chi tiết dòng hàng */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: 700, color: "#003466", textTransform: "uppercase" }}>
                    📦 CHI TIẾT DÒNG HÀNG
                  </h4>
                  <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                    <table className="table" style={{ fontSize: "0.85rem", width: "100%", minWidth: "1350px", tableLayout: "fixed", borderCollapse: "collapse" }}>
                      <thead style={{ background: "#f8fafc" }}>
                        <tr>
                          <th style={{ width: "370px", minWidth: "370px", textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", textAlign: "center" }}>Tên hàng hóa <span style={{ color: "red" }}>(*)</span></th>
                          <th style={{ width: "170px", minWidth: "170px", textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", textAlign: "center" }}>Quy cách</th>
                          <th style={{ width: "70px", minWidth: "70px", textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", textAlign: "center" }}>ĐVT</th>
                          <th style={{ width: "90px", minWidth: "90px", textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", textAlign: "center" }}>Số lượng</th>
                          <th style={{ width: "60px", minWidth: "60px", textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", textAlign: "center" }}>Pallet</th>
                          <th style={{ width: "70px", minWidth: "70px", textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", textAlign: "center" }}>Nẹp góc</th>
                          <th style={{ width: "60px", minWidth: "60px", textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", textAlign: "center" }}>Túi in</th>
                          <th style={{ width: "70px", minWidth: "70px", textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", textAlign: "center" }}>Thùng in</th>
                          <th style={{ width: "80px", minWidth: "80px", textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", textAlign: "center" }}>Brix (%)</th>
                          <th style={{ width: "160px", minWidth: "160px", textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", textAlign: "center" }}>Yêu cầu khác</th>
                          <th style={{ width: "120px", minWidth: "120px", textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", textAlign: "center" }}>Ghi chú</th>
                          {!isViewMode && <th style={{ width: "50px", minWidth: "50px", padding: "8px" }}>#</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: "6px", width: "370px", minWidth: "370px" }}>
                              <input 
                                type="text" 
                                list={`products-datalist-${idx}`}
                                className="input-sm" 
                                value={item.productName} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newItems = [...items];
                                  newItems[idx] = { ...newItems[idx], productName: val };
                                  
                                  // Look up matching product by name or code
                                  const matched = (products || []).find(p => p.name === val || p.code === val);
                                  if (matched) {
                                    newItems[idx].productName = matched.name;
                                    if (matched.packaging) {
                                      newItems[idx].packaging = translatePackagingToVietnamese(matched.packaging);
                                    } else {
                                      newItems[idx].packaging = "";
                                    }
                                    newItems[idx].unit = matched.unit?.[0]?.name || (matched.unit as any)?.name || "";
                                  }
                                  setItems(newItems);
                                }} 
                                disabled={isViewMode} 
                                required 
                                style={{ width: "100%" }} 
                              />
                              {!isViewMode && (
                                <datalist id={`products-datalist-${idx}`}>
                                  {(products || []).map((p, pIdx) => (
                                    <option key={pIdx} value={p.name}>
                                      {p.code} {p.packaging ? ` - ${translatePackagingToVietnamese(p.packaging)}` : ""}
                                    </option>
                                  ))}
                                </datalist>
                              )}
                            </td>
                            <td style={{ padding: "6px", width: "170px", minWidth: "170px" }}>
                              <input 
                                type="text" 
                                className="input-sm" 
                                value={item.packaging} 
                                disabled 
                                style={{ width: "100%", background: "#f8fafc", cursor: "not-allowed" }} 
                              />
                            </td>
                            <td style={{ padding: "6px", width: "70px", minWidth: "70px" }}>
                              <input 
                                type="text" 
                                className="input-sm" 
                                value={item.unit || ""} 
                                disabled 
                                style={{ width: "100%", textAlign: "center", background: "#f8fafc", cursor: "not-allowed" }} 
                              />
                            </td>
                            <td style={{ padding: "6px", width: "90px", minWidth: "90px" }}>
                              <input 
                                type="text" 
                                className="input-sm" 
                                value={item.quantityInput ?? formatLocaleNumber(item.quantity)} 
                                onChange={(e) => handleQuantityChange(idx, e.target.value)} 
                                onBlur={() => handleQuantityBlur(idx)}
                                disabled={isViewMode} 
                                style={{ width: "100%", textAlign: "right" }} 
                              />
                            </td>
                            <td style={{ textAlign: "center", padding: "6px" }}>
                              <input 
                                type="checkbox" 
                                checked={item.hasPallet} 
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  const newItems = [...items];
                                  newItems[idx] = { 
                                    ...newItems[idx], 
                                    hasPallet: isChecked,
                                    ...(isChecked ? {} : { hasCornerGuard: false })
                                  };
                                  setItems(newItems);
                                }} 
                                disabled={isViewMode} 
                                style={{ width: "16px", height: "16px", cursor: isViewMode ? "not-allowed" : "pointer" }} 
                              />
                            </td>
                            <td style={{ textAlign: "center", padding: "6px" }}>
                              {item.hasPallet ? (
                                <input 
                                  type="checkbox" 
                                  checked={item.hasCornerGuard} 
                                  onChange={(e) => updateItem(idx, "hasCornerGuard", e.target.checked)} 
                                  disabled={isViewMode} 
                                  style={{ width: "16px", height: "16px", cursor: isViewMode ? "not-allowed" : "pointer" }} 
                                />
                              ) : (
                                <span style={{ color: "#94a3b8" }}>—</span>
                              )}
                            </td>
                            <td style={{ textAlign: "center", padding: "6px" }}>
                              <input 
                                type="checkbox" 
                                checked={item.printedBag} 
                                onChange={(e) => updateItem(idx, "printedBag", e.target.checked)} 
                                disabled={isViewMode} 
                                style={{ width: "16px", height: "16px", cursor: isViewMode ? "not-allowed" : "pointer" }} 
                              />
                            </td>
                            <td style={{ textAlign: "center", padding: "6px" }}>
                              <input 
                                type="checkbox" 
                                checked={item.printedBox} 
                                onChange={(e) => updateItem(idx, "printedBox", e.target.checked)} 
                                disabled={isViewMode} 
                                style={{ width: "16px", height: "16px", cursor: isViewMode ? "not-allowed" : "pointer" }} 
                              />
                            </td>
                            <td style={{ padding: "6px" }}>
                              <input 
                                type="text" 
                                className="input-sm" 
                                value={item.brix || ""} 
                                onChange={(e) => updateItem(idx, "brix", e.target.value)} 
                                disabled={isViewMode} 
                                placeholder={isViewMode ? "" : "Nhập..."}
                                style={{ width: "100%", textAlign: "center" }} 
                              />
                            </td>
                            <td style={{ padding: "6px" }}>
                              <textarea 
                                className="input-sm" 
                                value={item.otherRequirements || ""} 
                                onChange={(e) => updateItem(idx, "otherRequirements", e.target.value)} 
                                disabled={isViewMode} 
                                placeholder={isViewMode ? "" : "Nhập..."}
                                rows={1}
                                style={{ 
                                  width: "100%", 
                                  minHeight: "32px", 
                                  height: "32px",
                                  resize: "vertical", 
                                  padding: "5px 10px",
                                  lineHeight: "1.4",
                                  fontFamily: "inherit"
                                }} 
                              />
                            </td>
                            <td style={{ padding: "6px" }}><input type="text" className="input-sm" value={item.note} onChange={(e) => updateItem(idx, "note", e.target.value)} disabled={isViewMode} style={{ width: "100%" }} /></td>
                            {!isViewMode && (
                              <td style={{ padding: "6px", textAlign: "center" }}>
                                <button type="button" onClick={() => removeItem(idx)} style={{ color: "#e74c3c", border: "none", background: "none", cursor: "pointer", fontSize: "1.1rem" }}>
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!isViewMode && (
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                      <button
                        type="button"
                        className="sapo-btn"
                        disabled={!selectedContractNumber}
                        onClick={() => {
                          setSelectedContractItemIds([]);
                          setShowContractItemModal(true);
                        }}
                        style={{
                          opacity: selectedContractNumber ? 1 : 0.5,
                          cursor: selectedContractNumber ? "pointer" : "not-allowed"
                        }}
                      >
                        Chọn dòng hàng
                      </button>
                    </div>
                  )}
                </div>

                {/* Phần 3: Chi tiết thông tin giao nhận */}
                <div style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  padding: "12px 16px",
                  marginTop: "1.5rem"
                }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 700, color: "#003466", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", textTransform: "uppercase" }}>
                    🚚 CHI TIẾT THÔNG TIN GIAO NHẬN
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                    <div>
                      <label className="filter-label" style={{ marginBottom: "4px" }}>Điều kiện giao hàng</label>
                      <input 
                        type="text" 
                        className="input-sm" 
                        value={selectedContractObj?.deliveryTerms || "—"} 
                        disabled 
                        style={{ width: "100%", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }} 
                      />
                    </div>
                    <div>
                      <label className="filter-label" style={{ marginBottom: "4px" }}>Nơi đi (Cảng xếp hàng)</label>
                      <input 
                        type="text" 
                        className="input-sm" 
                        value={selectedContractObj?.portOfLoading || "—"} 
                        disabled 
                        style={{ width: "100%", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }} 
                      />
                    </div>
                    <div>
                      <label className="filter-label" style={{ marginBottom: "4px" }}>Nơi đến (Cảng dỡ hàng)</label>
                      <input 
                        type="text" 
                        className="input-sm" 
                        value={selectedContractObj?.portOfDischarge || "—"} 
                        disabled 
                        style={{ width: "100%", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }} 
                      />
                    </div>
                    <div>
                      <label className="filter-label" style={{ marginBottom: "4px" }}>Chuyển tải</label>
                      <input 
                        type="text" 
                        className="input-sm" 
                        value={selectedContractObj?.transshipment || "—"} 
                        disabled 
                        style={{ width: "100%", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }} 
                      />
                    </div>
                    <div>
                      <label className="filter-label" style={{ marginBottom: "4px" }}>Giao hàng từng phần</label>
                      <input 
                        type="text" 
                        className="input-sm" 
                        value={selectedContractObj?.partialShipment || "—"} 
                        disabled 
                        style={{ width: "100%", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }} 
                      />
                    </div>
                    <div>
                      <label className="filter-label" style={{ marginBottom: "4px" }}>Hạn giao hàng</label>
                      <input 
                        type="text" 
                        className="input-sm" 
                        value={selectedContractObj?.deliveryDate || "—"} 
                        disabled 
                        style={{ width: "100%", background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }} 
                      />
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
                  padding: "12px 30px",
                  background: "#fff",
                  borderBottomLeftRadius: "16px",
                  borderBottomRightRadius: "16px",
                }}
              >
                <button type="button" className="modal-footer-btn-secondary" onClick={handleClose}>
                  {isViewMode ? "Đóng" : "Thoát"}
                </button>
                {!isViewMode && (
                  <button type="submit" className="modal-footer-btn-success" disabled={isPending}>
                    {isPending ? "Đang lưu..." : "Lưu đơn hàng"}
                  </button>
                )}
              </div>
            </form>
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
              margin: "0 auto 1.5rem",
              color: "#f97316"
            }}>
              <Clock size={32} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#1e293b", textAlign: "center", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ tiếp nhận" ? "Gửi tiếp nhận đơn hàng" : 
               confirmUpdate.status === "Tạo mới" ? "Thu hồi đơn hàng" : 
               "Xác nhận thay đổi"}
            </h3>
            <div style={{ color: "#475569", marginBottom: "2rem", lineHeight: "1.6", textAlign: "center", padding: "0 0.5rem", fontFamily: "'Segoe UI', sans-serif" }}>
              {confirmUpdate.status === "Chờ tiếp nhận" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc chắn muốn gửi tiếp nhận {confirmUpdate.info} không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px" }}>
                    <Check size={16} /> Đơn hàng sẽ được gửi để chờ tiếp nhận.
                  </p>
                </>
              ) : confirmUpdate.status === "Tạo mới" ? (
                <>
                  <p style={{ fontWeight: "normal", marginBottom: "0.75rem" }}>Bạn có chắc chắn muốn thu hồi {confirmUpdate.info} không?</p>
                  <p style={{ fontSize: "0.875rem", color: "#ef4444", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#fef2f2", padding: "8px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                    <RotateCcw size={16} /> Đơn hàng sẽ được chuyển về trạng thái tạo mới.
                  </p>
                </>
              ) : (
                <p>Bạn có chắc chắn muốn chuyển trạng thái đơn này sang <strong>"{confirmUpdate.status}"</strong> không?</p>
              )}
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmUpdate(null)}>Hủy bỏ</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={executeStatusChange}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Selection Modal Overlay */}
      {showContractModal && (
        <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
          <div className="modal-content-base" style={{ maxWidth: "850px", width: "90%", maxHeight: "80vh", display: "flex", flexDirection: "column", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "15px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#003466", margin: 0, textTransform: "uppercase" }}>CHỌN HỢP ĐỒNG</h3>
              <button 
                type="button" 
                onClick={() => setShowContractModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "20px" }}
              >
                &times;
              </button>
            </div>

            {/* Filter Input */}
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#003466", textTransform: "uppercase", marginBottom: "6px" }}>Lọc hợp đồng (Số HĐ / Khách hàng / Tên viết tắt)</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Nhập số hợp đồng, tên khách hàng hoặc tên viết tắt để tìm..."
                  value={contractSearchQuery}
                  onChange={(e) => setContractSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    outline: "none"
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Contract List Table */}
            <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1, borderBottom: "2px solid #cbd5e1" }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: "700", color: "#003466", borderBottom: "1px solid #cbd5e1" }}>SỐ HỢP ĐỒNG</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: "700", color: "#003466", borderBottom: "1px solid #cbd5e1" }}>KHÁCH HÀNG</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: "700", color: "#003466", borderBottom: "1px solid #cbd5e1" }}>NHÂN VIÊN KINH DOANH</th>
                    <th style={{ textAlign: "center", padding: "10px 12px", fontWeight: "700", color: "#003466", borderBottom: "1px solid #cbd5e1" }}>NHIỆT KẾ</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: "700", color: "#003466", borderBottom: "1px solid #cbd5e1" }}>KỲ GIAO HẠN</th>
                    <th style={{ textAlign: "center", padding: "10px 12px", fontWeight: "700", color: "#003466", borderBottom: "1px solid #cbd5e1", width: "80px" }}>HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        Không tìm thấy hợp đồng nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((c: any) => {
                      const cust = (customersFull || []).find(cust => cust.name.toLowerCase() === c.buyer.toLowerCase());
                      const abbreviation = cust?.abbreviation ? ` (${cust.abbreviation})` : "";
                      return (
                        <tr 
                          key={c.id} 
                          style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background-color 0.15s" }}
                          onClick={() => handleSelectContract(c)}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <td style={{ padding: "10px 12px", fontWeight: "600", color: "#0f172a" }}>{c.contractNumber}</td>
                          <td style={{ padding: "10px 12px", color: "#334155" }}>
                            {c.buyer}
                            {abbreviation && <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "2px" }}>{abbreviation}</span>}
                          </td>
                          <td style={{ padding: "10px 12px", color: "#334155" }}>{c.salesEmployee || "—"}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            {c.thermometer ? (
                              <span style={{ fontSize: "11px", background: "#fef2f2", color: "#ef4444", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                                CÓ {c.thermometerQty !== undefined && c.thermometerQty !== null ? `(${c.thermometerQty})` : ""}
                              </span>
                            ) : (
                              <span style={{ fontSize: "11px", background: "#f1f5f9", color: "#64748b", padding: "2px 6px", borderRadius: "4px" }}>KHÔNG</span>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px", color: "#334155" }}>
                            {c.deliveryDate ? parseDeliveryDate(c.deliveryDate, c.contractDate) : getYearMonthString(c.contractDate)}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleSelectContract(c)}
                              style={{
                                backgroundColor: "#ff5c00",
                                color: "#ffffff",
                                fontSize: "12px",
                                fontWeight: "700",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                border: "none",
                                cursor: "pointer",
                                transition: "background-color 0.2s"
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#e04f00")}
                              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ff5c00")}
                            >
                              Chọn
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "15px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Item Selection Modal Overlay */}
      {showContractItemModal && (
        <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
          <div className="modal-content-base" style={{ maxWidth: "850px", width: "90%", maxHeight: "80vh", display: "flex", flexDirection: "column", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "15px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#003466", margin: 0, textTransform: "uppercase" }}>CHỌN CHI TIẾT DÒNG HÀNG</h3>
              <button 
                type="button" 
                onClick={() => setShowContractItemModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "20px" }}
              >
                &times;
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "15px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1, borderBottom: "2px solid #cbd5e1" }}>
                  <tr>
                    <th style={{ width: "40px", padding: "10px 12px", borderBottom: "1px solid #cbd5e1", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={
                          (selectedContractObj?.contractitem || []).length > 0 &&
                          selectedContractItemIds.length === (selectedContractObj?.contractitem || []).length
                        }
                        onChange={(e) => {
                          const itemsList = selectedContractObj?.contractitem || [];
                          if (e.target.checked) {
                            setSelectedContractItemIds(itemsList.map((item: any) => item.id));
                          } else {
                            setSelectedContractItemIds([]);
                          }
                        }}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                    </th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: "700", color: "#003466", borderBottom: "1px solid #cbd5e1" }}>TÊN HÀNG HÓA</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: "700", color: "#003466", borderBottom: "1px solid #cbd5e1" }}>QUY CÁCH</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontWeight: "700", color: "#003466", borderBottom: "1px solid #cbd5e1", width: "90px" }}>SỐ LƯỢNG</th>
                    <th style={{ textAlign: "center", padding: "10px 12px", fontWeight: "700", color: "#003466", borderBottom: "1px solid #cbd5e1", width: "60px" }}>ĐVT</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontWeight: "700", color: "#003466", borderBottom: "1px solid #cbd5e1", width: "110px" }}>ĐƠN GIÁ</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontWeight: "700", color: "#003466", borderBottom: "1px solid #cbd5e1", width: "120px" }}>THÀNH TIỀN</th>
                  </tr>
                </thead>
                <tbody>
                  {(!selectedContractObj || !selectedContractObj.contractitem || selectedContractObj.contractitem.length === 0) ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        Hợp đồng không có dòng hàng nào.
                      </td>
                    </tr>
                  ) : (
                    selectedContractObj.contractitem.map((item: any) => {
                      const isChecked = selectedContractItemIds.includes(item.id);
                      return (
                        <tr 
                          key={item.id} 
                          style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background-color 0.15s" }}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedContractItemIds(prev => prev.filter(id => id !== item.id));
                            } else {
                              setSelectedContractItemIds(prev => [...prev, item.id]);
                            }
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <td style={{ textAlign: "center", padding: "10px 12px" }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedContractItemIds(prev => [...prev, item.id]);
                                } else {
                                  setSelectedContractItemIds(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                              style={{ width: "16px", height: "16px", cursor: "pointer" }}
                            />
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: "600", color: "#0f172a" }}>{item.productName}</td>
                          <td style={{ padding: "10px 12px", color: "#334155" }}>{item.packaging || "—"}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#334155" }}>{formatNumber(item.quantity) || "—"}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "#334155" }}>{item.unit || "—"}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#334155" }}>{formatNumber(item.price) || "—"}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", color: "#334155" }}>{formatNumber(item.amount) || "—"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "15px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
              <button
                type="button"
                onClick={() => setShowContractItemModal(false)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSelectItems}
                style={{
                  padding: "6px 16px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#003466",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
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
