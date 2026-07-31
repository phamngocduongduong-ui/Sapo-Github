"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getDocuments,
  getBranches,
  createDocument,
  updateDocument,
  updateDocumentStatus,
  toggleDocumentDeployment,
  deleteDocument,
  getDocumentConfirmations,
} from "./actions";
import HistoryModal from "../../HistoryModal";
import { Search, Plus, Trash2, Edit3, Eye, FileText, Download, CheckCircle, XCircle, ChevronDown, Send, Users } from "lucide-react";

export default function DocumentPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  
  // Filters and search
  const [search, setSearch] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");
  
  const [isPending, startTransition] = useTransition();
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Row selection
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = items.find((item) => item.id === selectedItemId) || null;

  // History modal & Pop-up Confirmation Modal
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [confirmationModalItem, setConfirmationModalItem] = useState<any>(null);
  const [confirmationsList, setConfirmationsList] = useState<any[]>([]);
  const [isLoadingConfirmations, setIsLoadingConfirmations] = useState(false);
  const [confirmationSearch, setConfirmationSearch] = useState("");

  // Form states
  const [formDocumentNumber, setFormDocumentNumber] = useState("");
  const [formDraftDate, setFormDraftDate] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [formEffectiveDate, setFormEffectiveDate] = useState("");
  const [formStatus, setFormStatus] = useState("Còn hiệu lực");
  const [formIsDeployed, setFormIsDeployed] = useState(false);
  const [formNote, setFormNote] = useState("");
  const [attachmentList, setAttachmentList] = useState<
    Array<{ name: string; fileName: string; fileContent: string }>
  >([]);

  const branchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    fetchBranches();
    fetch("/api/user-permissions")
      .then((res) => res.json())
      .then((data) => setIsAdmin(data.isAdmin || false))
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsBranchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function fetchData() {
    const data = await getDocuments();
    setItems(data);
  }

  async function fetchBranches() {
    const bList = await getBranches();
    setBranches(bList);
  }

  const formatDate = (dateInput: any) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateForInput = (dateInput: any) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const formatDateTime = (dateInput: any) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const handleOpenConfirmationsModal = (item: any) => {
    setConfirmationModalItem(item);
    setConfirmationSearch("");
    setIsLoadingConfirmations(true);
    startTransition(async () => {
      try {
        const list = await getDocumentConfirmations(item.id);
        setConfirmationsList(list || []);
      } catch (err: any) {
        console.error("Lỗi khi tải danh sách xác nhận:", err);
      } finally {
        setIsLoadingConfirmations(false);
      }
    });
  };

  const isStatusActive = (status: string) => {
    return status === "Còn hiệu lực" || status === "Hiệu lực";
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.documentNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.branch.toLowerCase().includes(search.toLowerCase()) ||
      (item.note && item.note.toLowerCase().includes(search.toLowerCase()));

    const matchesBranch = selectedBranchFilter
      ? item.branch.toLowerCase().includes(selectedBranchFilter.toLowerCase())
      : true;

    const matchesStatus = selectedStatusFilter
      ? selectedStatusFilter === "Còn hiệu lực"
        ? isStatusActive(item.status)
        : !isStatusActive(item.status)
      : true;

    return matchesSearch && matchesBranch && matchesStatus;
  })
    .sort((a, b) => {
      const timeA = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0;
      const timeB = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0;
      return timeB - timeA;
    });

  const openAddModal = () => {
    const today = new Date().toISOString().split("T")[0];
    setEditingItem(null);
    setIsViewOnly(false);
    setSelectedItemId(null);
    setFormDocumentNumber("");
    setFormDraftDate(today);
    setFormTitle("");
    setSelectedBranches(branches.length > 0 ? branches.map((b) => b.name) : []);
    setIsBranchDropdownOpen(false);
    setFormEffectiveDate(today);
    setFormStatus("Còn hiệu lực");
    setFormIsDeployed(false);
    setFormNote("");
    setAttachmentList([]);
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setIsViewOnly(false);
    setFormDocumentNumber(item.documentNumber || "");
    setFormDraftDate(formatDateForInput(item.draftDate));
    setFormTitle(item.title || "");
    
    // Parse branch list
    if (item.branch) {
      const bArr = item.branch.split(",").map((s: string) => s.trim()).filter(Boolean);
      setSelectedBranches(bArr);
    } else {
      setSelectedBranches([]);
    }
    setIsBranchDropdownOpen(false);

    setFormEffectiveDate(formatDateForInput(item.effectiveDate));
    setFormStatus(item.status || "Còn hiệu lực");
    setFormIsDeployed(item.isDeployed || false);
    setFormNote(item.note || "");
    
    // Parse attachments JSON
    let parsedAttachments: any[] = [];
    if (item.attachments) {
      try {
        parsedAttachments = JSON.parse(item.attachments);
      } catch (e) {
        console.error("Failed to parse attachments:", e);
      }
    }
    setAttachmentList(parsedAttachments);
    setIsModalOpen(true);
  };

  const openViewModal = (item: any) => {
    setEditingItem(item);
    setIsViewOnly(true);
    setFormDocumentNumber(item.documentNumber || "");
    setFormDraftDate(formatDateForInput(item.draftDate));
    setFormTitle(item.title || "");
    
    if (item.branch) {
      const bArr = item.branch.split(",").map((s: string) => s.trim()).filter(Boolean);
      setSelectedBranches(bArr);
    } else {
      setSelectedBranches([]);
    }
    setIsBranchDropdownOpen(false);

    setFormEffectiveDate(formatDateForInput(item.effectiveDate));
    setFormStatus(item.status || "Còn hiệu lực");
    setFormIsDeployed(item.isDeployed || false);
    setFormNote(item.note || "");

    let parsedAttachments: any[] = [];
    if (item.attachments) {
      try {
        parsedAttachments = JSON.parse(item.attachments);
      } catch (e) {
        console.error("Failed to parse attachments:", e);
      }
    }
    setAttachmentList(parsedAttachments);
    setIsModalOpen(true);
  };

  const toggleBranchSelection = (branchName: string) => {
    if (selectedBranches.includes(branchName)) {
      setSelectedBranches(selectedBranches.filter((b) => b !== branchName));
    } else {
      setSelectedBranches([...selectedBranches, branchName]);
    }
  };

  const toggleSelectAllBranches = () => {
    if (selectedBranches.length === branches.length) {
      setSelectedBranches([]);
    } else {
      setSelectedBranches(branches.map((b) => b.name));
    }
  };

  const handleToggleDeployment = (item: any) => {
    const nextState = !item.isDeployed;
    const confirmMsg = nextState
      ? `Bạn có chắc chắn muốn TRIỂN KHAI thông báo văn bản "${item.documentNumber}" tới toàn bộ người dùng thuộc chi nhánh?`
      : `Bạn có chắc chắn muốn HỦY TRIỂN KHAI thông báo văn bản "${item.documentNumber}"?`;

    if (!window.confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        await toggleDocumentDeployment(item.id, nextState);
        await fetchData();
      } catch (err: any) {
        alert(err.message || "Lỗi khi cập nhật trạng thái triển khai!");
      }
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isViewOnly) return;
    if (selectedBranches.length === 0) {
      alert("Vui lòng chọn ít nhất một chi nhánh!");
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set("branch", selectedBranches.join(", "));
    formData.set("attachments", JSON.stringify(attachmentList));
    formData.set("status", formStatus || "Còn hiệu lực");
    formData.set("isDeployed", formIsDeployed ? "true" : "false");

    startTransition(async () => {
      try {
        if (editingItem) {
          await updateDocument(editingItem.id, formData);
        } else {
          await createDocument(formData);
        }
        setIsModalOpen(false);
        setSelectedItemId(null);
        fetchData();
      } catch (err: any) {
        alert(err.message || "Đã xảy ra lỗi khi lưu văn bản!");
      }
    });
  };

  const handleStatusToggle = (item: any) => {
    const active = isStatusActive(item.status);
    const newStatus = active ? "Hủy hiệu lực" : "Còn hiệu lực";
    const confirmMsg = active
      ? `Bạn có chắc chắn muốn HỦY HIỆU LỰC văn bản "${item.documentNumber}" không?`
      : `Bạn có chắc chắn muốn KÍCH HOẠT LẠI hiệu lực cho văn bản "${item.documentNumber}" không?`;

    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      try {
        await updateDocumentStatus(item.id, newStatus);
        setSelectedItemId(null);
        fetchData();
      } catch (err: any) {
        alert(err.message || "Đã xảy ra lỗi khi cập nhật trạng thái!");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa văn bản này không?")) return;
    startTransition(async () => {
      try {
        await deleteDocument(id);
        setSelectedItemId(null);
        fetchData();
      } catch (err: any) {
        alert(err.message || "Đã xảy ra lỗi khi xóa văn bản!");
      }
    });
  };

  const getBranchDisplayText = () => {
    if (selectedBranches.length === 0) return "-- Chọn chi nhánh --";
    if (branches.length > 0 && selectedBranches.length === branches.length) {
      return `Tất cả chi nhánh (${branches.length})`;
    }
    return selectedBranches.join(", ");
  };

  return (
    <div className="employee-page-container">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .employee-page-container {
          width: 100%;
          min-width: 0;
        }
        .employee-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px 10px 0px;
        }
        .employee-layout input,
        .employee-layout select,
        .employee-layout textarea,
        .employee-layout button,
        .employee-layout table,
        .employee-layout td,
        .employee-layout th,
        .employee-layout label,
        .employee-layout .badge,
        .employee-page-container .breadcrumb-banner {
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
        .row-hoverable:hover {
          background-color: #f8fafc;
        }
        .row-selected {
          background-color: #eff6ff !important;
        }
        .row-selected td {
          border-top: 1px solid #cbd5e1 !important;
          border-bottom: 1px solid #cbd5e1 !important;
        }
        .base-table-wrapper {
          height: auto !important;
          min-height: unset !important;
          overflow-y: hidden !important;
          padding-bottom: 0px !important;
          overflow-x: auto !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          min-width: 1100px !important;
          table-layout: auto !important;
        }
        .base-table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          background: #f1f5f9 !important;
          border-bottom: 2px solid #ff5c00 !important;
          border-right: 1px solid #cbd5e1 !important;
          text-align: center !important;
          vertical-align: middle !important;
          padding: 6px 4px !important;
          white-space: normal !important;
          word-break: break-word !important;
          line-height: 1.2 !important;
        }
        .base-table th:last-child {
          border-right: none !important;
        }
        .base-table td {
          padding: 6px 0.75rem !important;
          vertical-align: middle !important;
          color: #000 !important;
          font-weight: 600 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-right: 1px solid #e2e8f0 !important;
        }
        .base-table td:last-child {
          border-right: none !important;
        }
        .base-table tbody tr {
          height: 45px !important;
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
        .select-filter-base {
          padding: 6px 10px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          outline: none !important;
          font-weight: 500 !important;
          background-color: #fff !important;
          color: #1e293b !important;
          height: 32px !important;
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
        .modal-content-document {
          background: #ffffff;
          border-radius: 12px;
          width: 100%;
          max-width: 650px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
        }
        .modal-header-document {
          background: #003466;
          color: #ffffff;
          padding: 12px 20px;
          font-weight: 700;
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-body-document {
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .form-row-2 {
          display: flex;
          gap: 12px;
          width: 100%;
        }
        .form-group-doc {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .form-group-doc label {
          font-weight: 700;
          color: #003466;
          text-transform: uppercase;
          font-size: 12px !important;
        }
        .input-doc {
          width: 100%;
          height: 32px;
          padding: 4px 10px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          outline: none;
          color: #000;
          background: #fff;
          transition: border-color 0.2s;
        }
        .input-doc:focus {
          border-color: #ff5c00;
        }
        .input-doc:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
        }
        textarea.input-doc {
          height: auto;
          padding: 8px 10px;
        }

        /* Custom Multi-select Dropdown */
        .custom-multiselect-container {
          position: relative;
          width: 100%;
        }
        .custom-multiselect-trigger {
          width: 100%;
          height: 32px;
          padding: 4px 10px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          background: #fff;
          color: #000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          user-select: none;
          box-sizing: border-box;
        }
        .custom-multiselect-trigger.disabled {
          background: #f1f5f9;
          cursor: not-allowed;
        }
        .custom-multiselect-menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          max-height: 180px;
          overflow-y: auto;
          z-index: 10000;
          margin-top: 4px;
          padding: 4px 0;
        }
        .custom-multiselect-item {
          display: flex;
          align-items: center;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
          cursor: pointer;
          user-select: none;
          gap: 10px;
        }
        .custom-multiselect-item:hover {
          background-color: #f1f5f9;
        }
        .custom-multiselect-item input[type="checkbox"] {
          margin: 0;
          cursor: pointer;
        }

        .modal-footer-document {
          padding: 12px 20px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          background: #f8fafc;
        }
        .status-badge-active {
          color: #166534;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .status-badge-inactive {
          color: #dc2626;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      `,
        }}
      />

      <div className="breadcrumb-banner">DANH SÁCH VĂN BẢN</div>

      <div className="employee-layout">
        <div className="panel-full">
          {/* Action Toolbar */}
          <div className="search-container">
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" className="sapo-btn" onClick={openAddModal}>
                Thêm mới
              </button>

              {selectedItem && (
                <>
                  <button type="button" className="sapo-btn" onClick={() => openViewModal(selectedItem)}>
                    Xem chi tiết
                  </button>
                  <button type="button" className="sapo-btn" onClick={() => openEditModal(selectedItem)}>
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="sapo-btn"
                    style={{
                      backgroundColor: isStatusActive(selectedItem.status) ? "#dc2626" : "#166534",
                    }}
                    onClick={() => handleStatusToggle(selectedItem)}
                  >
                    {isStatusActive(selectedItem.status) ? "Hủy hiệu lực" : "Kích hoạt hiệu lực"}
                  </button>
                  <button
                    type="button"
                    className="sapo-btn"
                    style={{
                      backgroundColor: selectedItem.isDeployed ? "#ea580c" : "#0284c7",
                    }}
                    onClick={() => handleToggleDeployment(selectedItem)}
                  >
                    <Send size={14} />
                    {selectedItem.isDeployed ? "Hủy triển khai" : "Triển khai thông báo"}
                  </button>
                  <button
                    type="button"
                    className="sapo-btn"
                    style={{ backgroundColor: "#0284c7" }}
                    onClick={() => handleOpenConfirmationsModal(selectedItem)}
                  >
                    <Users size={14} /> Xem xác nhận
                  </button>
                  <button
                    type="button"
                    className="sapo-btn"
                    style={{ backgroundColor: "#ef4444" }}
                    onClick={() => handleDelete(selectedItem.id)}
                  >
                    Xóa
                  </button>
                  <button type="button" className="sapo-btn" onClick={() => setHistoryRecordId(selectedItem.id)}>
                    Lịch sử
                  </button>
                </>
              )}
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              {/* Branch Filter */}
              <select
                className="select-filter-base"
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
              >
                <option value="">-- Tất cả chi nhánh --</option>
                {branches.map((b) => (
                  <option key={b.id || b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                className="select-filter-base"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
              >
                <option value="">-- Tất cả trạng thái --</option>
                <option value="Còn hiệu lực">Còn hiệu lực</option>
                <option value="Hủy hiệu lực">Hủy hiệu lực</option>
              </select>

              {/* Search Box */}
              <div className="search-box-base">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo số, tên văn bản..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <button className="sapo-btn" onClick={fetchData}>
                Làm mới
              </button>
            </div>
          </div>

          {/* Main Table */}
          <div className="base-table-wrapper" style={filteredItems.length === 0 ? { height: "auto" } : undefined}>
            <table className="base-table">
              <thead>
                <tr>
                  <th className="th-first" style={{ width: "50px", textAlign: "center" }}>
                    STT
                  </th>
                  <th style={{ width: "110px" }}>Số văn bản</th>
                  <th style={{ width: "85px", textAlign: "center" }}>Ngày soạn</th>
                  <th style={{ width: "405px" }}>Tên văn bản</th>
                  <th style={{ width: "110px", textAlign: "center" }}>Chi nhánh</th>
                  <th style={{ width: "95px", textAlign: "center" }}>Ngày hiệu lực</th>
                  <th style={{ width: "75px", textAlign: "center" }}>Tải</th>
                  <th className="th-last" style={{ width: "130px", textAlign: "center" }}>
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                      Không tìm thấy văn bản nào
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isSelected = selectedItemId === item.id;
                    let attachments: any[] = [];
                    if (item.attachments) {
                      try {
                        attachments = JSON.parse(item.attachments);
                      } catch (e) {}
                    }

                    const active = isStatusActive(item.status);

                    return (
                      <tr
                        key={item.id}
                        className={`row-hoverable ${isSelected ? "row-selected" : ""}`}
                        onClick={() => setSelectedItemId(item.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ color: "#003466", fontWeight: 700 }}>{item.documentNumber}</td>
                        <td style={{ textAlign: "center" }}>{formatDate(item.draftDate)}</td>
                        <td
                          title={item.title}
                          style={{
                            maxWidth: "405px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.title}
                        </td>
                        <td
                          title={item.branch}
                          style={{
                            maxWidth: "110px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "center",
                          }}
                        >
                          {item.branch}
                        </td>
                        <td style={{ textAlign: "center" }}>{formatDate(item.effectiveDate)}</td>
                        <td style={{ textAlign: "center" }}>
                          {attachments && attachments.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                              {attachments.map((att: any, attIdx: number) => (
                                <div
                                  key={attIdx}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    fontSize: "12px",
                                  }}
                                >
                                  {att.fileContent ? (
                                    <a
                                      href={att.fileContent}
                                      download={att.fileName || `${item.documentNumber}.pdf`}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        color: "#2563eb",
                                        textDecoration: "underline",
                                        fontWeight: 600,
                                        fontSize: "12px",
                                      }}
                                    >
                                      Tải PDF
                                    </a>
                                  ) : (
                                    <span style={{ color: "#94a3b8" }}>Không có</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontWeight: 400 }}>Không có</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                            {active ? (
                              <span className="status-badge-active">
                                <CheckCircle size={14} /> Còn hiệu lực
                              </span>
                            ) : (
                              <span className="status-badge-inactive">
                                <XCircle size={14} /> Hủy hiệu lực
                              </span>
                            )}
                            {item.isDeployed && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  color: "#0284c7",
                                  backgroundColor: "#e0f2fe",
                                  border: "1px solid #bae6fd",
                                  padding: "1px 6px",
                                  borderRadius: "10px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                <Send size={10} /> Đã triển khai
                              </span>
                            )}
                          </div>
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

      {/* Add / Edit / View Modal */}
      {isModalOpen && (
        <div className="custom-modal-overlay">
          <div className="modal-content-document">
            <div className="modal-header-document">
              <span>
                {isViewOnly
                  ? "CHI TIẾT VĂN BẢN"
                  : editingItem
                  ? "CHỈNH SỬA VĂN BẢN"
                  : "THÊM MỚI VĂN BẢN"}
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "18px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <input type="hidden" name="status" value={formStatus || "Còn hiệu lực"} />

              <div className="modal-body-document">
                <div className="form-row-2">
                  <div className="form-group-doc">
                    <label>
                      Số văn bản <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="documentNumber"
                      className="input-doc"
                      required
                      value={formDocumentNumber}
                      onChange={(e) => setFormDocumentNumber(e.target.value)}
                      disabled={isViewOnly}
                      placeholder="VD: VB-2026/001"
                    />
                  </div>

                  <div className="form-group-doc">
                    <label>
                      Ngày soạn <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      type="date"
                      name="draftDate"
                      className="input-doc"
                      required
                      value={formDraftDate}
                      onChange={(e) => setFormDraftDate(e.target.value)}
                      disabled={isViewOnly}
                    />
                  </div>
                </div>

                <div className="form-group-doc">
                  <label>
                    Tên văn bản <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    className="input-doc"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    disabled={isViewOnly}
                    placeholder="Nhập tên văn bản..."
                  />
                </div>

                <div className="form-row-2">
                  {/* Multi-select Branch field */}
                  <div className="form-group-doc">
                    <label>
                      Chi nhánh <span style={{ color: "red" }}>*</span>
                    </label>
                    <div className="custom-multiselect-container" ref={branchDropdownRef}>
                      <div
                        className={`custom-multiselect-trigger ${isViewOnly ? "disabled" : ""}`}
                        onClick={() => {
                          if (!isViewOnly) setIsBranchDropdownOpen(!isBranchDropdownOpen);
                        }}
                      >
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "230px",
                          }}
                        >
                          {getBranchDisplayText()}
                        </span>
                        <ChevronDown size={14} color="#64748b" />
                      </div>

                      {isBranchDropdownOpen && !isViewOnly && (
                        <div className="custom-multiselect-menu">
                          {branches.length > 0 && (
                            <div
                              className="custom-multiselect-item"
                              style={{
                                borderBottom: "1px solid #e2e8f0",
                                fontWeight: 700,
                                color: "#003466",
                              }}
                              onClick={toggleSelectAllBranches}
                            >
                              <input
                                type="checkbox"
                                checked={selectedBranches.length === branches.length && branches.length > 0}
                                onChange={toggleSelectAllBranches}
                              />
                              <span>[Chọn tất cả chi nhánh]</span>
                            </div>
                          )}

                          {branches.map((b) => {
                            const isChecked = selectedBranches.includes(b.name);
                            return (
                              <div
                                key={b.id || b.name}
                                className="custom-multiselect-item"
                                onClick={() => toggleBranchSelection(b.name)}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleBranchSelection(b.name)}
                                />
                                <span>{b.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-group-doc">
                    <label>
                      Ngày hiệu lực <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      type="date"
                      name="effectiveDate"
                      className="input-doc"
                      required
                      value={formEffectiveDate}
                      onChange={(e) => setFormEffectiveDate(e.target.value)}
                      disabled={isViewOnly}
                    />
                  </div>
                </div>

                {/* Triển khai thông báo field */}
                <div
                  className="form-group-doc"
                  style={{
                    marginTop: "4px",
                    backgroundColor: "#f8fafc",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: isViewOnly ? "default" : "pointer",
                      margin: 0,
                      fontWeight: 700,
                      color: "#003466",
                      fontSize: "13px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formIsDeployed}
                      onChange={(e) => setFormIsDeployed(e.target.checked)}
                      disabled={isViewOnly}
                      style={{ width: "18px", height: "18px", accentColor: "#ff5c00", cursor: isViewOnly ? "default" : "pointer" }}
                    />
                    <span>Triển khai thông báo (Yêu cầu người dùng thuộc chi nhánh xác nhận khi đăng nhập/truy cập lần đầu)</span>
                  </label>
                </div>

                {/* PDF Attachments section */}
                <div className="form-group-doc" style={{ marginTop: "6px" }}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Tệp đính kèm (PDF mọi kích thước)</span>
                    {!isViewOnly && (
                      <button
                        type="button"
                        className="sapo-btn"
                        style={{ fontSize: "11px", padding: "3px 8px" }}
                        onClick={() => {
                          setAttachmentList([
                            ...attachmentList,
                            { name: "", fileName: "", fileContent: "" },
                          ]);
                        }}
                      >
                        + Thêm tệp PDF
                      </button>
                    )}
                  </label>

                  <div
                    style={{
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "8px",
                      background: "#f8fafc",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {attachmentList.length === 0 ? (
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        Chưa có tệp PDF nào được đính kèm.
                      </span>
                    ) : (
                      attachmentList.map((att, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            padding: "8px 12px",
                            background: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "6px",
                          }}
                        >
                          {!isViewOnly && (
                            <input
                              type="file"
                              accept=".pdf"
                              style={{ fontSize: "12px", flex: 1 }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.type !== "application/pdf") {
                                    alert("Vui lòng chỉ chọn tệp tin định dạng PDF.");
                                    e.target.value = "";
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    const content = evt.target?.result as string;
                                    const newList = [...attachmentList];
                                    newList[idx].fileName = file.name;
                                    newList[idx].name = file.name;
                                    newList[idx].fileContent = content;
                                    setAttachmentList(newList);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          )}

                          {att.fileName && (
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                              <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: 600 }}>
                                📄 {att.fileName}
                              </span>
                              {att.fileContent && (
                                <a
                                  href={att.fileContent}
                                  download={att.fileName}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    fontSize: "12px",
                                    color: "#2563eb",
                                    textDecoration: "underline",
                                    fontWeight: 600,
                                  }}
                                >
                                  Tải PDF
                                </a>
                              )}
                            </div>
                          )}

                          {!isViewOnly && (
                            <button
                              type="button"
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                setAttachmentList(attachmentList.filter((_, i) => i !== idx));
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="form-group-doc">
                  <label>Ghi chú</label>
                  <textarea
                    name="note"
                    className="input-doc"
                    rows={2}
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    disabled={isViewOnly}
                    placeholder="Ghi chú thêm..."
                  />
                </div>
              </div>

              <div className="modal-footer-document">
                <button
                  type="button"
                  className="sapo-btn"
                  style={{ backgroundColor: "#475569" }}
                  onClick={() => setIsModalOpen(false)}
                >
                  {isViewOnly ? "Đóng" : "Thoát"}
                </button>

                {!isViewOnly && (
                  <button type="submit" className="sapo-btn" disabled={isPending}>
                    {isPending ? "Đang lưu..." : "Lưu văn bản"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyRecordId && (
        <HistoryModal
          tableName="document"
          recordId={historyRecordId}
          onClose={() => setHistoryRecordId(null)}
        />
      )}

      {/* Pop-up Confirmation Modal Centered Viewport */}
      {confirmationModalItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              maxWidth: "700px",
              width: "90%",
              height: "85vh",
              maxHeight: "85vh",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                backgroundColor: "#003466",
                color: "#ffffff",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "3px solid #ff5c00",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px" }}>
                <Users size={20} style={{ color: "#ff5c00" }} />
                DANH SÁCH NGƯỜI DÙNG ĐÃ XÁC NHẬN ĐỌC VĂN BẢN
              </h3>
              <button
                type="button"
                style={{
                  color: "#ffffff",
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  lineHeight: 1,
                  cursor: "pointer",
                  opacity: 0.8,
                }}
                onClick={() => setConfirmationModalItem(null)}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              {/* Search bar inside modal */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={15} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input
                    type="text"
                    className="input-doc"
                    placeholder="Tìm theo tên nhân viên, chi nhánh..."
                    value={confirmationSearch}
                    onChange={(e) => setConfirmationSearch(e.target.value)}
                    style={{ width: "100%", paddingLeft: "32px", fontSize: "13px" }}
                  />
                </div>
              </div>

              {/* Table - Fits 100% within 700px modal screen */}
              <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", textAlign: "left" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    <tr style={{ background: "#f1f5f9", fontSize: "13px", color: "#003466", fontWeight: 700, borderBottom: "2px solid #cbd5e1" }}>
                      <th style={{ padding: "12px 6px", width: "8%", textAlign: "center", whiteSpace: "nowrap" }}>STT</th>
                      <th style={{ padding: "12px 10px", width: "34%", whiteSpace: "nowrap" }}>HỌ TÊN NHÂN VIÊN</th>
                      <th style={{ padding: "12px 10px", width: "24%", textAlign: "center", whiteSpace: "nowrap" }}>CHI NHÁNH</th>
                      <th style={{ padding: "12px 10px", width: "34%", textAlign: "center", whiteSpace: "nowrap" }}>THỜI GIAN XÁC NHẬN</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: "13px" }}>
                    {isLoadingConfirmations ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                          Đang tải dữ liệu xác nhận...
                        </td>
                      </tr>
                    ) : confirmationsList.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                          Chưa có người dùng nào xác nhận đã đọc văn bản này.
                        </td>
                      </tr>
                    ) : (
                      confirmationsList
                        .filter((c) => {
                          if (!confirmationSearch) return true;
                          const q = confirmationSearch.toLowerCase();
                          return (
                            (c.username && c.username.toLowerCase().includes(q)) ||
                            (c.employeeName && c.employeeName.toLowerCase().includes(q)) ||
                            (c.branch && c.branch.toLowerCase().includes(q))
                          );
                        })
                        .map((c, idx) => (
                          <tr key={c.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ textAlign: "center", padding: "12px 6px", width: "8%", fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>{idx + 1}</td>
                            <td style={{ padding: "12px 10px", width: "34%", fontWeight: 600, color: "#003466", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={c.employeeName || c.username}>
                              {c.employeeName || c.username || "-"}
                            </td>
                            <td style={{ padding: "12px 10px", width: "24%", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={c.branch}>
                              {c.branch || "-"}
                            </td>
                            <td style={{ padding: "12px 10px", width: "34%", textAlign: "center", fontSize: "13px", color: "#059669", fontWeight: 600, whiteSpace: "nowrap" }}>
                              {formatDateTime(c.confirmedAt)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "12px 24px",
                backgroundColor: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="sapo-btn"
                style={{ backgroundColor: "#475569", color: "#ffffff", padding: "8px 20px" }}
                onClick={() => setConfirmationModalItem(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
