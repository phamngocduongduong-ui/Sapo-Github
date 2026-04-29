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

  useRealTimeSync("salary-changes", items, setItems);
...
