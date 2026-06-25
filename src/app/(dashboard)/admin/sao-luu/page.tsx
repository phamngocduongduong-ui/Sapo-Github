"use client";

import { useState, useTransition, useEffect } from "react";
import { exportDatabase, importDatabase } from "./actions";
import { Database, Download, Upload, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

export default function SaoLuuPage() {
  const [isPendingBackup, startBackupTransition] = useTransition();
  const [isPendingRestore, startRestoreTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // Handle auto-refresh countdown after successful restore
  const [countdown, setCountdown] = useState(3);
  const [showRestoreSuccessModal, setShowRestoreSuccessModal] = useState(false);

  useEffect(() => {
    if (!showRestoreSuccessModal) return;

    if (countdown === 0) {
      window.location.reload();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showRestoreSuccessModal, countdown]);

  // Handle database backup download
  const handleBackup = () => {
    setError(null);
    setSuccessMessage(null);

    startBackupTransition(async () => {
      const res = await exportDatabase();
      if (!res.success) {
        setError(res.error || "Không thể xuất dữ liệu. Vui lòng kiểm tra lại cấu hình CLI trên VPS.");
        return;
      }

      try {
        // Decode base64 to blob and trigger browser download
        const binaryString = window.atob(res.content!);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/sql" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = res.filename!;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setSuccessMessage(`Tạo bản sao lưu thành công! Đã tải file: ${res.filename}`);
      } catch (err: any) {
        setError("Lỗi xử lý file tải về: " + err.message);
      }
    });
  };
  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.endsWith(".json") && !file.name.endsWith(".sql")) {
        setError("Vui lòng chỉ chọn các tập tin có đuôi mở rộng .json hoặc .sql");
        setRestoreFile(null);
        return;
      }
      setRestoreFile(file);
      setError(null);
      setSuccessMessage(null);
    }
  };

  // Handle database restore
  const handleRestore = () => {
    if (!restoreFile) {
      setError("Vui lòng chọn tập tin sao lưu (.json hoặc .sql) trước khi khôi phục.");
      return;
    }

    setError(null);
    setSuccessMessage(null);

    const confirmMsg = 
      "CẢNH BÁO CỰC KỲ QUAN TRỌNG:\n\n" +
      "Hành động này sẽ XÓA TOÀN BỘ dữ liệu hiện tại trong cơ sở dữ liệu và thay thế bằng dữ liệu từ tập tin khôi phục.\n" +
      "Bạn có chắc chắn muốn tiếp tục không?";

    if (!window.confirm(confirmMsg)) {
      return;
    }

    startRestoreTransition(async () => {
      try {
        // Read file content as base64
        const reader = new FileReader();
        reader.onload = async (event) => {
          const result = event.target?.result as string;
          // Extract base64 part
          const base64Content = result.split(",")[1];

          const res = await importDatabase(base64Content);
          if (!res.success) {
            setError(res.error || "Lỗi trong quá trình khôi phục dữ liệu.");
          } else {
            setRestoreFile(null);
            // Reset input
            const fileInput = document.getElementById("sql-file-input") as HTMLInputElement;
            if (fileInput) fileInput.value = "";
            setShowRestoreSuccessModal(true);
            setCountdown(3);
          }
        };

        reader.onerror = () => {
          setError("Không thể đọc file đã chọn.");
        };

        reader.readAsDataURL(restoreFile);
      } catch (err: any) {
        setError("Lỗi xử lý file khôi phục: " + err.message);
      }
    });
  };

  return (
    <div style={{
      padding: "2rem",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: '"Segoe UI", -apple-system, sans-serif',
      fontSize: "13px"
    }}>
      
      <div style={{ width: "100%", maxWidth: "800px" }}>
        
        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "2rem", borderBottom: "2px solid #e2e8f0", paddingBottom: "1rem" }}>
          <div style={{
            backgroundColor: "#003466",
            color: "#ffffff",
            padding: "10px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Database size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#003466", margin: 0 }}>
              Sao lưu & Phục hồi cơ sở dữ liệu
            </h1>
            <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "12px" }}>
              Quản trị hệ thống: Xuất bản sao lưu dữ liệu hiện tại và khôi phục khi gặp sự cố
            </p>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div style={{
            padding: "0.85rem 1.25rem",
            borderRadius: "8px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fee2e2",
            color: "#991b1b",
            fontSize: "13px",
            fontWeight: 500,
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            marginBottom: "1.5rem"
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong style={{ display: "block", marginBottom: "2px" }}>Lỗi hệ thống:</strong>
              {error}
            </div>
          </div>
        )}

        {successMessage && (
          <div style={{
            padding: "0.85rem 1.25rem",
            borderRadius: "8px",
            backgroundColor: "#ecfdf5",
            border: "1px solid #d1fae5",
            color: "#065f46",
            fontSize: "13px",
            fontWeight: 500,
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            marginBottom: "1.5rem"
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong style={{ display: "block", marginBottom: "2px" }}>Thành công:</strong>
              {successMessage}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          
          {/* Card 1: Backup */}
          <div className="card" style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
                <Download size={20} color="#003466" />
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#003466", margin: 0 }}>
                  Xuất Sao lưu dữ liệu
                </h3>
              </div>
              <p style={{ color: "#475569", lineHeight: "1.6", marginBottom: "1.5rem" }}>
                Hệ thống sẽ chạy kết xuất database để đóng gói toàn bộ dữ liệu bao gồm cấu trúc bảng, bản ghi giao dịch, phân quyền của hệ thống trên máy chủ VPS thành một tập tin sao lưu (JSON/SQL) và gửi về trình duyệt của bạn để lưu trữ về ổ đĩa cục bộ.
              </p>
            </div>

            <button
              onClick={handleBackup}
              disabled={isPendingBackup || isPendingRestore}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "4px",
                backgroundColor: isPendingBackup || isPendingRestore ? "#cbd5e1" : "#003466",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                cursor: isPendingBackup || isPendingRestore ? "not-allowed" : "pointer",
                transition: "background-color 0.2s, transform 0.1s",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.5rem"
              }}
              onMouseEnter={(e) => {
                if (!isPendingBackup && !isPendingRestore) {
                  e.currentTarget.style.backgroundColor = "#002244";
                }
              }}
              onMouseLeave={(e) => {
                if (!isPendingBackup && !isPendingRestore) {
                  e.currentTarget.style.backgroundColor = "#003466";
                }
              }}
            >
              {isPendingBackup ? (
                <>
                  <RefreshCw size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                  Đang sao lưu...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Tạo bản sao lưu và Tải về
                </>
              )}
            </button>
          </div>

          {/* Card 2: Restore */}
          <div className="card" style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
                <Upload size={20} color="#ff5c00" />
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#ff5c00", margin: 0 }}>
                  Khôi phục dữ liệu
                </h3>
              </div>
              
              <div style={{
                backgroundColor: "#fffbeb",
                border: "1px solid #fef3c7",
                borderRadius: "6px",
                padding: "10px 12px",
                color: "#b45309",
                marginBottom: "1.25rem",
                fontSize: "12px",
                lineHeight: "1.5",
                display: "flex",
                gap: "8px"
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>CẢNH BÁO QUAN TRỌNG:</strong> Việc khôi phục dữ liệu sẽ xóa bỏ toàn bộ dữ liệu hiện thời trên máy chủ và ghi đè bằng file tải lên. Hãy chắc chắn tập tin hợp lệ.
                </div>
              </div>

              {/* File Input */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label className="filter-label" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
                  Chọn tập tin sao lưu (.json, .sql) *
                </label>
                <input
                  id="sql-file-input"
                  type="file"
                  accept=".json,.sql"
                  className="input"
                  onChange={handleFileChange}
                  disabled={isPendingBackup || isPendingRestore}
                  style={{
                    fontSize: "12px",
                    padding: "6px",
                    border: "1px solid #cbd5e1"
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleRestore}
              disabled={isPendingBackup || isPendingRestore || !restoreFile}
              style={{
                width: "100%",
                padding: "10px 16px",
                borderRadius: "4px",
                backgroundColor: isPendingBackup || isPendingRestore || !restoreFile ? "#cbd5e1" : "#ff5c00",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                cursor: isPendingBackup || isPendingRestore || !restoreFile ? "not-allowed" : "pointer",
                transition: "background-color 0.2s, transform 0.1s",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.5rem"
              }}
              onMouseEnter={(e) => {
                if (!isPendingBackup && !isPendingRestore && restoreFile) {
                  e.currentTarget.style.backgroundColor = "#e05200";
                }
              }}
              onMouseLeave={(e) => {
                if (!isPendingBackup && !isPendingRestore && restoreFile) {
                  e.currentTarget.style.backgroundColor = "#ff5c00";
                }
              }}
            >
              {isPendingRestore ? (
                <>
                  <RefreshCw size={16} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                  Đang phục hồi...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Khởi chạy phục hồi dữ liệu
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Restore Success Modal */}
      {showRestoreSuccessModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{
            background: "#ffffff",
            padding: "2.5rem 2rem",
            borderRadius: "16px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            width: "100%",
            maxWidth: "420px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.25rem",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#ecfdf5",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <CheckCircle size={32} />
            </div>

            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#065f46", marginBottom: "0.5rem" }}>
                Khôi phục dữ liệu thành công!
              </h3>
              <p style={{ color: "#475569", fontSize: "13px", fontFamily: '"Segoe UI", -apple-system, sans-serif', lineHeight: "1.5" }}>
                Dữ liệu hệ thống đã được phục hồi hoàn tất. Trang web sẽ tự động làm mới sau <strong>{countdown}</strong> giây để cập nhật lại giao diện...
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              style={{
                width: "100%",
                padding: "8px 16px",
                borderRadius: "4px",
                backgroundColor: "#003466",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                fontSize: "13px",
                fontFamily: '"Segoe UI", -apple-system, sans-serif',
                cursor: "pointer",
                transition: "background-color 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#002244";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#003466";
              }}
            >
              Làm mới ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
