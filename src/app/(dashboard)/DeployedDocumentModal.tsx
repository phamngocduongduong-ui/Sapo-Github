"use client";

import React, { useState, useEffect } from "react";
import { getPendingDeployedDocuments, confirmDocumentRead } from "./van-thu/van-ban/actions";
import { Download, FileText, AlertCircle } from "lucide-react";

export default function DeployedDocumentModal() {
  const [pendingDocs, setPendingDocs] = useState<any[]>([]);
  const [isConfirmedChecked, setIsConfirmedChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingDocs();
  }, []);

  const fetchPendingDocs = async () => {
    try {
      // Lấy ngày hiện tại dạng YYYY-MM-DD
      const today = new Date().toLocaleDateString("en-CA");
      const lastShownDate = localStorage.getItem("doc_modal_last_shown_date");

      // Nếu trong ngày hôm nay thông báo đã hiển thị 1 lần rồi thì không hiển thị lại
      if (lastShownDate === today) {
        return;
      }

      const docs = await getPendingDeployedDocuments();
      if (docs && docs.length > 0) {
        // Đánh dấu đã hiển thị 1 lần duy nhất trong ngày hôm nay
        localStorage.setItem("doc_modal_last_shown_date", today);

        // Sắp xếp giảm dần theo Ngày hiệu lực (ngày hiệu lực gần nhất lên đầu)
        const sortedDocs = [...docs].sort((a: any, b: any) => {
          const timeA = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0;
          const timeB = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0;
          return timeB - timeA;
        });
        setPendingDocs(sortedDocs);
      } else {
        setPendingDocs([]);
      }
    } catch (e) {
      console.error("Lỗi khi kiểm tra văn bản triển khai:", e);
    }
  };

  if (!pendingDocs || pendingDocs.length === 0) {
    return null;
  }

  const currentDoc = pendingDocs[0];

  let attachments: any[] = [];
  if (currentDoc.attachments) {
    try {
      attachments = JSON.parse(currentDoc.attachments);
    } catch (e) {
      console.error("Failed to parse attachments:", e);
    }
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

  const handleConfirm = async () => {
    if (!isConfirmedChecked || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await confirmDocumentRead(currentDoc.id);
      setIsConfirmedChecked(false);
      // Chuyển sang văn bản tiếp theo trong hàng đợi
      setPendingDocs((prev) => prev.slice(1));
    } catch (e: any) {
      alert(e.message || "Lỗi khi xác nhận đã đọc văn bản!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReadLater = () => {
    setIsConfirmedChecked(false);
    // Đóng toàn bộ thông báo ngày hôm nay
    setPendingDocs([]);
  };

  const handleViewOrDownloadFile = (att: any) => {
    const content = att.fileContent || att.url;
    if (!content) return;
    const fileName = att.fileName || att.name || `${currentDoc.documentNumber || "document"}.pdf`;

    if (content.startsWith("data:application/pdf") || content.startsWith("data:")) {
      try {
        const parts = content.split(",");
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : "application/pdf";
        const base64Data = parts[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        
        const win = window.open(blobUrl, "_blank");
        if (!win) {
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = fileName;
          a.click();
        }
        return;
      } catch (e) {
        console.error("Lỗi khi mở file PDF:", e);
      }
    }

    const win = window.open(content, "_blank");
    if (!win) {
      const a = document.createElement("a");
      a.href = content;
      a.download = fileName;
      a.click();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease-in-out",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          width: "100%",
          maxWidth: "650px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          border: "1px solid #cbd5e1",
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            backgroundColor: "#003466",
            color: "#ffffff",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "3px solid #ff5c00",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={22} style={{ color: "#ff5c00" }} />
            <span style={{ fontWeight: 700, fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Thông báo văn bản quan trọng
            </span>
          </div>
          {pendingDocs.length > 1 && (
            <span style={{ fontSize: "12px", backgroundColor: "#ff5c00", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
              {pendingDocs.length} văn bản mới
            </span>
          )}
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          <div
            style={{
              backgroundColor: "#f8fafc",
              padding: "14px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontWeight: 700, color: "#64748b", minWidth: "100px", fontSize: "13px" }}>Số văn bản:</span>
              <span style={{ fontWeight: 700, color: "#003466", fontSize: "14px" }}>{currentDoc.documentNumber}</span>
            </div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontWeight: 700, color: "#64748b", minWidth: "100px", fontSize: "13px" }}>Chi nhánh:</span>
              <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "13px" }}>{currentDoc.branch}</span>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <span style={{ fontWeight: 700, color: "#64748b", minWidth: "100px", fontSize: "13px" }}>Ngày hiệu lực:</span>
              <span style={{ fontWeight: 600, color: "#059669", fontSize: "13px" }}>{formatDate(currentDoc.effectiveDate)}</span>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#003466", marginBottom: "8px", lineHeight: "1.4" }}>
              {currentDoc.title}
            </h3>
            {currentDoc.note && (
              <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6", whiteSpace: "pre-wrap", background: "#f1f5f9", padding: "10px", borderRadius: "6px" }}>
                {currentDoc.note}
              </p>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div style={{ marginTop: "16px", borderTop: "1px dashed #cbd5e1", paddingTop: "12px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#003466", display: "block", marginBottom: "8px" }}>
                Tệp đính kèm:
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {attachments.map((att: any, idx: number) => {
                  const displayName = att.name || att.fileName || `Tệp đính kèm ${idx + 1}`;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleViewOrDownloadFile(att)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "13px",
                        color: "#0284c7",
                        backgroundColor: "#f0f9ff",
                        padding: "8px 14px",
                        borderRadius: "6px",
                        border: "1px solid #bae6fd",
                        fontWeight: 500,
                        width: "fit-content",
                        cursor: "pointer",
                        userSelect: "none",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#e0f2fe";
                        e.currentTarget.style.borderColor = "#7dd3fc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#f0f9ff";
                        e.currentTarget.style.borderColor = "#bae6fd";
                      }}
                      title="Click để xem hoặc tải tệp đính kèm"
                    >
                      <FileText size={18} style={{ color: "#0284c7" }} />
                      <span style={{ textDecoration: "underline", fontWeight: 600 }}>{displayName}</span>
                      <Download size={15} style={{ marginLeft: "4px", color: "#0284c7" }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Confirmation Bar */}
        <div
          style={{
            backgroundColor: "#f1f5f9",
            padding: "14px 20px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              userSelect: "none",
              fontSize: "14px",
              fontWeight: 600,
              color: "#1e293b",
            }}
          >
            <input
              type="checkbox"
              checked={isConfirmedChecked}
              onChange={(e) => setIsConfirmedChecked(e.target.checked)}
              style={{
                width: "18px",
                height: "18px",
                accentColor: "#ff5c00",
                cursor: "pointer",
              }}
            />
            <span>Đã đọc và xác nhận</span>
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleReadLater}
              style={{
                backgroundColor: "#64748b",
                color: "#ffffff",
                border: "none",
                padding: "8px 18px",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Đọc sau
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isConfirmedChecked || isSubmitting}
              style={{
                backgroundColor: isConfirmedChecked ? "#003466" : "#94a3b8",
                color: "#ffffff",
                border: "none",
                padding: "8px 20px",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "13px",
                cursor: isConfirmedChecked ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
              }}
            >
              {isSubmitting ? "Đang lưu..." : "Xác nhận & Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
