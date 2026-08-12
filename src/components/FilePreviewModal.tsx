"use client";

import React from "react";
import { Download, ExternalLink, X } from "lucide-react";

interface FilePreviewModalProps {
  file: {
    fileName: string;
    fileContent: string;
    name?: string;
  } | null;
  onClose: () => void;
}

export function openFileInNewTab(fileContent: string, fileName: string) {
  if (!fileContent) return;
  if (fileContent.startsWith("data:")) {
    try {
      const arr = fileContent.split(",");
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "";
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      return;
    } catch (e) {
      console.error("Failed to convert data URL to Blob", e);
    }
  }
  window.open(fileContent, "_blank");
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  if (!file || !file.fileContent) return null;

  const fileName = file.fileName || "Tệp đính kèm";
  const fileContent = file.fileContent;
  const isImage =
    fileContent.startsWith("data:image/") ||
    /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fileName);
  const isPdf =
    fileContent.startsWith("data:application/pdf") ||
    /\.pdf$/i.test(fileName);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "95%",
          maxWidth: "1000px",
          height: "90vh",
          maxHeight: "900px",
          background: "#ffffff",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8fafc"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
            <span style={{ fontSize: "18px" }}>📄</span>
            <span
              style={{
                fontWeight: 700,
                color: "#1e293b",
                fontSize: "15px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "500px"
              }}
              title={fileName}
            >
              {fileName} {file.name ? `(${file.name})` : ""}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => openFileInNewTab(fileContent, fileName)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                background: "#f1f5f9",
                color: "#334155",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <ExternalLink size={14} /> Mở cửa sổ mới
            </button>

            <a
              href={fileContent}
              download={fileName}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                background: "#2563eb",
                color: "#ffffff",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              <Download size={14} /> Tải xuống
            </a>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#64748b",
                padding: "4px 8px"
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            background: "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "auto",
            padding: "16px"
          }}
        >
          {isImage ? (
            <img
              src={fileContent}
              alt={fileName}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
              }}
            />
          ) : isPdf ? (
            <iframe
              src={fileContent}
              title={fileName}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: "8px",
                background: "#ffffff"
              }}
            />
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "#ffffff",
                padding: "40px",
                background: "#1e293b",
                borderRadius: "12px",
                maxWidth: "450px"
              }}
            >
              <p style={{ fontSize: "14px", marginBottom: "16px" }}>
                Trình duyệt không hỗ trợ xem trực tiếp định dạng tệp <strong>{fileName.split(".").pop()?.toUpperCase()}</strong>.
              </p>
              <a
                href={fileContent}
                download={fileName}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  background: "#2563eb",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontWeight: 600,
                  textDecoration: "none"
                }}
              >
                <Download size={16} /> Tải xuống tệp để xem
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
