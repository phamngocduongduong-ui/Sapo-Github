"use client";

import { useState, useTransition, useMemo, Fragment, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { Clock, RotateCcw, ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeftRight, Search, ChevronDown } from "lucide-react";
import { acceptOrder, planOrder, unplanOrder, cancelAcceptOrder } from "./actions";
import HistoryModal from "../../HistoryModal";
import { formatNumber } from "@/lib/format";

const formatYearMonth = (dateInput: any) => {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const getThermometerInfo = (order: any, contracts: any[]) => {
  if (!order.thermometer) return "Không sử dụng";
  const match = order.note?.match(/Hợp đồng:\s*([^\s,;]+)/);
  const contractNumber = match ? match[1].trim() : null;
  if (contractNumber) {
    const contract = (contracts || []).find(c => c.contractNumber === contractNumber);
    if (contract && contract.thermometerQty) {
      return `Có sử dụng (${contract.thermometerQty} cái)`;
    }
  }
  return "Có sử dụng";
};

export default function ProductionOrderTable({
  initialOrders,
  customers,
  customersFull = [],
  branches,
  salesEmployees,
  currentUser,
  contracts = []
}: {
  initialOrders: any[];
  customers: string[];
  customersFull?: any[];
  branches: string[];
  salesEmployees: string[];
  currentUser: string;
  contracts?: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [filterMonth, setFilterMonth] = useState("");
  
  // Sync initialOrders from props when revalidated
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);
  
  // Real-time sync (disabled during transition)
  useRealTimeSync("orders&page=production", orders, setOrders, 3000, isPending);

  // Sync calendar date when filterMonth changes
  useEffect(() => {
    if (filterMonth) {
      const [year, month] = filterMonth.split("-").map(Number);
      setCurrentCalendarDate(prev => {
        if (prev.getFullYear() !== year || prev.getMonth() !== month - 1) {
          return new Date(year, month - 1, 1);
        }
        return prev;
      });
    }
  }, [filterMonth]);

  // Sync filterMonth when calendar date changes (only if filterMonth is already set)
  useEffect(() => {
    if (filterMonth) {
      const yyyyMm = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth() + 1).padStart(2, '0')}`;
      if (filterMonth !== yyyyMm) {
        setFilterMonth(yyyyMm);
      }
    }
  }, [currentCalendarDate]);

  // Tab chính: 1 = Đơn chờ tiếp nhận, 2 = Đơn chờ kế hoạch
  const [activeMainTab, setActiveMainTab] = useState(1);

  // Xem chi tiết đơn hàng modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState(1);

  // Lịch sử modal
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  // Bộ lọc
  const [filterOrderCode, setFilterOrderCode] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const filterableOrderCodes = useMemo(() => {
    const codes = orders
      .filter(o => o.status === "Chờ tiếp nhận")
      .map(o => o.orderCode)
      .filter(Boolean);
    return Array.from(new Set(codes)).sort();
  }, [orders]);

  // Hộp xác nhận chuyển trạng thái ở Tab 1
  const [confirmAccept, setConfirmAccept] = useState<any | null>(null);

  // Hộp xác nhận hủy tiếp nhận ở Tab 2
  const [confirmCancelAccept, setConfirmCancelAccept] = useState<any | null>(null);

  // Trạng thái chọn hàng ở Tab 1
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Bộ lọc logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchOrderCode = !filterOrderCode || (order.orderCode && order.orderCode.toLowerCase().includes(filterOrderCode.trim().toLowerCase()));
      const matchEmployee = !filterEmployee || order.employeeName === filterEmployee;
      const matchMonth = !filterMonth || (() => {
        if (!order.requestDeliveryDate) return false;
        const d = new Date(order.requestDeliveryDate);
        const yyyyMm = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        return yyyyMm === filterMonth;
      })();
      return matchOrderCode && matchEmployee && matchMonth;
    });
  }, [orders, filterOrderCode, filterEmployee, filterMonth]);

  // Tab 1: Đơn chờ tiếp nhận
  const pendingAcceptOrders = useMemo(() => {
    return filteredOrders.filter(o => o.status === "Chờ tiếp nhận");
  }, [filteredOrders]);

  // Tab 2: Đơn chờ kế hoạch (Cột bên trái)
  const pendingPlanOrders = useMemo(() => {
    return filteredOrders.filter(o => o.status === "Chờ kế hoạch");
  }, [filteredOrders]);

  // Tab 2: Lịch (Cột bên phải)
  const plannedOrders = useMemo(() => {
    return orders.filter(o => o.status === "Chờ giao hàng" && o.shipDate);
  }, [orders]);

  // Trạng thái ngày Lịch

  // Chi tiết hóa rộng dòng Tab 1
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  function handleCloseViewModal() {
    setShowViewModal(false);
    setViewingOrder(null);
    setModalActiveTab(1);
  }

  function handleView(order: any) {
    setViewingOrder(order);
    setModalActiveTab(1);
    setShowViewModal(true);
  }

  function handleAcceptClick(order: any) {
    setConfirmAccept(order);
  }

  function executeAccept() {
    if (!confirmAccept) return;
    const orderId = confirmAccept.id;
    setConfirmAccept(null);
    startTransition(async () => {
      try {
        await acceptOrder(orderId);
        setSelectedOrderId(null);
        setExpandedOrderId(null);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  function executeCancelAccept() {
    if (!confirmCancelAccept) return;
    const orderId = confirmCancelAccept.id;
    setConfirmCancelAccept(null);
    startTransition(async () => {
      try {
        await cancelAcceptOrder(orderId);
        setSelectedOrderId(null);
        setExpandedOrderId(null);
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  // Drag and drop handlers
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [isLeftDeckDragOver, setIsLeftDeckDragOver] = useState(false);

  function handleDragStart(e: React.DragEvent, orderId: string) {
    e.dataTransfer.setData("text/plain", orderId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleCalendarDragOver(e: React.DragEvent, dateStr: string) {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate < todayDate) {
      return;
    }

    e.preventDefault();
    setDragOverDate(dateStr);
  }

  function handleCalendarDragLeave() {
    setDragOverDate(null);
  }

  function handleCalendarDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    setDragOverDate(null);
    const orderId = e.dataTransfer.getData("text/plain");
    if (!orderId) return;

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate < todayDate) {
      alert("Không thể lập kế hoạch hoặc dời lịch xuất hàng vào ngày trong quá khứ.");
      return;
    }

    // Optimistic update
    const previousOrders = orders;
    setOrders(prev =>
      prev.map(o =>
        o.id === orderId ? { ...o, status: "Chờ giao hàng", shipDate: new Date(dateStr) } : o
      )
    );

    startTransition(async () => {
      try {
        await planOrder(orderId, dateStr);
      } catch (err: any) {
        // Rollback
        setOrders(previousOrders);
        alert(err.message);
      }
    });
  }

  function handleLeftDeckDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsLeftDeckDragOver(true);
  }

  function handleLeftDeckDragLeave() {
    setIsLeftDeckDragOver(false);
  }

  function handleLeftDeckDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsLeftDeckDragOver(false);
    const orderId = e.dataTransfer.getData("text/plain");
    if (!orderId) return;

    // Chỉ chuyển về Chờ kế hoạch nếu đơn hàng đang ở trạng thái Chờ giao hàng
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder && targetOrder.status === "Chờ giao hàng") {
      // Optimistic update
      const previousOrders = orders;
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId ? { ...o, status: "Chờ kế hoạch", shipDate: null } : o
        )
      );

      // Adjust filterMonth to ensure the returned order is visible
      if (targetOrder.requestDeliveryDate) {
        const d = new Date(targetOrder.requestDeliveryDate);
        const orderMonthStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        if (filterMonth && filterMonth !== orderMonthStr) {
          setFilterMonth(orderMonthStr);
        }
      } else {
        setFilterMonth(""); // Clear filter month if order has no requestDeliveryDate
      }

      // Also make sure other search filters don't hide it
      if (filterOrderCode && !targetOrder.orderCode?.toLowerCase().includes(filterOrderCode.trim().toLowerCase())) {
        setFilterOrderCode("");
      }
      if (filterEmployee && targetOrder.employeeName !== filterEmployee) {
        setFilterEmployee("");
      }

      startTransition(async () => {
        try {
          await unplanOrder(orderId);
        } catch (err: any) {
          // Rollback
          setOrders(previousOrders);
          alert(err.message);
        }
      });
    }
  }

  // Calendar calculations
  const calendarCells = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-indexed

    const firstDayOfMonth = new Date(year, month, 1);
    // getDay returns 0 for Sunday, 1 for Monday, etc.
    // We want Monday (1) to be index 0 in our grid, Sunday (0) to be index 6.
    let startOffset = firstDayOfMonth.getDay() - 1;
    if (startOffset === -1) startOffset = 6; // Sunday

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    // Prev month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      const day = totalDaysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      cells.push({
        date,
        isCurrentMonth: false,
        key: `prev-${day}`
      });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const date = new Date(year, month, day);
      cells.push({
        date,
        isCurrentMonth: true,
        key: `curr-${day}`
      });
    }

    // Next month padding to fill a complete grid of weeks (multiple of 7)
    const remaining = 42 - cells.length; // standard 6 weeks calendar grid
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(year, month + 1, day);
      cells.push({
        date,
        isCurrentMonth: false,
        key: `next-${day}`
      });
    }

    return cells;
  }, [currentCalendarDate]);

  const monthYearLabel = useMemo(() => {
    const monthNames = [
      "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
      "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
    ];
    return `${monthNames[currentCalendarDate.getMonth()]} - ${currentCalendarDate.getFullYear()}`;
  }, [currentCalendarDate]);

  const changeMonth = (offset: number) => {
    setCurrentCalendarDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + offset);
      return d;
    });
  };

  const setToday = () => {
    setCurrentCalendarDate(new Date());
  };

  const getTabButtonStyle = (tabNum: number) => ({
    padding: "0.75rem 1.25rem",
    border: "none",
    background: "none",
    cursor: "pointer",
    borderBottom: modalActiveTab === tabNum ? "3px solid #3498db" : "none",
    fontWeight: 600,
    color: modalActiveTab === tabNum ? "#3498db" : "#000000",
    fontSize: "13px",
    transition: "all 0.2s"
  });

  return (
    <div className="contract-page-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        .nowrap {
          white-space: nowrap !important;
        }
        .contract-page-container {
          width: 100%;
          min-width: 0;
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
        .base-filters {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          padding: 10px !important;
        }
        .filter-label {
          display: block;
          margin-bottom: 0.4rem !important;
          font-size: 0.85rem !important;
          font-weight: 700;
          color: #003466;
          text-transform: uppercase;
        }
        .form-control {
          font-size: 13px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          padding: 6px 10px !important;
          font-family: "Segoe UI", sans-serif;
          color: #000;
          outline: none !important;
          background: white !important;
        }
        .input {
          font-size: 13px !important;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 12px;
          font-family: "Segoe UI", sans-serif;
          color: #000;
        }
        .input-sm {
          font-size: 12px !important;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 4px 8px;
          color: #000;
        }
        .table-container {
          width: 100% !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
        }
        .base-table {
          width: 100% !important;
          min-width: 1080px !important;
          table-layout: fixed !important;
          border-collapse: collapse;
          margin-bottom: 0.5rem;
        }
        .base-table th {
          background-color: #f1f5f9 !important;
          padding: 8px 10px !important;
          border-bottom: 2px solid #cbd5e1 !important;
          border-right: 1px solid #cbd5e1 !important;
          font-size: 13px !important;
          white-space: normal !important;
          vertical-align: middle !important;
        }
        .base-table th:last-child {
          border-right: none !important;
        }
        .base-table td {
          padding: 8px 10px !important;
          border-bottom: 1px solid #cbd5e1 !important;
          border-right: 1px solid #cbd5e1 !important;
          font-size: 13px !important;
          color: #334155;
          vertical-align: middle;
        }
        .base-table td:last-child {
          border-right: none !important;
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

        /* Dnd specific styles */
        .tab-nav-base {
          display: flex;
          gap: 4px;
          border-bottom: 2px solid #cbd5e1;
          margin-bottom: 1rem;
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

        .split-layout {
          display: flex;
          gap: 1.25rem;
          width: 100%;
          min-height: 550px;
        }
        .left-deck {
          flex: 0 0 28%;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 600px;
          overflow-y: auto;
          transition: background-color 0.2s, border-color 0.2s;
        }
        .left-deck.drag-over {
          background-color: #f0fdf4;
          border-color: #22c55e;
          border-style: dashed;
        }
        .right-calendar {
          flex: 1;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 12px;
          display: flex;
          flex-direction: column;
        }
        
        .order-drag-card {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-left: 4px solid #003466;
          border-radius: 6px;
          padding: 8px 10px;
          cursor: grab;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .order-drag-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04);
          border-color: #3b82f6;
        }
        .order-drag-card:active {
          cursor: grabbing;
        }
        .order-drag-card-title {
          font-weight: 700;
          color: #003466;
          margin-bottom: 2px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .order-drag-card-meta {
          font-size: 11px !important;
          color: #64748b;
          margin-bottom: 4px;
        }
        .order-drag-card-items {
          font-size: 11px !important;
          background: #f1f5f9;
          padding: 4px 6px;
          border-radius: 4px;
          color: #334155;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          flex: 1;
        }
        .calendar-weekday {
          text-align: center;
          font-weight: 700;
          color: #003466;
          padding: 6px 0;
          background: #f1f5f9;
          border-radius: 4px;
          text-transform: uppercase;
          font-size: 11px !important;
        }
        .calendar-day-cell {
          min-height: 85px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          background: #ffffff;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: relative;
          transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .calendar-day-cell:hover {
          box-shadow: inset 0 0 4px rgba(0,0,0,0.05);
        }
        .calendar-day-cell.drag-over {
          background-color: #eff6ff !important;
          border-color: #3b82f6 !important;
          border-width: 2px;
        }
        .calendar-day-cell.other-month {
          background: #f8fafc;
          color: #94a3b8;
          opacity: 0.6;
        }
        .calendar-day-cell.today {
          background: #fffbeb;
          border: 2px solid #f59e0b;
        }
        .calendar-day-cell.past-day {
          background: #f8fafc;
          opacity: 0.55;
        }
        .calendar-day-cell.past-day.drag-over {
          opacity: 0.9;
        }
        .calendar-day-cell.past-day .calendar-day-number {
          color: #94a3b8;
        }
        .calendar-day-number {
          font-weight: 700;
          font-size: 12px !important;
          color: #475569;
          margin-bottom: 2px;
        }
        .calendar-day-cell.today .calendar-day-number {
          color: #d97706;
        }
        
        .calendar-order-badge {
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 11px !important;
          font-weight: 700;
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: background-color 0.15s, transform 0.1s;
        }
        .calendar-order-badge:hover {
          background: #bae6fd;
          transform: scale(1.02);
        }
        .calendar-order-badge:active {
          cursor: grabbing;
        }
        
        .empty-placeholder {
          text-align: center;
          padding: 2rem 1rem;
          color: #64748b;
          font-weight: 600;
          border: 2px dashed #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
        }
        .search-box-base {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          width: 100% !important;
        }
        .search-box-base input {
          width: 100% !important;
          padding: 6px 10px 6px 30px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          outline: none !important;
          font-weight: 500 !important;
        }
        .search-box-base .search-icon {
          position: absolute !important;
          left: 10px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          color: #94a3b8 !important;
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-list {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            padding-bottom: 80px !important;
            margin-top: 10px !important;
            width: 100% !important;
          }
          .mobile-hide {
            display: none !important;
          }
          .base-filters.mobile-hide {
            display: none !important;
          }
          .base-filters.mobile-show {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 10px !important;
            margin-top: 6px !important;
            margin-bottom: 8px !important;
            padding: 10px 12px !important;
          }
          .base-filters.mobile-show .filter-label {
            margin-bottom: 4px !important;
            font-size: 11px !important;
          }
          .base-filters.mobile-show .form-control {
            height: 32px !important;
            padding: 4px 10px !important;
            font-size: 12px !important;
          }
          .base-filters.mobile-show .search-box-base input {
            height: 32px !important;
            padding: 4px 10px 4px 30px !important;
            font-size: 12px !important;
          }
          .mobile-filter-header {
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            padding: 8px 15px !important;
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
          
          /* Premium Mobile Card Layout like de-nghi-mua */
          .proposal-card {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            padding: 10px 14px !important;
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
            gap: 4px !important;
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
          .base-toolbar {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
        }
        @media (min-width: 769px) {
          .desktop-only { display: block !important; }
          .mobile-list { display: none !important; }
          .mobile-filter-header { display: none !important; }
        }
        `
      }} />

      <div className="breadcrumb-banner">
        PHÂN HỆ SẢN XUẤT &mdash; ĐƠN SẢN XUẤT
      </div>

      <div className="contract-layout">
        <div className="panel-full">
          {/* Main Navigation Tabs */}
          <div className="tab-nav-base">
            <button
              type="button"
              className={`tab-btn-base ${activeMainTab === 1 ? "active" : ""}`}
              onClick={() => {
                setActiveMainTab(1);
                setSelectedOrderId(null);
                setExpandedOrderId(null);
              }}
            >
              📥 Đơn chờ tiếp nhận ({pendingAcceptOrders.length})
            </button>
            <button
              type="button"
              className={`tab-btn-base ${activeMainTab === 2 ? "active" : ""}`}
              onClick={() => {
                setActiveMainTab(2);
                setSelectedOrderId(null);
                setExpandedOrderId(null);
              }}
            >
              📅 Đơn đã tiếp nhận ({pendingPlanOrders.length})
            </button>
          </div>



          {/* TAB 1: ĐƠN CHỜ TIẾP NHẬN */}
          {activeMainTab === 1 && (
            <div className="blue-panel" style={{ marginTop: "10px" }}>
              <div className="blue-panel-header">Danh sách đơn hàng chờ tiếp nhận</div>
              <div className="blue-panel-body">
                {/* Toolbar */}
                <div className="base-toolbar">
                  <div className="toolbar-left">
                    <button 
                      type="button" 
                      className="sapo-btn sapo-btn-secondary" 
                      onClick={() => {
                        setFilterOrderCode("");
                        setFilterEmployee("");
                        setFilterMonth("");
                        router.refresh();
                      }}
                    >
                      Làm mới
                    </button>
                    {selectedOrder && (
                      <>
                        <button type="button" className="sapo-btn" onClick={() => handleView(selectedOrder)}>
                          Xem
                        </button>
                        <button type="button" className="sapo-btn" onClick={() => setHistoryRecordId(selectedOrder.id)}>
                          Lịch sử
                        </button>
                        <button type="button" className="sapo-btn" onClick={() => handleAcceptClick(selectedOrder)}>
                          Tiếp nhận
                        </button>
                      </>
                    )}
                  </div>

                </div>

                {/* Table */}
                <div className="table-container desktop-only">
                  <table className="base-table">
                    <thead>
                      <tr>
                        <th style={{ width: "50px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>STT</th>
                        <th style={{ width: "125px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Mã đơn hàng</th>
                        <th style={{ width: "90px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Khách hàng</th>
                        <th style={{ width: "180px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Nhân viên KD</th>
                        <th style={{ width: "100px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Ngày đặt hàng</th>
                        <th style={{ width: "105px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Chi nhánh</th>
                        <th style={{ width: "90px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Thời gian đề nghị</th>
                        <th style={{ width: "90px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Số mặt hàng</th>
                        <th style={{ width: "80px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Tổng số lượng</th>
                        <th style={{ width: "120px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingAcceptOrders.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                            Không có đơn hàng nào chờ tiếp nhận.
                          </td>
                        </tr>
                      ) : (
                        pendingAcceptOrders.map((order, idx) => (
                            <tr
                              key={order.id}
                              onClick={() => {
                                const isSelected = selectedOrderId === order.id;
                                setSelectedOrderId(isSelected ? null : order.id);
                              }}
                              title="Nhấp để chọn"
                              className={`row-hoverable ${selectedOrderId === order.id ? "row-selected" : ""}`}
                              style={{ cursor: "pointer" }}
                            >
                              <td style={{ textAlign: "center", fontWeight: 600 }}>{idx + 1}</td>
                              <td style={{ fontWeight: 700, color: "#003466", textAlign: "center" }}>{order.orderCode}</td>
                               <td style={{ textAlign: "center" }}>
                                {(() => {
                                  const cust = (customersFull || []).find(c => c.code === order.customerCode);
                                  return cust?.abbreviation || order.customerCode;
                                })()}
                              </td>
                              <td className="nowrap" style={{ textAlign: "center" }}>{order.employeeName}</td>
                              <td style={{ textAlign: "center" }}>{new Date(order.orderDate).toLocaleDateString("vi-VN")}</td>
                              <td style={{ textAlign: "center" }}>{order.branch}</td>
                              <td style={{ textAlign: "center" }}>{formatYearMonth(order.requestDeliveryDate)}</td>
                              {(() => {
                                const numItems = order.orderitem?.length || 0;
                                const totalQty = order.orderitem?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
                                
                                return (
                                  <>
                                    <td style={{ textAlign: "center", fontWeight: 600 }}>{numItems}</td>
                                    <td style={{ textAlign: "right", paddingRight: "15px", fontWeight: 600 }}>{formatNumber(totalQty)}</td>
                                  </>
                                );
                              })()}
                              <td style={{ textAlign: "center" }}>
                                <span className={`status-pill ${order.status === "Chờ tiếp nhận" ? "status-waiting" : order.status === "Chờ kế hoạch" ? "status-planning" : "status-pending"}`}>{order.status}</span>
                              </td>
                            </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card list */}
                <div className="mobile-list" style={{ display: "none" }}>
                  {pendingAcceptOrders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", background: "#ffffff", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                      Không có đơn hàng nào chờ tiếp nhận.
                    </div>
                  ) : (
                    pendingAcceptOrders.map((order, idx) => {
                      const isSelected = selectedOrderId === order.id;
                      const numItems = order.orderitem?.length || 0;
                      const totalQty = order.orderitem?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
                      const customerAbbreviation = (() => {
                        const cust = (customersFull || []).find(c => c.code === order.customerCode);
                        return cust?.abbreviation || order.customerCode;
                      })();

                      return (
                        <div 
                          key={order.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            const isSel = selectedOrderId === order.id;
                            setSelectedOrderId(isSel ? null : order.id);
                          }}
                          className={`proposal-card ${isSelected ? "selected" : ""}`}
                        >
                          <div className="card-row card-header">
                            <div className="code-box">
                              <span className="idx-pill">#{idx + 1}</span>
                              <span className="proposal-code">{order.orderCode}</span>
                            </div>
                            <span className="status-pill status-waiting">
                              {order.status}
                            </span>
                          </div>

                          <div className="card-body">
                            <div className="info-row">
                              <span className="info-label">Khách hàng:</span>
                              <span className="info-val highlight">{customerAbbreviation}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Nhân viên KD:</span>
                              <span className="info-val">{order.employeeName}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Ngày đặt hàng:</span>
                              <span className="info-val">{new Date(order.orderDate).toLocaleDateString("vi-VN")}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Chi nhánh:</span>
                              <span className="info-val">{order.branch}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Thời gian đề nghị:</span>
                              <span className="info-val">{formatYearMonth(order.requestDeliveryDate)}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Số mặt hàng:</span>
                              <span className="info-val highlight">{numItems}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Tổng số lượng:</span>
                              <span className="info-val highlight" style={{ color: "#ff5c00" }}>{formatNumber(totalQty)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ĐƠN ĐÃ TIẾP NHẬN */}
          {activeMainTab === 2 && (
            <div className="blue-panel" style={{ marginTop: "10px" }}>
              <div className="blue-panel-header">Danh sách đơn hàng đã tiếp nhận</div>
              <div className="blue-panel-body">
                {/* Toolbar */}
                <div className="base-toolbar">
                  <div className="toolbar-left">
                    <button 
                      type="button" 
                      className="sapo-btn sapo-btn-secondary" 
                      onClick={() => {
                        setFilterOrderCode("");
                        setFilterEmployee("");
                        setFilterMonth("");
                        router.refresh();
                      }}
                    >
                      Làm mới
                    </button>
                    {selectedOrder && selectedOrder.status === "Chờ kế hoạch" && (
                      <>
                        <button type="button" className="sapo-btn" onClick={() => handleView(selectedOrder)}>
                          Xem
                        </button>
                        <button type="button" className="sapo-btn" onClick={() => setHistoryRecordId(selectedOrder.id)}>
                          Lịch sử
                        </button>
                        <button type="button" className="sapo-btn sapo-btn-danger" onClick={() => setConfirmCancelAccept(selectedOrder)}>
                          Hủy tiếp nhận
                        </button>
                      </>
                    )}
                  </div>

                </div>

                {/* Table */}
                <div className="table-container desktop-only">
                  <table className="base-table">
                    <thead>
                      <tr>
                        <th style={{ width: "50px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>STT</th>
                        <th style={{ width: "125px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Mã đơn hàng</th>
                        <th style={{ width: "90px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Khách hàng</th>
                        <th style={{ width: "180px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Nhân viên KD</th>
                        <th style={{ width: "100px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Ngày đặt hàng</th>
                        <th style={{ width: "105px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Chi nhánh</th>
                        <th style={{ width: "90px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Thời gian đề nghị</th>
                        <th style={{ width: "90px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Số mặt hàng</th>
                        <th style={{ width: "80px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Tổng số lượng</th>
                        <th style={{ width: "120px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingPlanOrders.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                            Không có đơn hàng nào đã tiếp nhận.
                          </td>
                        </tr>
                      ) : (
                        pendingPlanOrders.map((order, idx) => (
                          <Fragment key={order.id}>
                            <tr
                              onClick={() => {
                                const isSelected = selectedOrderId === order.id;
                                setSelectedOrderId(isSelected ? null : order.id);
                              }}
                              title="Nhấp để chọn"
                              className={`row-hoverable ${selectedOrderId === order.id ? "row-selected" : ""}`}
                              style={{ cursor: "pointer" }}
                            >
                              <td style={{ textAlign: "center", fontWeight: 600 }}>{idx + 1}</td>
                              <td style={{ fontWeight: 700, color: "#003466", textAlign: "center" }}>{order.orderCode}</td>
                              <td style={{ textAlign: "center" }}>
                                {(() => {
                                  const cust = (customersFull || []).find(c => c.code === order.customerCode);
                                  return cust?.abbreviation || order.customerCode;
                                })()}
                              </td>
                              <td className="nowrap" style={{ textAlign: "center" }}>{order.employeeName}</td>
                              <td style={{ textAlign: "center" }}>{new Date(order.orderDate).toLocaleDateString("vi-VN")}</td>
                              <td style={{ textAlign: "center" }}>{order.branch}</td>
                              <td style={{ textAlign: "center" }}>{formatYearMonth(order.requestDeliveryDate)}</td>
                              {(() => {
                                const numItems = order.orderitem?.length || 0;
                                const totalQty = order.orderitem?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
                                
                                return (
                                  <>
                                    <td style={{ textAlign: "center", fontWeight: 600 }}>{numItems}</td>
                                    <td style={{ textAlign: "right", paddingRight: "15px", fontWeight: 600 }}>{formatNumber(totalQty)}</td>
                                  </>
                                );
                              })()}
                              <td style={{ textAlign: "center" }}>
                                <span className={`status-pill ${order.status === "Chờ tiếp nhận" ? "status-waiting" : order.status === "Chờ kế hoạch" ? "status-planning" : "status-pending"}`}>{order.status}</span>
                              </td>
                            </tr>
                          </Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card list */}
                <div className="mobile-list" style={{ display: "none" }}>
                  {pendingPlanOrders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", background: "#ffffff", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                      Không có đơn hàng nào đã tiếp nhận.
                    </div>
                  ) : (
                    pendingPlanOrders.map((order, idx) => {
                      const isSelected = selectedOrderId === order.id;
                      const numItems = order.orderitem?.length || 0;
                      const totalQty = order.orderitem?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
                      const customerAbbreviation = (() => {
                        const cust = (customersFull || []).find(c => c.code === order.customerCode);
                        return cust?.abbreviation || order.customerCode;
                      })();

                      return (
                        <div 
                          key={order.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            const isSel = selectedOrderId === order.id;
                            setSelectedOrderId(isSel ? null : order.id);
                          }}
                          className={`proposal-card ${isSelected ? "selected" : ""}`}
                        >
                          <div className="card-row card-header">
                            <div className="code-box">
                              <span className="idx-pill">#{idx + 1}</span>
                              <span className="proposal-code">{order.orderCode}</span>
                            </div>
                            <span className="status-pill status-planning">
                              {order.status}
                            </span>
                          </div>

                          <div className="card-body">
                            <div className="info-row">
                              <span className="info-label">Khách hàng:</span>
                              <span className="info-val highlight">{customerAbbreviation}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Nhân viên KD:</span>
                              <span className="info-val">{order.employeeName}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Ngày đặt hàng:</span>
                              <span className="info-val">{new Date(order.orderDate).toLocaleDateString("vi-VN")}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Chi nhánh:</span>
                              <span className="info-val">{order.branch}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Thời gian đề nghị:</span>
                              <span className="info-val">{formatYearMonth(order.requestDeliveryDate)}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Số mặt hàng:</span>
                              <span className="info-val highlight">{numItems}</span>
                            </div>
                            <div className="info-row">
                              <span className="info-label">Tổng số lượng:</span>
                              <span className="info-val highlight" style={{ color: "#ff5c00" }}>{formatNumber(totalQty)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRM ACCEPT MODAL (TAB 1 ACTION) */}
      {confirmAccept && (
        <div className="custom-modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <div style={{ background: "#ffffff", borderRadius: "12px", width: "420px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", color: "#10b981" }}>
              <Clock size={28} />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", textAlign: "center", marginBottom: "8px" }}>
              Tiếp nhận đơn sản xuất
            </h3>
            <p style={{ color: "#475569", textAlign: "center", margin: "0 0 20px 0", lineHeight: "1.5" }}>
              Bạn có chắc chắn đồng ý tiếp nhận đơn hàng <strong style={{ color: "#003466" }}>{confirmAccept.orderCode}</strong> không? Đơn hàng sẽ chuyển sang trạng thái <strong>Chờ lập kế hoạch</strong>.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" className="sapo-btn sapo-btn-secondary" onClick={() => setConfirmAccept(null)}>
                Hủy bỏ
              </button>
              <button type="button" className="sapo-btn sapo-btn-success" onClick={executeAccept} disabled={isPending}>
                {isPending ? "Đang xử lý..." : "Đồng ý tiếp nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CANCEL ACCEPT MODAL (TAB 2 ACTION) */}
      {confirmCancelAccept && (
        <div className="custom-modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <div style={{ background: "#ffffff", borderRadius: "12px", width: "420px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", color: "#ef4444" }}>
              <Clock size={28} />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", textAlign: "center", marginBottom: "8px" }}>
              Hủy tiếp nhận đơn sản xuất
            </h3>
            <p style={{ color: "#475569", textAlign: "center", margin: "0 0 20px 0", lineHeight: "1.5" }}>
              Bạn có chắc chắn muốn hủy tiếp nhận đơn hàng <strong style={{ color: "#003466" }}>{confirmCancelAccept.orderCode}</strong> không? Đơn hàng sẽ quay trở về trạng thái <strong>Chờ tiếp nhận</strong>.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" className="sapo-btn sapo-btn-secondary" onClick={() => setConfirmCancelAccept(null)}>
                Hủy bỏ
              </button>
              <button type="button" className="sapo-btn sapo-btn-danger" onClick={executeCancelAccept} disabled={isPending}>
                {isPending ? "Đang xử lý..." : "Hủy tiếp nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED VIEW MODAL */}
      {showViewModal && viewingOrder && (
        <div className="custom-modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <div style={{ background: "#ffffff", width: "900px", height: "490px", display: "flex", flexDirection: "column", padding: 0, borderRadius: "16px", border: "1px solid #cbd5e1", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            
            {/* Modal Header */}
            <h3 style={{ borderBottom: "1px solid #eee", padding: "12px 24px", margin: 0, background: "#fff", fontWeight: 700, color: "#003466", display: "flex", alignItems: "center", gap: "8px" }}>
              🔍 Chi tiết đơn sản xuất: <span style={{ color: "#ff5c00" }}>{viewingOrder.orderCode}</span>
              {viewingOrder.employeeName && (
                <>
                  <span style={{ fontSize: "16px", color: "#64748b", fontWeight: "normal", marginLeft: "4px" }}>—</span>
                  <span style={{ fontSize: "16px", color: "#64748b", fontWeight: 600, marginLeft: "6px" }}>Nhân viên:</span>
                  <span style={{ color: "#ff5c00", textTransform: "uppercase", fontSize: "16px", fontWeight: 700, marginLeft: "4px" }}>
                    {viewingOrder.employeeName}
                  </span>
                </>
              )}
            </h3>

            {/* Modal Scrollable Body */}
            <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
              
              {/* Goods list Section */}
              <div style={{ marginTop: "0px", marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#003466", fontWeight: "700" }}>
                  📦 Chi tiết hàng hóa
                </h4>
                <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                  <table style={{ fontSize: "12px", width: "100%", minWidth: "1285px", tableLayout: "fixed", borderCollapse: "collapse" }}>
                    <thead style={{ background: "#f8fafc" }}>
                      <tr>
                        <th style={{ textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1", textAlign: "center", width: "300px", whiteSpace: "normal", verticalAlign: "middle" }}>Tên hàng hóa</th>
                        <th style={{ textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1", textAlign: "center", width: "150px", whiteSpace: "normal", verticalAlign: "middle" }}>Quy cách</th>
                        <th style={{ textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1", textAlign: "center", width: "80px", whiteSpace: "normal", verticalAlign: "middle" }}>Số lượng</th>
                        <th style={{ textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1", textAlign: "center", width: "65px", whiteSpace: "normal", verticalAlign: "middle" }}>Pallet</th>
                        <th style={{ textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1", textAlign: "center", width: "65px", whiteSpace: "normal", verticalAlign: "middle" }}>Nẹp góc</th>
                        <th style={{ textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1", textAlign: "center", width: "65px", whiteSpace: "normal", verticalAlign: "middle" }}>Túi in</th>
                        <th style={{ textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1", textAlign: "center", width: "65px", whiteSpace: "normal", verticalAlign: "middle" }}>Thùng in</th>
                        <th style={{ textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1", textAlign: "center", width: "65px", whiteSpace: "normal", verticalAlign: "middle" }}>Brix (%)</th>
                        <th style={{ textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1", textAlign: "center", width: "150px", whiteSpace: "normal", verticalAlign: "middle" }}>Tiêu chuẩn</th>
                        <th style={{ textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1", textAlign: "center", width: "180px", whiteSpace: "normal", verticalAlign: "middle" }}>Yêu cầu khác</th>
                        <th style={{ textTransform: "uppercase", color: "#003466", fontWeight: 700, padding: "8px", borderBottom: "2px solid #cbd5e1", textAlign: "center", width: "180px", whiteSpace: "normal", verticalAlign: "middle" }}>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingOrder.orderitem && viewingOrder.orderitem.length > 0 ? (
                        viewingOrder.orderitem.map((item: any) => (
                          <tr key={item.id} style={{ borderBottom: "1px solid #cbd5e1" }}>
                            <td style={{ padding: "8px" }}>{item.productName}</td>
                            <td style={{ padding: "8px" }}>{item.packaging || "—"}</td>
                            <td style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}>{formatNumber(item.quantity)}</td>
                            <td style={{ padding: "8px", textAlign: "center" }}>{item.hasPallet ? "✅" : "—"}</td>
                            <td style={{ padding: "8px", textAlign: "center" }}>{item.hasCornerGuard ? "✅" : "—"}</td>
                            <td style={{ padding: "8px", textAlign: "center" }}>{item.printedBag ? "✅" : "—"}</td>
                            <td style={{ padding: "8px", textAlign: "center" }}>{item.printedBox ? "✅" : "—"}</td>
                            <td style={{ padding: "8px", textAlign: "center" }}>{item.brix || "—"}</td>
                            <td style={{ padding: "8px" }}>{item.standard || "—"}</td>
                            <td style={{ padding: "8px" }}>{item.otherRequirements || "—"}</td>
                            <td style={{ padding: "8px", color: "#64748b" }}>{item.note || "—"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={11} style={{ padding: "12px", textAlign: "center", color: "#888" }}>Không có chi tiết hàng hóa.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Dòng Nhiệt kế và Ghi chú dưới bảng chi tiết hàng hóa */}
                <div style={{ display: "flex", gap: "2.5rem", marginTop: "15px", flexWrap: "wrap", alignItems: "baseline" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
                    <span className="filter-label" style={{ display: "inline-block", margin: 0, whiteSpace: "nowrap" }}>Nhiệt kế:</span>
                    <span style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>{getThermometerInfo(viewingOrder, contracts)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
                    <span className="filter-label" style={{ display: "inline-block", margin: 0, whiteSpace: "nowrap" }}>Ghi chú:</span>
                    <span style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b", whiteSpace: "pre-wrap" }}>{viewingOrder.note ?? "—"}</span>
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div style={{ marginTop: "20px", borderTop: "1px solid #cbd5e1", paddingTop: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", color: "#003466", fontWeight: "700" }}>
                  📎 Tệp đính kèm từ hợp đồng
                </h4>
                {(() => {
                  const match = viewingOrder.note?.match(/Hợp đồng:\s*(.*?)(?:\s+-\s+|$)/);
                  const contractNo = match ? match[1]?.trim() : null;
                  const contractObj = contractNo ? (contracts || []).find((c: any) => c.contractNumber?.trim() === contractNo) : null;
                  const attachments = contractObj?.attachments ? JSON.parse(contractObj.attachments) : [];
                  
                  if (attachments && attachments.length > 0) {
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {attachments.map((file: any, index: number) => (
                          <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                            <span style={{ fontSize: "13px", color: "#334155", flex: 1 }}>{file.fileName}</span>
                            <a href={file.fileContent} download={file.fileName} style={{ fontSize: "12px", color: "#2563eb", textDecoration: "underline", fontWeight: 500 }}>
                              Tải xuống
                            </a>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return <span style={{ fontSize: "13px", color: "#64748b" }}>Không có tệp đính kèm nào.</span>;
                })()}
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #eee", padding: "12px 24px", background: "#fff" }}>
              <button type="button" className="sapo-btn sapo-btn-secondary" onClick={handleCloseViewModal}>
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* HISTORY MODAL CONTAINER */}
      {historyRecordId && (
        <HistoryModal 
          recordId={historyRecordId}
          tableName="Order"
          onClose={() => setHistoryRecordId(null)}
        />
      )}
    </div>
  );
}
