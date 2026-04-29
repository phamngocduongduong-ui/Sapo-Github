"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { createDispatchOrder, updateDispatchOrder } from "./actions";

type DispatchOrder = {
  id: string;
  dispatchDate: Date;
  expectedDate: Date;
  employeeName: string;
  status: string;
  dispatcher: string;
  note: string | null;
  createdAt: Date;
};

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  PENDING:     { label: "Chờ xử lý",    badge: "badge-warning" },
  IN_PROGRESS: { label: "Đang thực hiện", badge: "badge-info" },
  DONE:        { label: "Hoàn thành",   badge: "badge-success" },
  CANCELLED:   { label: "Đã hủy",       badge: "badge-danger" },
};

export default function DispatchTable({ 
  initialOrders, 
  activeEmployees 
}: { 
  initialOrders: DispatchOrder[], 
  activeEmployees: string[] 
}) {
  const [orders, setOrders] = useState<DispatchOrder[]>(initialOrders);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<DispatchOrder | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useRealTimeSync("dispatch-orders", orders, setOrders);

  function handleClose() {
    setShowModal(false);
    setEditingOrder(null);
    setError(null);
    formRef.current?.reset();
  }
...
