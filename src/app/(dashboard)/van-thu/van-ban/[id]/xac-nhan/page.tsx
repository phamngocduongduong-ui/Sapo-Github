"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDocumentById, getDocumentConfirmations, getBranches } from "../../actions";
import { ArrowLeft, RefreshCw, Search, Users, CheckCircle2, FileText, Building2, Calendar } from "lucide-react";

export default function DocumentConfirmationDetailPage() {
  const params = useParams();
  const router = useRouter();
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
    <div style={{ padding: "1rem" }}>
      {/* Top Banner Header */}
      <div
        style={{
          backgroundColor: "#003466",
          color: "#ffffff",
          padding: "14px 20px",
          borderRadius: "8px 8px 0 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Users size={22} style={{ color: "#ff5c00" }} />
          <h1 style={{ fontSize: "16px", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            DANH SÁCH NGƯỜI DÙNG ĐÃ XÁC NHẬN ĐỌC VĂN BẢN
          </h1>
        </div>

        <button
          type="button"
          onClick={() => router.push("/van-thu/van-ban")}
          style={{
            backgroundColor: "#ffffff",
            color: "#003466",
            border: "none",
            padding: "6px 14px",
            borderRadius: "6px",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f1f5f9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
          }}
        >
          <ArrowLeft size={16} /> Quay lại Danh sách văn bản
        </button>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #cbd5e1",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          padding: "20px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        }}
      >
        {/* Document Info Card */}
        {document ? (
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "16px 20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={16} style={{ color: "#003466" }} />
                <span style={{ fontWeight: 700, color: "#64748b", fontSize: "13px" }}>Số văn bản:</span>
                <span style={{ fontWeight: 700, color: "#003466", fontSize: "14px" }}>{document.documentNumber}</span>
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

            <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "10px", marginTop: "10px" }}>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#003466", marginBottom: "4px" }}>
                {document.title}
              </div>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                Tổng số lượt đã xác nhận:{" "}
                <span
                  style={{
                    backgroundColor: "#e0f2fe",
                    color: "#0284c7",
                    padding: "2px 10px",
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
            <div style={{ padding: "1rem", textAlign: "center", color: "#64748b" }}>
              Đang tải thông tin văn bản...
            </div>
          )
        )}

        {/* Toolbar & Filter Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1 }}>
            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "280px", flex: 1, maxWidth: "400px" }}>
              <Search
                size={16}
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
              />
              <input
                type="text"
                className="input-doc"
                placeholder="Tìm theo tài khoản, họ tên, chi nhánh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", paddingLeft: "32px", fontSize: "13px" }}
              />
            </div>

            {/* Branch Filter */}
            <select
              className="select-filter-base"
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              style={{ padding: "6px 12px", fontSize: "13px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
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
            className="sapo-btn"
            style={{ backgroundColor: "#003466" }}
            onClick={loadData}
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>

        {/* Full Page Table */}
        <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
          <table className="base-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr
                style={{
                  backgroundColor: "#f1f5f9",
                  color: "#003466",
                  fontWeight: 700,
                  fontSize: "13px",
                  borderBottom: "2px solid #cbd5e1",
                }}
              >
                <th style={{ padding: "12px", width: "60px", textAlign: "center" }}>STT</th>
                <th style={{ padding: "12px", width: "160px" }}>Tài khoản</th>
                <th style={{ padding: "12px" }}>Họ tên nhân viên</th>
                <th style={{ padding: "12px", width: "180px", textAlign: "center" }}>Chi nhánh</th>
                <th style={{ padding: "12px", width: "200px", textAlign: "center" }}>Thời gian xác nhận</th>
                <th style={{ padding: "12px", width: "130px", textAlign: "center" }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "#64748b", fontSize: "14px" }}>
                    Đang tải danh sách xác nhận...
                  </td>
                </tr>
              ) : filteredConfirmations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "#64748b", fontSize: "14px" }}>
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
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <td style={{ textAlign: "center", padding: "12px", fontWeight: 600, color: "#64748b" }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: "12px", fontWeight: 700, color: "#003466" }}>{item.username}</td>
                    <td style={{ padding: "12px", fontWeight: 500, color: "#1e293b" }}>{item.employeeName || "-"}</td>
                    <td style={{ padding: "12px", textAlign: "center", fontWeight: 500, color: "#334155" }}>
                      {item.branch || "-"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center", fontSize: "13px", color: "#059669", fontWeight: 600 }}>
                      {formatDateTime(item.confirmedAt)}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
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
  );
}
