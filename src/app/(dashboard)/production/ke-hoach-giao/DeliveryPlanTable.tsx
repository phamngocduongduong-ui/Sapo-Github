"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeftRight, Clock, Search } from "lucide-react";
import { planOrder, unplanOrder } from "../don-san-xuat/actions";
import HistoryModal from "../../HistoryModal";
import { formatNumber } from "@/lib/format";

const formatYearMonth = (dateInput: any) => {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export default function DeliveryPlanTable({
  initialOrders,
  customers,
  customersFull = [],
  branches,
  salesEmployees,
  currentUser,
  contracts = [],
  activeBranch
}: {
  initialOrders: any[];
  customers: string[];
  customersFull?: any[];
  branches: string[];
  salesEmployees: string[];
  currentUser: string;
  contracts?: any[];
  activeBranch?: string;
}) {
  const router = useRouter();

  const getCardStyle = (branch: string | null) => {
    if (activeBranch !== "Hồ Chí Minh") return {};
    if (branch === "Đồng Tháp") return { borderLeft: "4px solid #16a34a" };
    if (branch === "Đắk Lắk") return { borderLeft: "4px solid #ea580c" };
    return {};
  };

  const getBadgeStyle = (branch: string | null) => {
    if (activeBranch !== "Hồ Chí Minh") return {};
    if (branch === "Đồng Tháp") {
      return {
        background: "#dcfce7",
        color: "#15803d",
        borderColor: "#bbf7d0"
      };
    }
    if (branch === "Đắk Lắk") {
      return {
        background: "#ffedd5",
        color: "#c2410c",
        borderColor: "#fed7aa"
      };
    }
    return {};
  };

  const getThermometerInfo = (order: any) => {
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

  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [filterMonth, setFilterMonth] = useState("");
  
  // Sync initialOrders from props only when data actually changes to prevent optimistic state flicker
  const initialOrdersKey = useMemo(() => {
    return initialOrders.map(o => `${o.id}-${o.status}-${o.shipDate || ""}-${o.updatedAt || ""}`).join("|");
  }, [initialOrders]);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrdersKey]);
  
  // Real-time sync (disabled during transition or saving)
  useRealTimeSync(
    "orders&page=delivery-plan", 
    orders, 
    setOrders, 
    3000, 
    isPending || isSaving
  );

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

  // Xem chi tiết đơn hàng modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState(1);

  // Lịch sử modal
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);

  // Bộ lọc
  const [filterOrderCode, setFilterOrderCode] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");

  const filterableOrderCodes = useMemo(() => {
    const codes = orders
      .filter(o => o.status === "Chờ tiếp nhận")
      .map(o => o.orderCode)
      .filter(Boolean);
    return Array.from(new Set(codes)).sort();
  }, [orders]);

  // Bộ lọc logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchBranch = !activeBranch || activeBranch === "Hồ Chí Minh" || order.branch === activeBranch;
      const matchOrderCode = !filterOrderCode || (order.orderCode && order.orderCode.toLowerCase().includes(filterOrderCode.trim().toLowerCase()));
      const matchEmployee = !filterEmployee || order.employeeName === filterEmployee;
      const matchMonth = !filterMonth || (() => {
        if (!order.requestDeliveryDate) return false;
        const d = new Date(order.requestDeliveryDate);
        const yyyyMm = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        return yyyyMm === filterMonth;
      })();
      return matchBranch && matchOrderCode && matchEmployee && matchMonth;
    });
  }, [orders, activeBranch, filterOrderCode, filterEmployee, filterMonth]);

  // Đơn chờ kế hoạch (Cột bên trái)
  const pendingPlanOrders = useMemo(() => {
    return filteredOrders.filter(o => o.status === "Chờ kế hoạch");
  }, [filteredOrders]);

  // Lịch (Cột bên phải)
  const plannedOrders = useMemo(() => {
    return orders.filter(o => 
      o.status === "Chờ giao hàng" && 
      o.shipDate &&
      (!activeBranch || activeBranch === "Hồ Chí Minh" || o.branch === activeBranch)
    );
  }, [orders, activeBranch]);

  // Trạng thái ngày Lịch

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

  async function handleCalendarDrop(e: React.DragEvent, dateStr: string) {
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

    setIsSaving(true);
    try {
      const res = await fetch("/api/production/ke-hoach-giao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "plan", orderId, shipDateStr: dateStr })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Có lỗi xảy ra khi xếp lịch.");
      }
    } catch (err: any) {
      // Rollback
      setOrders(previousOrders);
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleLeftDeckDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsLeftDeckDragOver(true);
  }

  function handleLeftDeckDragLeave() {
    setIsLeftDeckDragOver(false);
  }

  async function handleLeftDeckDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsLeftDeckDragOver(false);
    const orderId = e.dataTransfer.getData("text/plain");
    if (!orderId) return;

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

      setIsSaving(true);
      try {
        const res = await fetch("/api/production/ke-hoach-giao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unplan", orderId })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Có lỗi xảy ra khi hủy xếp lịch.");
        }
      } catch (err: any) {
        // Rollback
        setOrders(previousOrders);
        alert(err.message);
      } finally {
        setIsSaving(false);
      }
    }
  }

  // Calendar calculations
  const calendarCells = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth(); // 0-indexed

    const firstDayOfMonth = new Date(year, month, 1);
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

    // Next month padding to fill the last week until Sunday
    const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
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
          margin-bottom: 15px;
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
          grid-template-columns: repeat(7, minmax(0, 1fr));
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
          padding: 3px 6px;
          font-size: 10px !important;
          font-weight: 700;
          cursor: grab;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-align: center;
          transition: background-color 0.15s, transform 0.15s;
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
          color: #94a3b8 !important;
        }
        @keyframes loading-spin {
          to { transform: rotate(360deg); }
        }
        .loading-spin {
          animation: loading-spin 1s linear infinite;
        }
        `
      }} />

      <div className="breadcrumb-banner">
        PHÂN HỆ SẢN XUẤT &mdash; KẾ HOẠCH GIAO
      </div>

      <div className="contract-layout">
        <div className="panel-full">


          {/* DND CALENDAR VIEW */}
          <div className="split-layout" style={{ position: "relative" }}>
            {(isPending || isSaving) && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(2px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 20,
                borderRadius: "6px",
                transition: "all 0.3s ease"
              }}>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ffffff",
                  padding: "16px 28px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
                }}>
                  <div className="loading-spin" style={{
                    border: "3px solid rgba(0, 52, 102, 0.1)",
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    borderLeftColor: "#003466",
                    marginBottom: "8px"
                  }} />
                  <p style={{ margin: 0, fontSize: "13px", color: "#003466", fontWeight: 600 }}>
                    {isSaving ? "Đang lưu kế hoạch giao..." : "Đang xử lý..."}
                  </p>
                </div>
              </div>
            )}
            {/* Left Panel: Draggable orders waiting for schedule */}
            <div 
              className={`left-deck ${isLeftDeckDragOver ? "drag-over" : ""}`}
              onDragOver={handleLeftDeckDragOver}
              onDragLeave={handleLeftDeckDragLeave}
              onDrop={handleLeftDeckDrop}
            >
              <div style={{ paddingBottom: "8px", borderBottom: "1px solid #cbd5e1", marginBottom: "4px" }}>
                <h4 style={{ margin: 0, color: "#003466", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  📋 Đơn chờ xếp lịch ({pendingPlanOrders.length})
                </h4>
                <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>
                  Kéo đơn hàng từ danh sách này vào ngày trong lịch để xếp lịch xuất.
                </p>
              </div>

              {pendingPlanOrders.length === 0 ? (
                <div className="empty-placeholder">
                  🎉 Không có đơn hàng nào chờ lập kế hoạch.
                </div>
              ) : (
                pendingPlanOrders.map((order) => {
                  const totalQty = order.orderitem?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
                  const itemsPreview = order.orderitem?.map((item: any) => `${item.productName} (SL: ${item.quantity})`).join(", ");
                  return (
                    <div
                      key={order.id}
                      className="order-drag-card"
                      style={getCardStyle(order.branch)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order.id)}
                      onClick={() => handleView(order)}
                      title="Click để xem chi tiết, giữ kéo để xếp lịch"
                    >
                      <div className="order-drag-card-title">
                        <span>{order.orderCode}</span>
                         <span style={{ fontSize: "11px", color: "#ff5c00" }}>
                          {(() => {
                            const cust = (customersFull || []).find(c => c.code === order.customerCode);
                            return cust?.abbreviation || order.customerCode;
                          })()}
                        </span>
                      </div>
                      <div className="order-drag-card-meta">
                        📍 {order.branch || "—"} | 📦 SL: <strong>{formatNumber(totalQty)}</strong>
                      </div>
                      <div className="order-drag-card-items" title={itemsPreview}>
                        {itemsPreview.length > 50 ? `${itemsPreview.slice(0, 50)}...` : itemsPreview}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>🕒 Thời gian đề nghị:</span>
                        <strong style={{ color: "#334155" }}>{formatYearMonth(order.requestDeliveryDate)}</strong>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Drop zone indicator when dragging scheduled items back */}
              <div style={{
                marginTop: "auto",
                padding: "12px",
                borderRadius: "6px",
                border: "2px dashed #cbd5e1",
                background: isLeftDeckDragOver ? "#dcfce7" : "#f1f5f9",
                color: isLeftDeckDragOver ? "#166534" : "#475569",
                textAlign: "center",
                fontSize: "11px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}>
                <ArrowLeftRight size={14} /> Kéo đơn từ lịch vào đây để hủy xếp lịch
              </div>
            </div>

            {/* Right Panel: Monthly calendar grid */}
            <div className="right-calendar">
              {/* Calendar Header with Controls */}
              <div className="calendar-header">
                <h3 style={{ margin: 0, color: "#003466", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                  <CalendarIcon size={18} color="#003466" /> Lịch xuất hàng: <span style={{ color: "#ff5c00" }}>{monthYearLabel}</span>
                </h3>
                
                <div style={{ display: "flex", gap: "6px" }}>
                  <button type="button" className="sapo-btn sapo-btn-secondary" style={{ padding: "4px 8px" }} onClick={() => changeMonth(-1)}>
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" className="sapo-btn sapo-btn-secondary" style={{ padding: "4px 12px" }} onClick={setToday}>
                    Hôm nay
                  </button>
                  <button type="button" className="sapo-btn sapo-btn-secondary" style={{ padding: "4px 8px" }} onClick={() => changeMonth(1)}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Weekday Labels (Mon - Sun) */}
              <div className="calendar-grid" style={{ gridTemplateRows: "auto", flex: "0 0 auto", width: "100%", marginBottom: "6px" }}>
                <div className="calendar-weekday">T2</div>
                <div className="calendar-weekday">T3</div>
                <div className="calendar-weekday">T4</div>
                <div className="calendar-weekday">T5</div>
                <div className="calendar-weekday">T6</div>
                <div className="calendar-weekday">T7</div>
                <div className="calendar-weekday" style={{ color: "#ef4444" }}>CN</div>
              </div>

              {/* Day Cells Grid */}
              <div className="calendar-grid" style={{ gridTemplateRows: `repeat(${calendarCells.length / 7}, 1fr)` }}>
                {calendarCells.map((cell, idx) => {
                  const dateStr = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}`;
                  const isToday = new Date().toDateString() === cell.date.toDateString();
                  
                  const todayDate = new Date();
                  todayDate.setHours(0, 0, 0, 0);
                  const cellDateTime = new Date(cell.date);
                  cellDateTime.setHours(0, 0, 0, 0);
                  const isPastDay = cellDateTime < todayDate;
                  
                  // Filter planned orders for this day
                  const cellOrders = plannedOrders.filter(o => {
                    const d = new Date(o.shipDate);
                    const orderDateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
                    return orderDateStr === dateStr;
                  });

                  const isDragTarget = dragOverDate === dateStr;

                  if (!cell.isCurrentMonth) {
                    return (
                      <div
                        key={`${cell.key}-${idx}`}
                        className="calendar-day-cell other-month"
                        style={{ visibility: "hidden" }}
                      />
                    );
                  }

                  return (
                    <div
                      key={`${cell.key}-${idx}`}
                      className={`calendar-day-cell ${isToday ? "today" : ""} ${isPastDay ? "past-day" : ""} ${isDragTarget ? "drag-over" : ""}`}
                      onDragOver={(e) => handleCalendarDragOver(e, dateStr)}
                      onDragLeave={handleCalendarDragLeave}
                      onDrop={(e) => handleCalendarDrop(e, dateStr)}
                    >
                      <div className="calendar-day-number">{cell.date.getDate()}</div>
                      
                      {/* List of orders on this day */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
                        {cellOrders.map(order => (
                          <div
                            key={order.id}
                            className="calendar-order-badge"
                            style={getBadgeStyle(order.branch)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, order.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(order);
                            }}
                            title={`Đơn: ${order.orderCode} - KH: ${(() => {
                              const cust = (customersFull || []).find(c => c.code === order.customerCode);
                              return cust?.abbreviation || order.customerCode;
                            })()}. Nhấp để xem, kéo để đổi ngày hoặc dời lịch.`}
                          >
                            <span>{order.orderCode}</span>
                            <span style={{ fontSize: "9px", opacity: 0.8 }}>
                              ({(() => {
                                const cust = (customersFull || []).find(c => c.code === order.customerCode);
                                return cust?.abbreviation || order.customerCode;
                              })()})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

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
                    <span style={{ fontSize: "14px", fontWeight: "500", color: "#1e293b" }}>{getThermometerInfo(viewingOrder)}</span>
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
                  return <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Không có tệp đính kèm nào.</p>;
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
