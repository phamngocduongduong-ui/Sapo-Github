"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useParams } from "next/navigation";
import { getDocumentById, getDocumentConfirmations, getBranches } from "@/app/(dashboard)/van-thu/van-ban/actions";
import { RefreshCw, Search, Users, CheckCircle2, FileText, Building2, Calendar, Printer, X } from "lucide-react";

export default function StandaloneDocumentConfirmationPage() {
  const params = useParams();
  const documentId = params?.id as string;

  const [document, setDocument] = useState<any>(null);
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadData = () => {
    if (!documentId) return;
    setIsLoading(true);
    startTransition(async () => {
      try {
        const [docData, confirmData, branchData] = await Promise.all([
          getDocumentById(documentId),
          getDocumentConfirmations(documentId),
          getBranches(),
        ]);
        setDocument(docData);
        setConfirmations(confirmData || []);
        setBranches(branchData || []);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu xác nhận văn bản:", error);
      } finally {
        setIsLoading(false);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, [documentId]);

  const formatDate = (dateInput: any) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
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

  const filteredConfirmations = confirmations.filter((item) => {
    const matchesSearch =
      (item.username && item.username.toLowerCase().includes(search.toLowerCase())) ||
      (item.employeeName && item.employeeName.toLowerCase().includes(search.toLowerCase())) ||
      (item.branch && item.branch.toLowerCase().includes(search.toLowerCase()));

    const matchesBranch = selectedBranchFilter
      ? item.branch && item.branch.toLowerCase().includes(selectedBranchFilter.toLowerCase())
      : true;

    return matchesSearch && matchesBranch;
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f1f5f9",
        color: "#1e293b",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        padding: "20px",
      }}
    >
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background-color: #fff !important; padding: 0 !important; }
          .print-card { border: none !important; box-shadow: none !important; }
        }
      `}</style>

      <div
        className="print-card"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
          border: "1px solid #cbd5e1",
        }}
      >
        {/* Top Standalone Banner */}
        <div
          style={{
            backgroundColor: "#003466",
            color: "#ffffff",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "4px solid #ff5c00",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Users size={24} style={{ color: "#ff5c00" }} />
            <div>
              <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                DANH SÁCH NGƯỜI DÙNG ĐÃ XÁC NHẬN ĐỌC VĂN BẢN
              </h1>
              <span style={{ fontSize: "12px", opacity: 0.8 }}>Hệ thống Quản lý Văn thư SAPO</span>
            </div>
          </div>

          <div className="no-print" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                padding: "6px 14px",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <Printer size={15} /> In danh sách
            </button>

            <button
              type="button"
              onClick={() => window.close()}
              style={{
                backgroundColor: "#ef4444",
                color: "#ffffff",
                border: "none",
                padding: "6px 14px",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <X size={16} /> Đóng cửa sổ
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px" }}>
          {/* Document Details Header Box */}
          {document ? (
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "18px 20px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={16} style={{ color: "#003466" }} />
                  <span style={{ fontWeight: 700, color: "#64748b", fontSize: "13px" }}>Số văn bản:</span>
                  <span style={{ fontWeight: 700, color: "#003466", fontSize: "15px" }}>{document.documentNumber}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Calendar size={16} style={{ color: "#059669" }} />
                  <span style={{ fontWeight: 700, color: "#64748b", fontSize: "13px" }}>Ngày hiệu lực:</span>
                  <span style={{ fontWeight: 600, color: "#059669", fontSize: "13px" }}>{formatDate(document.effectiveDate)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Building2 size={16} style={{ color: "#ea580c" }} />
                  <span style={{ fontWeight: 700, color: "#64748b", fontSize: "13px" }}>Chi nhánh áp dụng:</span>
                  <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "13px" }}>{document.branch}</span>
                </div>
              </div>

              <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "12px" }}>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#003466", marginBottom: "6px", lineHeight: "1.4" }}>
                  {document.title}
                </div>
                <div style={{ fontSize: "13px", color: "#475569" }}>
                  Tổng số lượt đã xác nhận:{" "}
                  <span
                    style={{
                      backgroundColor: "#e0f2fe",
                      color: "#0284c7",
                      padding: "3px 12px",
                      borderRadius: "12px",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    {confirmations.length} người dùng
                  </span>
                </div>
              </div>
            </div>
          ) : (
            isLoading && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                Đang tải thông tin văn bản...
              </div>
            )
          )}

          {/* Search and Filters Bar */}
          <div
            className="no-print"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, flexWrap: "wrap" }}>
              <div style={{ position: "relative", minWidth: "280px", flex: 1, maxWidth: "420px" }}>
                <Search
                  size={16}
                  style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  placeholder="Tìm theo tài khoản, họ tên, chi nhánh..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 34px",
                    fontSize: "13px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    outline: "none",
                  }}
                />
              </div>

              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  fontSize: "13px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  outline: "none",
                }}
              >
                <option value="">-- Tất cả chi nhánh --</option>
                {branches.map((b) => (
                  <option key={b.id || b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={loadData}
              style={{
                backgroundColor: "#003466",
                color: "#ffffff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>

          {/* Table of Confirmed Users */}
          <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f1f5f9",
                    color: "#003466",
                    fontWeight: 700,
                    borderBottom: "2px solid #cbd5e1",
                  }}
                >
                  <th style={{ padding: "12px", width: "50px", textAlign: "center", whiteSpace: "nowrap" }}>STT</th>
                  <th style={{ padding: "12px", width: "160px", whiteSpace: "nowrap" }}>Tài khoản</th>
                  <th style={{ padding: "12px", minWidth: "240px" }}>Họ tên nhân viên</th>
                  <th style={{ padding: "12px", width: "160px", textAlign: "center", whiteSpace: "nowrap" }}>Chi nhánh</th>
                  <th style={{ padding: "12px", width: "180px", textAlign: "center", whiteSpace: "nowrap" }}>Thời gian xác nhận</th>
                  <th style={{ padding: "12px", width: "140px", textAlign: "center", whiteSpace: "nowrap" }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                      Đang tải danh sách xác nhận...
                    </td>
                  </tr>
                ) : filteredConfirmations.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                      {search || selectedBranchFilter
                        ? "Không tìm thấy người dùng nào phù hợp với bộ lọc."
                        : "Chưa có người dùng nào xác nhận đã đọc văn bản này."}
                    </td>
                  </tr>
                ) : (
                  filteredConfirmations.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                      }}
                    >
                      <td style={{ textAlign: "center", padding: "12px", fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "12px", fontWeight: 700, color: "#003466", whiteSpace: "nowrap" }}>{item.username}</td>
                      <td style={{ padding: "12px", fontWeight: 500, color: "#1e293b" }}>{item.employeeName || "-"}</td>
                      <td style={{ padding: "12px", textAlign: "center", fontWeight: 500, color: "#334155", whiteSpace: "nowrap" }}>
                        {item.branch || "-"}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", fontSize: "13px", color: "#059669", fontWeight: 600, whiteSpace: "nowrap" }}>
                        {formatDateTime(item.confirmedAt)}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            backgroundColor: "#dcfce7",
                            color: "#166534",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle2 size={13} /> Đã xác nhận
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
