"use client";

import { useState, useEffect } from "react";
import SalaryChangeTable from "./SalaryChangeTable";
import SalaryChangeForm from "./SalaryChangeForm";
import { getSalaryChanges, updateSalaryChangeStatus, createSalaryChange, updateSalaryChange } from "./actions";
import { RotateCcw } from "lucide-react";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";

export default function SalaryChangePage() {
  const [items, setItems] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    type: "Tất cả",
    employeeName: "Tất cả",
    status: "Tất cả",
    year: new Date().getFullYear().toString()
  });

  useRealTimeSync("salary-changes", items, setItems);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    const [data, session] = await Promise.all([
      getSalaryChanges(),
      (async () => {
        const s = await (async () => {
          // Since we can't easily import getCurrentUser here if it's not exported or if I want to be sure
          // I'll just check the session in the page
          const res = await fetch('/api/auth/session').then(r => r.json()).catch(() => null);
          return res;
        })();
        return s;
      })()
    ]);
    setItems(data);
    
    // Check if user is admin
    // In this system, admin check is often user.role === 'Admin'
    const res = await fetch('/api/user-permissions').then(r => r.json()).catch(() => ({}));
    setIsAdmin(res.isAdmin || false);
    
    setIsLoading(false);
  }

  const filteredItems = items.filter(item => {
    const matchType = filters.type === "Tất cả" || item.type === filters.type;
    const matchEmployee = filters.employeeName === "Tất cả" || item.employeeName === filters.employeeName;
    const matchStatus = filters.status === "Tất cả" || item.status === filters.status;
    const matchYear = filters.year === "Tất cả" || item.effectiveYear.toString() === filters.year;
    return matchType && matchEmployee && matchStatus && matchYear;
  });

  // Unique values for filters
  const types = ["Tất cả", ...new Set(items.map(item => item.type))];
  const employees = ["Tất cả", ...new Set(items.map(item => item.employeeName))];
  const statuses = ["Tất cả", ...new Set(items.map(item => item.status))];
  const currentYear = new Date().getFullYear().toString();
  const availableYears = ["Tất cả", ...new Set([currentYear, ...items.map(item => item.effectiveYear.toString())])].sort((a, b) => {
    if (a === "Tất cả") return -1;
    if (b === "Tất cả") return 1;
    return parseInt(b) - parseInt(a); // Sort years descending
  });

  async function handleSubmit(formData: any) {
    if (editingItem) {
      await updateSalaryChange(editingItem.id, formData);
    } else {
      await createSalaryChange(formData);
    }
    setIsFormOpen(false);
    setEditingItem(null);
    fetchData();
  }

  async function handleStatusChange(id: string, newStatus: string) {
    await updateSalaryChangeStatus(id, newStatus);
    fetchData();
  }

  const openEdit = (item: any) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  return (
    <main className="main-content" style={{ padding: "2rem", width: "100%" }}>
      <h1 className="page-title" style={{ marginBottom: "0.25rem" }}>
        📈 Quản lý Tăng/Giảm lương
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Theo dõi và phê duyệt các đề xuất thay đổi bậc lương của nhân viên
      </p>

      <div className="card" style={{ padding: "1.5rem" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <div className="spinner" style={{ marginBottom: "1rem" }}></div>
            <p style={{ color: "#64748b" }}>Đang tải dữ liệu lương...</p>
          </div>
        ) : (
          <SalaryChangeTable 
            items={filteredItems} 
            onStatusChange={handleStatusChange}
            onEdit={openEdit}
            onAdd={() => { setEditingItem(null); setIsFormOpen(true); }}
            filters={filters}
            setFilters={setFilters}
            types={types}
            employees={employees}
            statuses={statuses}
            availableYears={availableYears}
            currentYear={currentYear}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {isFormOpen && (
        <SalaryChangeForm 
          onClose={() => { setIsFormOpen(false); setEditingItem(null); }}
          onSubmit={handleSubmit}
          initialData={editingItem}
        />
      )}
    </main>
  );
}
