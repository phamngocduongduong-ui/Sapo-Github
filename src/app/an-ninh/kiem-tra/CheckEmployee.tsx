"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyEmployee, searchEmployees } from "@/app/(dashboard)/an-ninh/actions";
import { 
  ShieldCheck, AlertCircle, Search, 
  Fingerprint, X, Volume2, Briefcase, User, Phone
} from "lucide-react";

export default function CheckEmployee() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scanCode = searchParams.get("scan");

  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [lastVerifiedEmployee, setLastVerifiedEmployee] = useState<any>(null);
  const [lastVerifiedStatus, setLastVerifiedStatus] = useState<"idle" | "success" | "resigned" | "error">("idle");
  const [searchedCode, setSearchedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isEmployeeActive = (status?: string | null) => {
    if (!status) return true;
    const s = status.trim().toUpperCase();
    if (s === "NGHỈ VIỆC" || s === "NGƯNG HOẠT ĐỘNG" || s === "INACTIVE" || s === "RESIGNED") {
      return false;
    }
    return true;
  };

  const playSpeakSound = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const performSearch = async (query: string) => {
    setLoading(true);
    try {
      const results = await searchEmployees(query);
      setEmployees(results);
      if (query.trim() !== "") {
        if (results && results.length > 0) {
          const matched = results[0];
          setLastVerifiedEmployee(matched);
          setSearchedCode(query);
          if (isEmployeeActive(matched.status)) {
            setLastVerifiedStatus("success");
            playSpeakSound("Hợp lệ");
          } else {
            setLastVerifiedStatus("resigned");
            playSpeakSound("Nghỉ việc");
          }
        } else {
          setLastVerifiedEmployee(null);
          setSearchedCode(query);
          setLastVerifiedStatus("error");
          playSpeakSound("Không có");
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      if (query.trim() !== "") {
        setSearchQuery("");
        inputRef.current?.focus();
      }
    }
  };

  // Focus input on mount and load initial list of employees
  useEffect(() => {
    inputRef.current?.focus();
    performSearch("");
  }, []);

  // Always focus search input when clicking outside interactive elements
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        target !== inputRef.current &&
        target.tagName !== "BUTTON" &&
        target.closest("button") === null &&
        target.tagName !== "INPUT" &&
        target.tagName !== "TEXTAREA"
      ) {
        inputRef.current?.focus();
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  // Handle scanned card code from global security layout redirect
  useEffect(() => {
    if (scanCode) {
      const query = decodeURIComponent(scanCode).trim().toUpperCase();
      if (query) {
        // Clear scan param from URL instantly so reload doesn't trigger it again
        const params = new URLSearchParams(window.location.search);
        params.delete("scan");
        const newPath = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        router.replace(newPath);

        // Perform verify
        setSearchedCode(query);
        setLoading(true);
        verifyEmployee(query).then((result) => {
          if (result) {
            setLastVerifiedEmployee(result);
            if (isEmployeeActive(result.status)) {
              setLastVerifiedStatus("success");
              playSpeakSound("Hợp lệ");
            } else {
              setLastVerifiedStatus("resigned");
              playSpeakSound("Nghỉ việc");
            }
            // Populate search query and search list
            setSearchQuery(query);
            performSearch(query);
          } else {
            setLastVerifiedEmployee(null);
            setLastVerifiedStatus("error");
            playSpeakSound("Không có");
            setSearchQuery("");
            inputRef.current?.focus();
          }
        }).catch((err) => {
          console.error(err);
          setLastVerifiedStatus("error");
          setSearchQuery("");
          inputRef.current?.focus();
        }).finally(() => {
          setLoading(false);
        });
      }
    }
  }, [scanCode, router]);

  const handleRowClick = (emp: any) => {
    setLastVerifiedEmployee(emp);
    setSearchedCode(emp.employeeCode);
    if (isEmployeeActive(emp.status)) {
      setLastVerifiedStatus("success");
      playSpeakSound("Hợp lệ");
    } else {
      setLastVerifiedStatus("resigned");
      playSpeakSound("Nghỉ việc");
    }
  };

  return (
    <div className="check-page-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        .check-page-container {
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px;
        }
        .check-page-container input,
        .check-page-container button,
        .check-page-container table,
        .check-page-container td,
        .check-page-container th,
        .check-page-container label {
          font-size: 13px !important;
          font-family: "Segoe UI", -apple-system, sans-serif !important;
        }
        .breadcrumb-banner {
          background-color: #003466;
          color: white;
          padding: 12px 15px;
          font-weight: 700;
          font-size: 36px !important;
          text-align: center;
          display: block;
          border-radius: 0 !important;
          margin-top: 0;
          margin-left: -20px;
          margin-right: -20px;
          text-transform: uppercase;
        }
        .check-layout {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          margin-top: 15px;
        }
        .search-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 10px;
          max-width: 900px;
          width: 100%;
          margin: 0 auto;
        }
        .search-box-base {
          position: relative;
          display: flex;
          align-items: center;
          width: 400px;
          max-width: 100%;
        }
        .search-box-base input {
          width: 100%;
          height: 48px;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          outline: none !important;
          background: white !important;
          padding: 8px 38px 8px 44px !important;
          font-size: 22px !important;
          text-transform: uppercase;
        }
        .search-box-base .search-icon {
          position: absolute;
          left: 14px;
          color: #64748b;
        }
        .sapo-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background-color: #003466;
          color: white;
          padding: 6px 18px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 25px !important;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          border: none;
          height: 48px;
          white-space: nowrap;
        }
        .sapo-btn:hover {
          background-color: #002244;
        }
        .sapo-btn:active {
          transform: scale(0.98);
        }
        .sapo-btn-secondary {
          background-color: #475569;
        }
        .sapo-btn-secondary:hover {
          background-color: #334155;
        }
        .scan-status-panel {
          border-radius: 6px;
          padding: 12px 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .scan-status-success {
          background-color: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #065f46;
        }
        .scan-status-resigned {
          background-color: #fef2f2;
          border: 1px solid #fca5a5;
          color: #991b1b;
        }
        .scan-status-error {
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
        }
        .scan-status-idle {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #475569;
        }
        .base-table-wrapper {
          max-height: 520px;
          overflow-y: auto;
          overflow-x: auto;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: white;
        }
        .base-table {
          width: 100%;
          border-collapse: collapse;
        }
        .base-table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          background: #f1f5f9 !important;
          border-bottom: 2px solid #ff5c00 !important;
          text-align: left;
          height: 35px !important;
          padding: 8px 12px !important;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .base-table td {
          padding: 10px 12px !important;
          vertical-align: middle !important;
          border-bottom: 1px solid #f1f5f9 !important;
          color: #334155;
        }
        .row-hoverable:hover {
          background-color: #f8fafc;
          cursor: pointer;
        }
        .row-selected {
          background-color: #eff6ff !important;
        }
        .status-badge {
          display: inline-block;
          padding: 3px 8px;
          font-size: 11px !important;
          font-weight: 700;
          border-radius: 9999px;
          text-transform: uppercase;
        }
        .status-active {
          background-color: #d1fae5;
          color: #065f46;
        }
        .status-resigned {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .table-loading-state {
          padding: 40px;
          text-align: center;
          color: #64748b;
        }
        .table-empty-state {
          padding: 40px;
          text-align: center;
          color: #64748b;
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        .animate-pop-in {
          animation: popIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `
      }} />

      <div className="breadcrumb-banner">
        Kiểm tra thông tin nhân viên
      </div>

      <div className="check-layout">
        {/* Row 1: Search Form */}
        <form onSubmit={(e) => { e.preventDefault(); performSearch(searchQuery); }} className="search-row">
          <div className="search-box-base">
            <Search className="search-icon" size={22} />
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Nhập mã thẻ, mã nhân viên, họ tên, bộ phận hoặc chức vụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  performSearch("");
                }}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0
                }}
              >
                <X size={22} />
              </button>
            )}
          </div>
          <button type="submit" className="sapo-btn" disabled={loading}>
            Tìm kiếm
          </button>
          <button
            type="button"
            className="sapo-btn sapo-btn-secondary"
            onClick={() => {
              setSearchQuery("");
              setLastVerifiedEmployee(null);
              setLastVerifiedStatus("idle");
              setSearchedCode("");
              performSearch("");
            }}
          >
            Làm mới
          </button>
        </form>

        {/* Results Card Area */}
        <div style={{ margin: "0 auto", width: "fit-content", minWidth: "900px", maxWidth: "100%" }}>
          {loading ? (
            <div style={{
              background: "white",
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              padding: "50px 40px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)"
            }}>
              <div style={{ 
                display: "inline-block", 
                width: "46px", 
                height: "46px", 
                border: "4.5px solid #003466", 
                borderTopColor: "transparent", 
                borderRadius: "50%", 
                animation: "spin 1s linear infinite", 
                marginRight: "15px", 
                verticalAlign: "middle" 
              }}></div>
              <span style={{ fontSize: "27px", fontWeight: 600, color: "#475569" }}>Đang truy vấn cơ sở dữ liệu...</span>
              <style dangerouslySetInnerHTML={{
                __html: `@keyframes spin { to { transform: rotate(360deg); } }`
              }} />
            </div>
          ) : lastVerifiedStatus === "idle" ? (
            /* Idle card placeholder */
            <div style={{
              background: "white",
              border: "1.5px dashed #cbd5e1",
              borderRadius: "12px",
              padding: "80px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "18px",
              color: "#64748b"
            }}>
              <div style={{
                background: "#f1f5f9",
                width: "124px",
                height: "124px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b"
              }}>
                <Fingerprint size={62} />
              </div>
              <h3 style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#334155" }}>
                ĐANG CHỜ THÔNG TIN QUÉT THẺ
              </h3>
              <p style={{ margin: 0, fontSize: "23px", color: "#64748b" }}>
                Vui lòng quét thẻ từ hoặc nhập mã nhân viên/tên vào ô tìm kiếm để kiểm tra.
              </p>
            </div>
          ) : lastVerifiedStatus === "error" ? (
            /* Error/Not Found Card */
            <div className="animate-shake" style={{
              background: "#fffbeb",
              border: "1.5px solid #fde68a",
              borderRadius: "12px",
              padding: "60px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "18px",
              color: "#92400e",
              boxShadow: "0 4px 12px rgba(245, 158, 11, 0.05)"
            }}>
              <div style={{
                background: "#fef3c7",
                width: "124px",
                height: "124px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d97706"
              }}>
                <AlertCircle size={62} />
              </div>
              <h3 style={{ margin: 0, fontSize: "28px", fontWeight: 800, textTransform: "uppercase" }}>
                Không Tìm Thấy Thông Tin
              </h3>
              <p style={{ margin: 0, fontSize: "25px", color: "#b45309" }}>
                Mã kiểm tra <strong style={{ textDecoration: "underline" }}>{searchedCode}</strong> không tồn tại trên hệ thống.
              </p>
            </div>
          ) : (
            /* Success / Resigned Profile Card */
            lastVerifiedEmployee && (
              <div 
                className="animate-pop-in" 
                style={{
                  background: "white",
                  border: lastVerifiedStatus === "success" ? "2px solid #10b981" : "2px solid #ef4444",
                  borderRadius: "16px",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
                  overflow: "hidden",
                  position: "relative",
                  transition: "all 0.3s ease"
                }}
              >
                {/* Header ribbon */}
                <div style={{
                  background: lastVerifiedStatus === "success"
                    ? "linear-gradient(90deg, #10b981 0%, #059669 100%)" 
                    : "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)",
                  color: "white",
                  padding: "14px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontWeight: 800,
                  fontSize: "27px",
                  letterSpacing: "0.03em"
                }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
                    {lastVerifiedStatus === "success" ? <ShieldCheck size={34} /> : <AlertCircle size={34} />}
                    <span>{lastVerifiedStatus === "success" ? "XÁC NHẬN HỢP LỆ" : "CẢNH BÁO: ĐÃ NGHỈ VIỆC"}</span>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (lastVerifiedStatus === "success") playSpeakSound("Hợp lệ");
                      if (lastVerifiedStatus === "resigned") playSpeakSound("Nghỉ việc");
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.2)",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 15px",
                      borderRadius: "6px",
                      fontSize: "23px",
                      fontWeight: 600
                    }}
                  >
                    <Volume2 size={26} />
                    <span>Phát lại</span>
                  </button>
                </div>

                {/* Card Body */}
                <div style={{
                  padding: "20px 40px 36px 40px",
                  display: "flex",
                  gap: "42px",
                  alignItems: "center",
                  flexWrap: "nowrap"
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: "195px",
                    height: "195px",
                    borderRadius: "50%",
                    backgroundColor: lastVerifiedStatus === "success" ? "#d1fae5" : "#fee2e2",
                    color: lastVerifiedStatus === "success" ? "#065f46" : "#991b1b",
                    border: lastVerifiedStatus === "success" ? "4px solid #a7f3d0" : "4px solid #fca5a5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "55px",
                    fontWeight: 800,
                    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
                    flexShrink: 0
                  }}>
                    {lastVerifiedEmployee.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(-2)}
                  </div>

                  {/* Employee details */}
                  <div style={{ flex: 1, minWidth: "220px" }}>
                    {/* Name */}
                    <div style={{ marginBottom: "9px" }}>
                      <h2 style={{ fontSize: "47px", fontWeight: 800, color: "#1e293b", margin: 0, whiteSpace: "nowrap" }}>
                        {lastVerifiedEmployee.fullName.toUpperCase()}
                      </h2>
                    </div>

                    {/* Employee Code */}
                    <div style={{
                      fontSize: "47px",
                      color: lastVerifiedStatus === "success" ? "#047857" : "#b91c1c",
                      backgroundColor: lastVerifiedStatus === "success" ? "#ecfdf5" : "#fef2f2",
                      border: lastVerifiedStatus === "success" ? "1px solid #a7f3d0" : "1px solid #fca5a5",
                      padding: "3px 15px",
                      borderRadius: "6px",
                      display: "inline-block",
                      fontWeight: 700,
                      marginBottom: "10px",
                      letterSpacing: "0.02em"
                    }}>
                      Mã NV: {lastVerifiedEmployee.employeeCode}
                    </div>

                    {/* Status Badge */}
                    <div style={{ marginBottom: "20px" }}>
                      <span style={{
                        fontSize: "21px",
                        fontWeight: 700,
                        backgroundColor: lastVerifiedStatus === "success" ? "#d1fae5" : "#fee2e2",
                        color: lastVerifiedStatus === "success" ? "#065f46" : "#991b1b",
                        padding: "3px 12px",
                        borderRadius: "6px",
                        display: "inline-block",
                        textTransform: "uppercase"
                      }}>
                        {lastVerifiedStatus === "success" ? "Hoạt động" : "Ngưng hoạt động"}
                      </span>
                    </div>

                    {/* Meta info list */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "18px",
                      borderTop: "1px solid #f1f5f9",
                      paddingTop: "18px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#475569", fontSize: "25px", fontWeight: 500 }}>
                          <Briefcase size={31} color="#64748b" />
                          <span>Bộ phận: <strong>{lastVerifiedEmployee.department}</strong></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#475569", fontSize: "25px", fontWeight: 500 }}>
                          <User size={31} color="#64748b" />
                          <span>Chức vụ: <strong>{lastVerifiedEmployee.position}</strong></span>
                        </div>
                      </div>

                      {lastVerifiedEmployee.cardCode && (
                        <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#475569", fontSize: "25px", fontWeight: 500 }}>
                            <Fingerprint size={31} color="#64748b" />
                            <span>Mã thẻ từ: <strong>{lastVerifiedEmployee.cardCode}</strong></span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
