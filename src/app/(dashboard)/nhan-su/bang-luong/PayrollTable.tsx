"use client";

import { useState, useTransition, useEffect } from "react";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { 
  Plus, 
  Trash2, 
  Eye, 
  X, 
  Search,
  UserCheck,
  Pencil,
  RefreshCw
} from "lucide-react";
import { 
  createPayroll, 
  deletePayroll, 
  updatePayrollStatus, 
  getPayrollDetails,
  updatePayrollDetail,
  updatePayroll
} from "./actions";

type Payroll = {
  id: string;
  month: number;
  year: number;
  creator: string;
  approver: string;
  note: string | null;
  status: string;
  createdAt: Date;
  _count: { details: number };
};

type EmployeeShort = {
  employeeCode: string;
  fullName: string;
  position: string | null;
  department: string | null;
};

export default function PayrollTable({ 
  initialPayrolls, 
  employees, 
  approvers,
  currentUserName 
}: { 
  initialPayrolls: Payroll[], 
  employees: EmployeeShort[], 
  approvers: EmployeeShort[],
  currentUserName: string
}) {
  const [payrolls, setPayrolls] = useState<Payroll[]>(initialPayrolls);
  const [showModal, setShowModal] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);
  const [showEmployeeSelect, setShowEmployeeSelect] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [viewingDetails, setViewingDetails] = useState<any[] | null>(null);
  const [currentViewingId, setCurrentViewingId] = useState<string | null>(null);
  const [editingDetail, setEditingDetail] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useRealTimeSync("payroll", payrolls, setPayrolls);

  const filteredEmployees = employees.filter(e => 
    e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );
...
