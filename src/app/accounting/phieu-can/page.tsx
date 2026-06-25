"use client";

import React, { useState, useEffect, useTransition, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  CheckCircle, X, RefreshCw, AlertTriangle, FileText, Calendar, 
  ChevronDown, Truck, Wifi, SlidersHorizontal
} from "lucide-react";
import { 
  getWeighingSlipById, getActiveBranches, getProductCategories, 
  getCustomersAndSuppliers, createWeighingSlip, updateWeighingSlip
} from "@/app/(dashboard)/accounting/can-xe/actions";

function WeighingFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const slipId = searchParams.get("id");
  const mode = searchParams.get("mode"); // "edit" | "view"
  const isViewMode = mode === "view";
  const isEditMode = !!slipId && !isViewMode;

  const [branches, setBranches] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  // Form inputs
  const [formBranch, setFormBranch] = useState("");
  const [formType, setFormType] = useState("Nhập hàng"); // "Nhập hàng" | "Xuất hàng"
  const [formSubType, setFormSubType] = useState("Nhập nguyên liệu");
  const [formLicensePlate, setFormLicensePlate] = useState("");
  const [formDriverName, setFormDriverName] = useState("");
  const [formProductGroup, setFormProductGroup] = useState("");
  const [formCustomerSupplier, setFormCustomerSupplier] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formWeight1, setFormWeight1] = useState<number | "">("");
  const [formWeight2, setFormWeight2] = useState<number | "">("");
  const [slipNumber, setSlipNumber] = useState("Tự động phát sinh");
  const [createdAtStr, setCreatedAtStr] = useState("Chưa có (Lưu để tạo)");

  // Simulated Scale Device State
  const [scaleBaseWeight, setScaleBaseWeight] = useState<number>(447.22);
  const [scaleDisplayWeight, setScaleDisplayWeight] = useState<string>("447");
  const [deviceResponseTime, setDeviceResponseTime] = useState<string>("");

  // Scale Configuration States (COM and Simulator)
  const [showScaleSettings, setShowScaleSettings] = useState(false);
  const [scaleMode, setScaleMode] = useState<string>("sim"); // "sim" | "physical"
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [selectedComPort, setSelectedComPort] = useState<string>("");
  const [activeComPort, setActiveComPort] = useState<string>("");
  const [localServiceStatus, setLocalServiceStatus] = useState<"connected" | "disconnected">("disconnected");
  const [localServiceDetail, setLocalServiceDetail] = useState<string>("Chưa kết nối service");
  const [scaleServiceUrl, setScaleServiceUrl] = useState<string>("http://localhost:5000");
  const [serviceConnectionError, setServiceConnectionError] = useState<string | null>(null);
  const [selectedBaudrate, setSelectedBaudrate] = useState<number>(9600);

  // Load configuration settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mode = localStorage.getItem("scale_mode") || "sim";
      setScaleMode(mode);
      const savedPort = localStorage.getItem("selected_com_port") || "";
      setSelectedComPort(savedPort);
      setActiveComPort(savedPort);
      const savedUrl = localStorage.getItem("scale_service_url") || "http://localhost:5000";
      setScaleServiceUrl(savedUrl);
      const savedBaudrate = localStorage.getItem("selected_baudrate") || "9600";
      setSelectedBaudrate(Number(savedBaudrate));
    }
  }, []);

  // Fetch available COM ports from local Flask API
  const fetchAvailablePorts = async (overrideUrl?: string) => {
    const rawUrl = overrideUrl || scaleServiceUrl;
    const url = rawUrl.trim().replace(/\/+$/, "");
    try {
      setServiceConnectionError(null);
      const res = await fetch(`${url}/ports`);
      if (res.ok) {
        const data = await res.json();
        setAvailablePorts(data.ports || []);
        if (data.ports && data.ports.length > 0 && !selectedComPort) {
          setSelectedComPort(data.ports[0]);
        }
      } else {
        setServiceConnectionError(`Lỗi phản hồi từ service: HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn("Không kết nối được service local để lấy cổng COM:", err);
      setServiceConnectionError("Không thể kết nối đến địa chỉ service cân. Vui lòng kiểm tra lại URL và đảm bảo service Python đang chạy trên máy tính đó.");
    }
  };

  // Trigger port selection fetch on settings open
  useEffect(() => {
    if (showScaleSettings && scaleMode === "physical") {
      fetchAvailablePorts();
    }
  }, [showScaleSettings, scaleMode, scaleServiceUrl]);

  // Send request to Flask API to switch active COM port
  const saveComPortConfig = async () => {
    if (!selectedComPort) {
      alert("Vui lòng chọn cổng COM!");
      return;
    }
    const url = scaleServiceUrl.trim().replace(/\/+$/, "");
    try {
      const res = await fetch(`${url}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port: selectedComPort, baudrate: selectedBaudrate })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("selected_com_port", selectedComPort);
        localStorage.setItem("selected_baudrate", selectedBaudrate.toString());
        setActiveComPort(selectedComPort);
        setLocalServiceStatus("connected");
        setLocalServiceDetail(data.status || "Đã kết nối");
        alert(`Đã lưu cấu hình và kết nối thành công tới ${selectedComPort}!`);
      } else {
        setLocalServiceStatus("disconnected");
        setLocalServiceDetail(data.message || "Lỗi kết nối");
        alert(`Kết nối thất bại tới ${selectedComPort}: ${data.message || "Lỗi không xác định"}`);
      }
    } catch (err) {
      alert(`Lỗi: Không kết nối được service nền tại ${url}. Hãy đảm bảo service python đang chạy.`);
    }
  };

  // Load slip if editing or viewing
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [branchesData, categoriesData, partnersData] = await Promise.all([
          getActiveBranches(),
          getProductCategories(),
          getCustomersAndSuppliers()
        ]);
        setBranches(branchesData);
        setCategories(categoriesData);
        setPartners(partnersData);

        if (slipId) {
          const slip = await getWeighingSlipById(slipId);
          if (slip) {
            setSelectedSlip(slip);
            setSlipNumber(slip.slipNumber);
            setFormBranch(slip.branch);
            setFormType(slip.type);
            setFormSubType(slip.subType);
            setFormLicensePlate(slip.licensePlate);
            setFormDriverName(slip.driverName);
            setFormProductGroup(slip.productGroup);
            setFormCustomerSupplier(slip.customerSupplier);
            setFormNotes(slip.notes || "");
            setFormWeight1(slip.weight1);
            setFormWeight2(slip.weight2 || "");
            setCreatedAtStr(new Date(slip.createdAt).toLocaleString("vi-VN"));
            setScaleBaseWeight(slip.weight2 || slip.weight1 || 447.22);
          } else {
            alert("Không tìm thấy phiếu cân");
          }
        } else {
          // Defaults for creation
          if (branchesData.length > 0) setFormBranch(branchesData[0].name);
          if (categoriesData.length > 0) setFormProductGroup(branchesData.length > 0 ? categoriesData[0].name : "");
        }
      } catch (err) {
        console.error("Failed to load form data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slipId]);

  // Update scale reading simulation or poll physical COM port
  useEffect(() => {
    if (isViewMode) return;

    let timer: NodeJS.Timeout | null = null;

    if (scaleMode === "physical") {
      // Polling from local Python scale service
      timer = setInterval(async () => {
        try {
          const res = await fetch(`${scaleServiceUrl}/weight`);
          if (res.ok) {
            const data = await res.json();
            // Update weight display
            setScaleDisplayWeight(Math.round(data.weight).toString());
            setLocalServiceStatus(data.status === "connected" ? "connected" : "disconnected");
            setLocalServiceDetail(data.detail || "");
            if (data.port) {
              setActiveComPort(data.port);
            }
            
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
            setDeviceResponseTime(`Cổng ${data.port || "chưa chọn"}: ${data.weight.toFixed(2)} kg lúc ${timeStr}`);
          } else {
            setLocalServiceStatus("disconnected");
            setLocalServiceDetail("Lỗi phản hồi từ service");
          }
        } catch (err) {
          setLocalServiceStatus("disconnected");
          setLocalServiceDetail(`Mất kết nối tới service ${scaleServiceUrl}`);
          setDeviceResponseTime(`LỖI: Mất kết nối tới service cân tại ${scaleServiceUrl}`);
        }
      }, 500); // Poll every 500ms
    } else {
      // Simulator mode
      timer = setInterval(() => {
        const fluctuation = (Math.random() - 0.5) * 0.1;
        const reading = Math.max(0, scaleBaseWeight + fluctuation);
        setScaleDisplayWeight(Math.round(reading).toString());
        
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        setDeviceResponseTime(`${reading.toFixed(2)} kg at ${timeStr}`);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isViewMode, scaleBaseWeight, scaleMode, selectedComPort, scaleServiceUrl]);

  // Form type dependent subTypes list
  const subTypes = useMemo(() => {
    return formType === "Nhập hàng" 
      ? ["Nhập nguyên liệu", "Nhập phế liệu", "Nhập khác"]
      : ["Xuất thành phẩm", "Xuất phế liệu", "Xuất khác"];
  }, [formType]);

  // Handle Cancel / Close
  const handleClose = () => {
    if (typeof window !== "undefined") {
      // Check if opened as popup or standalone tab, try closing
      if (window.opener || window.history.length === 1) {
        window.close();
      } else {
        router.push("/accounting/can-xe");
      }
    }
  };

  // Save/Submit Form
  const handleSave = () => {
    if (!formBranch || !formLicensePlate || !formDriverName || !formProductGroup || !formCustomerSupplier) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }

    startTransition(async () => {
      try {
        if (isEditMode && slipId) {
          await updateWeighingSlip(slipId, {
            branch: formBranch,
            type: formType,
            subType: formSubType,
            licensePlate: formLicensePlate,
            driverName: formDriverName,
            productGroup: formProductGroup,
            customerSupplier: formCustomerSupplier,
            notes: formNotes,
            weight1: Number(formWeight1) || 0,
            weight2: Number(formWeight2) || 0
          });
        } else {
          await createWeighingSlip({
            branch: formBranch,
            type: formType,
            subType: formSubType,
            licensePlate: formLicensePlate,
            driverName: formDriverName,
            productGroup: formProductGroup,
            customerSupplier: formCustomerSupplier,
            notes: formNotes,
            weight1: Number(formWeight1) || 0,
            weight2: Number(formWeight2) || 0
          });
        }

        setSuccessMsg("Lưu phiếu cân thành công! Cửa sổ sẽ đóng...");
        setTimeout(() => {
          handleClose();
        }, 1500);
      } catch (err: any) {
        alert(err.message || "Lỗi khi lưu phiếu cân");
      }
    });
  };

  const handleWeigh1 = () => {
    setFormWeight1(Number(scaleDisplayWeight));
  };

  const handleWeigh2 = () => {
    setFormWeight2(Number(scaleDisplayWeight));
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc", fontFamily: "sans-serif" }}>
        <div style={{ border: "4px solid #cbd5e1", borderTop: "4px solid #003466", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite" }}></div>
        <p style={{ marginTop: "1rem", color: "#64748b", fontWeight: 600 }}>Đang tải dữ liệu phiếu cân...</p>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "20px 20px", boxSizing: "border-box", fontFamily: "Segoe UI, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .phieu-container {
          width: 100%;
          max-width: 100%;
          padding: 0;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .breadcrumb-banner {
          background-color: #003466;
          color: white;
          padding: 12px 20px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 0;
          margin-top: -20px;
          margin-left: -20px;
          margin-right: -20px;
          margin-bottom: 20px;
          text-transform: uppercase;
          font-size: 1.5rem !important;
          letter-spacing: 0.5px;
          box-sizing: border-box;
        }
        .phieu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 12px;
        }
        .phieu-title {
          font-size: 20px !important;
          font-weight: 700;
          color: #003466;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sapo-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background-color: #003466;
          color: white;
          padding: 6px 16px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          border: none;
          height: 34px;
        }
        .sapo-btn:hover {
          background-color: #002244;
        }
        .sapo-btn-secondary {
          background-color: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        .sapo-btn-secondary:hover {
          background-color: #e2e8f0;
        }
        .sapo-btn-success {
          background-color: #22c55e;
        }
        .sapo-btn-success:hover {
          background-color: #16a34a;
        }
        .form-layout {
          display: grid;
          grid-template-columns: 1fr 345px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .form-layout {
            grid-template-columns: 1fr;
          }
        }
        .form-card {
          background-color: white;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.02);
          border-top: 6px solid #ff5c00;
        }
        .form-card-title {
          font-weight: 700;
          color: #003466;
          margin-top: 0;
          margin-bottom: 16px;
          text-transform: uppercase;
          font-size: 14px !important;
          letter-spacing: 0.5px;
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 15px;
        }
        .form-label {
          display: block;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
          font-size: 13px;
        }
        .input-block {
          width: 100%;
          height: 36px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 4px 12px;
          box-sizing: border-box;
          outline: none;
          font-size: 13px;
        }
        .input-block:focus {
          border-color: #003466;
          box-shadow: 0 0 0 2px rgba(0, 52, 102, 0.1);
        }
        .input-block:disabled {
          background-color: #f1f5f9;
          cursor: not-allowed;
        }
        .radio-group {
          display: flex;
          gap: 20px;
          align-items: center;
          height: 36px;
        }
        .radio-option {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          cursor: pointer;
        }
        .radio-option input {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        /* Scale Display Panel */
        .scale-panel {
          background-color: #f0fdf4;
          border: 2px solid #22c55e;
          border-radius: 12px;
          padding: 15px;
          text-align: center;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .scale-title {
          font-weight: 700;
          color: #15803d;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .scale-digits-box {
          background-color: white;
          border: 2px solid #ef4444;
          border-radius: 8px;
          padding: 16px 10px;
          margin-bottom: 10px;
          font-family: monospace, sans-serif;
          font-size: 5.5rem;
          font-weight: 900;
          color: #ef4444;
          text-align: center;
          line-height: 1;
        }
        .scale-debug-bar {
          background-color: #fef3c7;
          border: 1px solid #fcd34d;
          color: #b45309;
          border-radius: 6px;
          padding: 8px;
          font-size: 11px !important;
          font-weight: 600;
          margin-bottom: 15px;
          line-height: 1.4;
        }
        .scale-action-weigh {
          width: 100%;
          height: 40px;
          font-weight: 700;
          font-size: 13px !important;
          border-radius: 6px;
          border: none;
          color: white;
          cursor: pointer;
          margin-bottom: 10px;
          transition: background-color 0.2s;
        }
        .scale-summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 15px;
          border-top: 1px dashed #cbd5e1;
          padding-top: 15px;
        }
        .scale-summary-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
        }
        .scale-summary-val {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }
        .scale-summary-final {
          grid-column: span 2;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px;
          margin-top: 4px;
        }
      ` }} />

      <div className="phieu-container">
        {/* Header Banner */}
        <div className="breadcrumb-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Truck size={24} />
            <span>
              {isViewMode ? "CHI TIẾT PHIẾU CÂN XE TRẠM CÂN 80 TẤN" : isEditMode ? "CẬP NHẬT PHIẾU CÂN XE TRẠM CÂN 80 TẤN" : "TẠO MỚI PHIẾU CÂN XE TRẠM CÂN 80 TẤN"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="sapo-btn sapo-btn-secondary" onClick={handleClose} style={{ background: "white", color: "#003466", border: "1px solid #cbd5e1" }}>
              Hủy
            </button>
            {!isViewMode && (
              <button className="sapo-btn sapo-btn-success" onClick={handleSave} disabled={isPending}>
                {isPending ? "Đang xử lý..." : "Lưu phiếu"}
              </button>
            )}
          </div>
        </div>

        {/* Content Body Grid */}
        <div className="form-layout">
          {/* Inputs Section */}
          <div className="form-card">
            <h3 className="form-card-title">I. Thông tin chung</h3>
            
            <div className="form-grid-2">
              <div>
                <label className="form-label">Số phiếu cân</label>
                <input 
                  type="text" 
                  className="input-block" 
                  disabled 
                  value={slipNumber} 
                />
              </div>
              <div>
                <label className="form-label">Ngày lập phiếu</label>
                <input 
                  type="text" 
                  className="input-block" 
                  disabled 
                  value={createdAtStr} 
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label className="form-label">Loại phiếu chính (*)</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input 
                      type="radio" 
                      name="formType" 
                      value="Nhập hàng"
                      checked={formType === "Nhập hàng"}
                      disabled={isViewMode}
                      onChange={() => setFormType("Nhập hàng")}
                    />
                    <span>Nhập hàng</span>
                  </label>
                  <label className="radio-option">
                    <input 
                      type="radio" 
                      name="formType" 
                      value="Xuất hàng"
                      checked={formType === "Xuất hàng"}
                      disabled={isViewMode}
                      onChange={() => setFormType("Xuất hàng")}
                    />
                    <span>Xuất hàng</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="form-label">Loại phiếu phụ (*)</label>
                <select 
                  className="input-block" 
                  value={formSubType}
                  disabled={isViewMode}
                  onChange={(e) => setFormSubType(e.target.value)}
                >
                  {subTypes.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label className="form-label">Nhà máy / Chi nhánh (*)</label>
                <select 
                  className="input-block"
                  value={formBranch}
                  disabled={isViewMode}
                  onChange={(e) => setFormBranch(e.target.value)}
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                  {branches.length === 0 && (
                    <>
                      <option value="Đồng Tháp">Đồng Tháp</option>
                      <option value="Đắk Lắk">Đắk Lắk</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="form-label">Nhóm sản phẩm (*)</label>
                <select 
                  className="input-block"
                  value={formProductGroup}
                  disabled={isViewMode}
                  onChange={(e) => setFormProductGroup(e.target.value)}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  {categories.length === 0 && (
                    <>
                      <option value="Xoài">Xoài</option>
                      <option value="Dừa">Dừa</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label className="form-label">Khách hàng / NCC đại diện (*)</label>
                <select 
                  className="input-block"
                  value={formCustomerSupplier}
                  disabled={isViewMode}
                  onChange={(e) => setFormCustomerSupplier(e.target.value)}
                >
                  <option value="">-- Chọn đối tác đại diện --</option>
                  {partners.map(p => (
                    <option key={`${p.type}-${p.id}`} value={p.name}>
                      [{p.type}] {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Biển số xe (*)</label>
                <input 
                  type="text" 
                  className="input-block" 
                  placeholder="Ví dụ: 64H-023.38" 
                  value={formLicensePlate}
                  disabled={isViewMode}
                  onChange={(e) => setFormLicensePlate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label className="form-label">Họ tên tài xế (*)</label>
                <input 
                  type="text" 
                  className="input-block" 
                  placeholder="Tên tài xế" 
                  value={formDriverName}
                  disabled={isViewMode}
                  onChange={(e) => setFormDriverName(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Trọng lượng nhập tay (nếu nhập thủ công)</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input 
                    type="number" 
                    className="input-block" 
                    placeholder="Lần 1 (kg)" 
                    value={formWeight1}
                    disabled={isViewMode}
                    onChange={(e) => setFormWeight1(e.target.value !== "" ? Number(e.target.value) : "")}
                  />
                  <input 
                    type="number" 
                    className="input-block" 
                    placeholder="Lần 2 (kg)" 
                    value={formWeight2}
                    disabled={isViewMode}
                    onChange={(e) => setFormWeight2(e.target.value !== "" ? Number(e.target.value) : "")}
                  />
                </div>
              </div>
            </div>

            <div className="form-group-full">
              <label className="form-label">Ghi chú phiếu cân (tùy chọn)</label>
              <textarea 
                className="input-block" 
                rows={3} 
                style={{ height: "auto" }}
                placeholder="Nhập ghi chú hoặc yêu cầu đặc biệt..."
                value={formNotes}
                disabled={isViewMode}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Scale Display Panel */}
          <div className="scale-panel">
            <div className="scale-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Kết quả cân xe</span>
              <button 
                type="button"
                onClick={() => setShowScaleSettings(!showScaleSettings)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#15803d",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  fontWeight: 700
                }}
              >
                <SlidersHorizontal size={12} />
                Cài đặt đầu cân
              </button>
            </div>
            
            <div className="scale-digits-box">
              {isViewMode ? (selectedSlip?.weight2 || selectedSlip?.weight1 || 0).toFixed(0) : scaleDisplayWeight}
            </div>

            {showScaleSettings && (
              <div style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "12px", marginBottom: "12px", textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: "12px", color: "#003466", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                  <span>CẤU HÌNH ĐẦU CÂN</span>
                  <button type="button" onClick={() => setShowScaleSettings(false)} style={{ color: "#64748b", border: "none", background: "none", cursor: "pointer", fontWeight: 700 }}>✕</button>
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Chế độ đầu cân:</label>
                  <select 
                    className="input-block" 
                    style={{ height: "30px", fontSize: "12px", width: "100%", padding: "4px 8px" }}
                    value={scaleMode}
                    onChange={(e) => {
                      const mode = e.target.value;
                      setScaleMode(mode);
                      localStorage.setItem("scale_mode", mode);
                    }}
                  >
                    <option value="sim">Trình giả lập (Simulator)</option>
                    <option value="physical">Đầu cân vật lý (Local COM)</option>
                  </select>
                </div>

                {scaleMode === "physical" && (
                  <>
                    <div style={{ marginBottom: "8px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Địa chỉ Service Cân (LAN/Local):</label>
                      <input 
                        type="text"
                        className="input-block"
                        style={{ height: "30px", fontSize: "12px", width: "100%", padding: "4px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", marginBottom: "8px" }}
                        placeholder="http://localhost:5000"
                        value={scaleServiceUrl}
                        onChange={(e) => {
                          const url = e.target.value;
                          setScaleServiceUrl(url);
                          localStorage.setItem("scale_service_url", url);
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: "8px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Chọn cổng COM:</label>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <select 
                          className="input-block" 
                          style={{ height: "30px", fontSize: "12px", flex: 1, padding: "4px 8px" }}
                          value={selectedComPort}
                          onChange={(e) => setSelectedComPort(e.target.value)}
                        >
                          {availablePorts.length === 0 ? (
                            <option value="">-- Không có cổng --</option>
                          ) : (
                            availablePorts.map(p => <option key={p} value={p}>{p}</option>)
                          )}
                        </select>
                        <button 
                          type="button" 
                          onClick={() => fetchAvailablePorts()} 
                          style={{ padding: "0 8px", border: "1px solid #cbd5e1", background: "#f8fafc", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="Làm mới cổng COM"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                    </div>

                    <div style={{ marginBottom: "8px" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>Tốc độ truyền (Baudrate):</label>
                      <select 
                        className="input-block" 
                        style={{ height: "30px", fontSize: "12px", width: "100%", padding: "4px 8px" }}
                        value={selectedBaudrate}
                        onChange={(e) => setSelectedBaudrate(Number(e.target.value))}
                      >
                        <option value="9600">9600 (Mặc định)</option>
                        <option value="4800">4800</option>
                        <option value="2400">2400</option>
                        <option value="1200">1200</option>
                        <option value="115200">115200</option>
                      </select>
                    </div>

                    {serviceConnectionError && (
                      <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "4px", lineHeight: "1.4" }}>
                        ⚠️ {serviceConnectionError}
                      </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                      <span style={{ fontSize: "10px", color: localServiceStatus === "connected" ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                        ● {localServiceStatus === "connected" ? `Đã kết nối (${activeComPort})` : "Chưa kết nối"}
                      </span>
                      <button 
                        type="button" 
                        className="sapo-btn sapo-btn-success" 
                        onClick={saveComPortConfig}
                        style={{ height: "26px", fontSize: "11px", padding: "0 10px" }}
                      >
                        Lưu & Kết nối
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {!isViewMode ? (
              <>
                <div className="scale-debug-bar">
                  {scaleMode === "physical" ? "📡 Dữ liệu Cổng COM cục bộ:" : "⚠️ DEBUG: Device Response"}
                  <br />
                  {deviceResponseTime || "Đang đọc..."}
                </div>

                {scaleMode === "sim" && (
                  <div style={{ marginBottom: "15px", textAlign: "left", background: "white", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
                    <label className="form-label" style={{ fontSize: "11px", marginBottom: "2px" }}>Trình giả lập cân (Kéo để chỉnh tải trọng xe):</label>
                    <input 
                      type="range" 
                      min="100" 
                      max="40000" 
                      value={scaleBaseWeight} 
                      onChange={(e) => setScaleBaseWeight(Number(e.target.value))}
                      style={{ width: "100%", cursor: "pointer" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                      <span>100 kg</span>
                      <span style={{ fontWeight: 700, color: "#ef4444" }}>{Number(scaleBaseWeight).toLocaleString()} kg</span>
                      <span>40,000 kg</span>
                    </div>
                  </div>
                )}

                {scaleMode === "physical" && (
                  <div style={{ marginBottom: "15px", padding: "8px", borderRadius: "6px", border: "1px solid #bbf7d0", background: "#f0fdf4", textAlign: "left", fontSize: "11px", color: "#15803d", fontWeight: 600 }}>
                    ℹ️ Đang nhận dữ liệu cân trực tiếp từ dịch vụ nền. Các thay đổi tải trọng sẽ tự động đồng bộ thời gian thực.
                  </div>
                )}

                <button 
                  className="scale-action-weigh" 
                  style={{ backgroundColor: "#ef4444" }}
                  onClick={handleWeigh1}
                >
                  Ghi nhận Cân Lần 1
                </button>
                
                <button 
                  className="scale-action-weigh" 
                  style={{ backgroundColor: "#64748b" }}
                  onClick={handleWeigh2}
                >
                  Ghi nhận Cân Lần 2
                </button>
              </>
            ) : (
              <div className="scale-debug-bar" style={{ background: "#f1f5f9", borderColor: "#cbd5e1", color: "#475569" }}>
                🔒 Trạng thái xem chi tiết<br />
                Đầu cân tự động khóa đọc dữ liệu
              </div>
            )}

            <div className="scale-summary-grid">
              <div>
                <div className="scale-summary-label">Cân lần 1</div>
                <div className="scale-summary-val" style={{ color: "#ef4444" }}>
                  {formWeight1 !== "" ? `${Number(formWeight1).toFixed(3)}` : "Chưa có"}
                </div>
              </div>
              <div>
                <div className="scale-summary-label">Cân lần 2</div>
                <div className="scale-summary-val" style={{ color: "#475569" }}>
                  {formWeight2 !== "" ? `${Number(formWeight2).toFixed(3)}` : "Chưa có"}
                </div>
              </div>
              <div className="scale-summary-final">
                <div className="scale-summary-label">Kết quả cuối (TL phiếu cân)</div>
                <div className="scale-summary-val" style={{ fontSize: "20px", color: "#16a34a", marginTop: "4px" }}>
                  {(formWeight1 !== "" && formWeight2 !== "") 
                    ? `${Math.abs(Number(formWeight1) - Number(formWeight2)).toFixed(3)} kg` 
                    : "Chưa có"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Success Toast */}
      {successMsg && (
        <div style={{
          position: "fixed",
          top: "30px",
          right: "30px",
          zIndex: 99999,
          background: "#ecfdf5",
          color: "#065f46",
          border: "1px solid #a7f3d0",
          padding: "1rem 1.5rem",
          borderRadius: "8px",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontWeight: 700
        }}>
          <span>✅</span>
          <div>{successMsg}</div>
        </div>
      )}
    </div>
  );
}

export default function PhieuCanFormPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif" }}>
        <p>Đang tải cấu trúc dữ liệu...</p>
      </div>
    }>
      <WeighingFormContent />
    </Suspense>
  );
}
