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
      const today = new Date().toLocaleDateString("en-CA");
      const lastShownDate = localStorage.getItem("doc_modal_last_shown_date");

      if (lastShownDate === today) {
        return;
      }

      const docs = await getPendingDeployedDocuments();
      if (docs && docs.length > 0) {
        localStorage.setItem("doc_modal_last_shown_date", today);

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
      setPendingDocs((prev) => prev.slice(1));
    } catch (e: any) {
      alert(e.message || "Lỗi khi xác nhận đã đọc văn bản!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReadLater = () => {
    setIsConfirmedChecked(false);
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
    <div className="doc-modal-overlay">
      <div className="doc-modal-card">
        {/* Header Banner */}
        <div className="doc-modal-header">
          <div className="doc-modal-header-title">
            <AlertCircle size={22} style={{ color: "#ff5c00", flexShrink: 0 }} />
            <span>THÔNG BÁO VĂN BẢN QUAN TRỌNG</span>
          </div>
          {pendingDocs.length > 1 && (
            <span className="doc-modal-badge">
              {pendingDocs.length} văn bản mới
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="doc-modal-body">
          <div className="doc-info-box">
            <div className="doc-info-row">
              <span className="doc-info-label">Số văn bản:</span>
              <span className="doc-info-val-highlight">{currentDoc.documentNumber}</span>
            </div>
            <div className="doc-info-row">
              <span className="doc-info-label">Chi nhánh:</span>
              <span className="doc-info-val">{currentDoc.branch}</span>
            </div>
            <div className="doc-info-row">
              <span className="doc-info-label">Ngày hiệu lực:</span>
              <span className="doc-info-val-date">{formatDate(currentDoc.effectiveDate)}</span>
            </div>
          </div>

          <div style={{ marginBottom: "16px", textAlign: "center" }}>
            <h3 className="doc-title-text">
              {currentDoc.title}
            </h3>
            {currentDoc.note && (
              <p className="doc-note-text">
                {currentDoc.note}
              </p>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="doc-attachments-box">
              <span className="doc-attachments-label">
                Tệp đính kèm:
              </span>
              <div className="doc-attachments-list">
                {attachments.map((att: any, idx: number) => {
                  const displayName = att.name || att.fileName || `Tệp đính kèm ${idx + 1}`;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleViewOrDownloadFile(att)}
                      className="doc-attachment-item"
                      title="Click để xem hoặc tải tệp đính kèm"
                    >
                      <FileText size={18} style={{ color: "#0284c7", flexShrink: 0 }} />
                      <span className="doc-attachment-name">{displayName}</span>
                      <Download size={15} style={{ marginLeft: "4px", color: "#0284c7", flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Confirmation Bar */}
        <div className="doc-modal-footer">
          <label className="doc-checkbox-label">
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

          <div className="doc-footer-buttons">
            <button
              type="button"
              onClick={handleReadLater}
              className="btn-read-later"
            >
              Đọc sau
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isConfirmedChecked || isSubmitting}
              className={`btn-confirm ${isConfirmedChecked ? "active" : "disabled"}`}
            >
              {isSubmitting ? "Đang lưu..." : "Xác nhận & Lưu"}
            </button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .doc-modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background-color: rgba(15, 23, 42, 0.75) !important;
          backdrop-filter: blur(4px) !important;
          z-index: 99999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 1rem !important;
          box-sizing: border-box !important;
        }

        .doc-modal-card {
          background-color: #ffffff !important;
          border-radius: 12px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
          width: 100% !important;
          max-width: 620px !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          max-height: 90vh !important;
          border: 1px solid #cbd5e1 !important;
          margin: 0 auto !important;
        }

        .doc-modal-header {
          background-color: #003466 !important;
          color: #ffffff !important;
          padding: 14px 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          border-bottom: 3px solid #ff5c00 !important;
          gap: 12px !important;
        }

        .doc-modal-header-title {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          font-weight: 700 !important;
          font-size: 15px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }

        .doc-modal-badge {
          font-size: 12px !important;
          background-color: #ff5c00 !important;
          color: #ffffff !important;
          padding: 2px 10px !important;
          border-radius: 12px !important;
          font-weight: 600 !important;
          white-space: nowrap !important;
        }

        .doc-modal-body {
          padding: 20px !important;
          overflow-y: auto !important;
          flex: 1 !important;
        }

        .doc-info-box {
          background-color: #f8fafc !important;
          padding: 14px 16px !important;
          border-radius: 8px !important;
          border: 1px solid #e2e8f0 !important;
          margin-bottom: 16px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 8px !important;
        }

        .doc-info-row {
          display: flex !important;
          gap: 12px !important;
          align-items: center !important;
        }

        .doc-info-label {
          font-weight: 700 !important;
          color: #64748b !important;
          min-width: 100px !important;
          font-size: 13px !important;
        }

        .doc-info-val-highlight {
          font-weight: 700 !important;
          color: #003466 !important;
          font-size: 14px !important;
        }

        .doc-info-val {
          font-weight: 600 !important;
          color: #1e293b !important;
          font-size: 13px !important;
        }

        .doc-info-val-date {
          font-weight: 600 !important;
          color: #059669 !important;
          font-size: 13px !important;
        }

        .doc-title-text {
          font-size: 15px !important;
          font-weight: 700 !important;
          color: #003466 !important;
          margin-bottom: 8px !important;
          line-height: 1.5 !important;
          text-align: center !important;
        }

        .doc-note-text {
          font-size: 13px !important;
          color: #475569 !important;
          line-height: 1.6 !important;
          white-space: pre-wrap !important;
          background: #f1f5f9 !important;
          padding: 12px !important;
          border-radius: 6px !important;
          text-align: left !important;
        }

        .doc-attachments-box {
          margin-top: 16px !important;
          border-top: 1px dashed #cbd5e1 !important;
          padding-top: 12px !important;
        }

        .doc-attachments-label {
          font-size: 13px !important;
          font-weight: 700 !important;
          color: #003466 !important;
          display: block !important;
          margin-bottom: 8px !important;
          text-align: center !important;
        }

        .doc-attachments-list {
          display: flex !important;
          flex-direction: column !important;
          gap: 8px !important;
          align-items: center !important;
        }

        .doc-attachment-item {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          font-size: 13px !important;
          color: #0284c7 !important;
          background-color: #f0f9ff !important;
          padding: 8px 14px !important;
          border-radius: 6px !important;
          border: 1px solid #bae6fd !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          user-select: none !important;
          transition: all 0.15s ease !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        .doc-attachment-item:hover {
          background-color: #e0f2fe !important;
          border-color: #7dd3fc !important;
        }

        .doc-attachment-name {
          text-decoration: underline !important;
          font-weight: 600 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }

        .doc-modal-footer {
          background-color: #f1f5f9 !important;
          padding: 14px 20px !important;
          border-top: 1px solid #e2e8f0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 12px !important;
        }

        .doc-checkbox-label {
          display: inline-flex !important;
          align-items: center !important;
          gap: 8px !important;
          cursor: pointer !important;
          user-select: none !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #1e293b !important;
        }

        .doc-footer-buttons {
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
        }

        .btn-read-later {
          background-color: #64748b !important;
          color: #ffffff !important;
          border: none !important;
          padding: 8px 18px !important;
          border-radius: 6px !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }

        .btn-confirm {
          border: none !important;
          padding: 8px 20px !important;
          border-radius: 6px !important;
          font-weight: 700 !important;
          font-size: 13px !important;
          transition: all 0.2s ease !important;
        }
        .btn-confirm.active {
          background-color: #003466 !important;
          color: #ffffff !important;
          cursor: pointer !important;
        }
        .btn-confirm.disabled {
          background-color: #94a3b8 !important;
          color: #ffffff !important;
          cursor: not-allowed !important;
        }

        /* 📱 MOBILE RESPONSIVE (≤640px) */
        @media (max-width: 640px) {
          .doc-modal-overlay {
            padding: 0.5rem !important;
          }
          .doc-modal-card {
            max-height: 94vh !important;
            border-radius: 10px !important;
          }
          .doc-modal-header {
            flex-direction: column !important;
            text-align: center !important;
            padding: 12px 14px !important;
            gap: 6px !important;
          }
          .doc-modal-header-title {
            justify-content: center !important;
            font-size: 13px !important;
            text-align: center !important;
          }
          .doc-modal-body {
            padding: 14px !important;
          }
          .doc-info-box {
            align-items: center !important;
            text-align: center !important;
            padding: 10px 12px !important;
          }
          .doc-info-row {
            justify-content: center !important;
            width: 100% !important;
          }
          .doc-info-label {
            min-width: auto !important;
          }
          .doc-attachment-item {
            width: 100% !important;
            justify-content: center !important;
          }
          .doc-modal-footer {
            flex-direction: column !important;
            padding: 12px 14px !important;
            gap: 12px !important;
            align-items: center !important;
          }
          .doc-checkbox-label {
            justify-content: center !important;
            width: 100% !important;
            font-size: 13.5px !important;
          }
          .doc-footer-buttons {
            width: 100% !important;
            justify-content: center !important;
            gap: 10px !important;
          }
          .btn-read-later, .btn-confirm {
            flex: 1 !important;
            text-align: center !important;
            padding: 10px 12px !important;
            font-size: 13px !important;
          }
        }
      ` }} />
    </div>
  );
}
