"use client";

import { useState, useEffect } from "react";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Download, 
  Upload, 
  Search,
  X
} from "lucide-react";
import * as XLSX from "xlsx";
import { 
  createAttendance, 
  updateAttendance, 
  deleteAttendance, 
  importAttendances,
  checkExistingAttendances
} from "./actions";

interface Attendance {
  id: string;
  employeeCode: string;
  employeeName: string;
  gender: string | null;
  department: string | null;
  annualLeaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  sundayOvertimeHours: number;
  holidayOvertimeHours: number;
  weekdayOvertimeHours: number;
  month: number;
  year: number;
}

export default function AttendanceTable({ initialData }: { initialData: Attendance[] }) {
  const [data, setData] = useState<Attendance[]>(initialData);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useRealTimeSync("attendance", data, setData);

  const filteredData = data.filter(item => 
    item.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    item.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
    `${item.month}/${item.year}`.includes(search)
  );

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
      try {
        await deleteAttendance(id);
        setData(data.filter(item => item.id !== id));
      } catch (error) {
        alert("Lỗi khi xóa: " + (error as any).message);
      }
    }
  };
...
