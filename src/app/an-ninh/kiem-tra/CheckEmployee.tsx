"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyEmployee } from "@/app/(dashboard)/an-ninh/actions";
import { 
  User, ShieldCheck, AlertCircle, Search, 
  MapPin, Briefcase, Calendar, Fingerprint 
} from "lucide-react";

export default function CheckEmployee() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scanCode = searchParams.get("scan");

  const [code, setCode] = useState("");
  const [searchedCode, setSearchedCode] = useState("");
  const [employee, setEmployee] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "resigned" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle scanned card code from global security layout redirect
  useEffect(() => {
    if (scanCode) {
      const query = decodeURIComponent(scanCode).trim();
      if (query) {
        // Clear scan param from URL instantly so reload doesn't trigger it again
        const params = new URLSearchParams(window.location.search);
        params.delete("scan");
        const newPath = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        router.replace(newPath);

        // Perform verify
        setCode("");
        setSearchedCode(query);
        setStatus("loading");
        verifyEmployee(query).then((result) => {
          if (result) {
            setEmployee(result);
            if (result.status === "ACTIVE") {
              setStatus("success");
              if ("speechSynthesis" in window) {
                const utterance = new SpeechSynthesisUtterance("Hợp lệ");
                utterance.lang = "vi-VN";
                utterance.rate = 1.0;
                window.speechSynthesis.speak(utterance);
              }
            } else {
              setStatus("resigned");
              if ("speechSynthesis" in window) {
                const utterance = new SpeechSynthesisUtterance("Nghỉ việc");
                utterance.lang = "vi-VN";
                utterance.rate = 1.0;
                window.speechSynthesis.speak(utterance);
              }
            }
          } else {
            setEmployee(null);
            setStatus("error");
            if ("speechSynthesis" in window) {
              const utterance = new SpeechSynthesisUtterance("Không có");
              utterance.lang = "vi-VN";
              window.speechSynthesis.speak(utterance);
            }
          }
        }).catch((err) => {
          console.error(err);
          setStatus("error");
        });
      }
    }
  }, [scanCode, router]);

  // Đảm bảo luôn focus vào ô nhập liệu để máy quét thẻ có thể gõ dữ liệu bất cứ lúc nào
  useEffect(() => {
    const handleGlobalFocus = (e: MouseEvent) => {
      // Tự động focus lại nếu click ra ngoài để máy quét có thể hoạt động liên tục
      inputRef.current?.focus();
    };
    window.addEventListener("click", handleGlobalFocus);
    return () => window.removeEventListener("click", handleGlobalFocus);
  }, []);

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const query = code.trim();
    if (!query) return;

    setSearchedCode(query);
    setCode(""); // Clear the input field immediately to wait for another card scan!
    setStatus("loading");
    try {
      const result = await verifyEmployee(query);
      
      if (result) {
        setEmployee(result);
        if (result.status === "ACTIVE") {
          setStatus("success");
          
          // Phát âm thanh "Hợp lệ"
          if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance("Hợp lệ");
            utterance.lang = "vi-VN";
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
          }
        } else {
          setStatus("resigned");
          
          // Phát âm thanh "Nghỉ việc"
          if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance("Nghỉ việc");
            utterance.lang = "vi-VN";
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
          }
        }
      } else {
        setEmployee(null);
        setStatus("error");
        
        // Phát âm thanh "Không có"
        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance("Không có");
          utterance.lang = "vi-VN";
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(-2);
  };

  const getRandomColor = (name: string) => {
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const reset = () => {
    setStatus("idle");
    setCode("");
    setSearchedCode("");
    setEmployee(null);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  return (
    <div className="check-wrapper animate-fade-in">
      <div className="check-container-card">
        <div className="check-header-section">
          <div className="check-header-icon">
            <ShieldCheck size={32} />
          </div>
          <div className="check-header-content">
            <h2>Hệ thống kiểm soát an ninh</h2>
            <p>Xác nhận danh tính nhân viên • Quét mã thẻ</p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="check-input-form">
          <div className="check-input-group">
            <Fingerprint className="check-field-icon" size={24} />
            <input
              ref={inputRef}
              type="text"
              className="check-main-input"
              placeholder="Quét thẻ hoặc nhập mã nhân viên..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
            <button type="submit" className="check-submit-btn" disabled={status === "loading"}>
              {status === "loading" ? <div className="btn-spinner"></div> : <Search size={22} />}
            </button>
          </div>
        </form>

        <div className="check-result-viewport">
          {status === "idle" && (
            <div className="check-idle-state">
              <div className="idle-visual">
                <Search size={64} />
                <p>Đang chờ tín hiệu...</p>
              </div>
            </div>
          )}

          {status === "loading" && (
            <div className="check-loading-state">
              <div className="loading-pulse"></div>
              <p>Đang truy vấn cơ sở dữ liệu...</p>
            </div>
          )}

          {status === "error" && (
            <div className="check-error-state animate-shake">
              <div className="error-icon-box">
                <AlertCircle size={48} />
              </div>
              <h3>Không tìm thấy dữ liệu</h3>
              <p>Mã thẻ hoặc mã nhân viên <strong>{searchedCode}</strong> không tồn tại trong hệ thống.</p>
              <button className="btn-base btn-outline" onClick={reset}>Thử lại</button>
            </div>
          )}

          {status === "success" && employee && (
            <div className="check-success-state animate-pop-in">
              <div className="success-ribbon">
                <ShieldCheck size={40} />
              </div>
              
              <div className="employee-profile-card">
                <div 
                  className="profile-avatar" 
                  style={{ backgroundColor: getRandomColor(employee.fullName) }}
                >
                  {getInitials(employee.fullName)}
                </div>
                
                <div className="profile-info">
                  <h1 className="profile-name">{employee.fullName}</h1>
                  <div className="profile-code-tag">{employee.employeeCode}</div>
                  
                    <div className="profile-grid">
                      <div className="grid-item">
                        <Briefcase size={16} />
                        <span>{employee.department}</span>
                      </div>
                      <div className="grid-item">
                        <User size={16} />
                        <span>{employee.position}</span>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          )}

          {status === "resigned" && employee && (
            <div className="check-success-state animate-pop-in resigned" style={{ border: "1px solid #fee2e2", background: "#fef2f2", borderRadius: "12px", padding: "1.5rem", width: "100%", position: "relative" }}>
              <div className="success-ribbon resigned-ribbon" style={{ position: "absolute", top: "10px", right: "10px", background: "#ef4444", color: "#fff", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 8px rgba(239, 68, 68, 0.22)", zIndex: 10 }}>
                <AlertCircle size={40} />
              </div>
              
              <div className="employee-profile-card">
                <div 
                  className="profile-avatar" 
                  style={{ backgroundColor: "#94a3b8" }}
                >
                  {getInitials(employee.fullName)}
                </div>
                
                <div className="profile-info">
                  <h1 className="profile-name" style={{ color: "#64748b" }}>{employee.fullName}</h1>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                    <div className="profile-code-tag" style={{ background: "#e2e8f0", color: "#475569" }}>{employee.employeeCode}</div>
                    <span style={{
                      background: "#fee2e2",
                      color: "#ef4444",
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: "1px solid #fca5a5",
                      fontFamily: "Segoe UI, sans-serif"
                    }}>ĐÃ NGHỈ VIỆC</span>
                  </div>
                  
                  <div className="profile-grid">
                    <div className="grid-item">
                      <Briefcase size={16} />
                      <span>{employee.department}</span>
                    </div>
                    <div className="grid-item">
                      <User size={16} />
                      <span>{employee.position}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
