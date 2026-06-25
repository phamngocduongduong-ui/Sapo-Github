"use client";
import { useState, useTransition, useEffect } from "react";
import { createBank, updateBank, updateBankStatus, deleteBank } from "./actions";
import HistoryModal from "../../HistoryModal";

type Bank = {
  id: string;
  code: string;
  bankAccount: string;
  bankName: string;
  bankAddress: string;
  beneficiaryName: string;
  swiftCode: string;
  beneficiaryAddress: string;
  status: string;
  note: string | null;
  createdAt: Date;
};

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  "Hoạt động": { label: "Hoạt động", badge: "badge-success" },
  "Ngưng hoạt động": { label: "Ngưng hoạt động", badge: "badge-danger" },
};

export default function BankTable({ initialBanks }: { initialBanks: Bank[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form states
  const [formCode, setFormCode] = useState("");
  const [formBankAccount, setFormBankAccount] = useState("");
  const [formBankName, setFormBankName] = useState("");
  const [formBankAddress, setFormBankAddress] = useState("");
  const [formBeneficiaryName, setFormBeneficiaryName] = useState("");
  const [formSwiftCode, setFormSwiftCode] = useState("");
  const [formBeneficiaryAddress, setFormBeneficiaryAddress] = useState("");
  const [formNote, setFormNote] = useState("");
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);

  useEffect(() => {
    fetch("/api/user-permissions")
      .then(res => res.json())
      .then(data => setIsAdmin(data.isAdmin || false))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const selectedBank = initialBanks.find(b => b.id === selectedBankId);
  const selectedStatus = selectedBank?.status;

  function handleEdit(bank: Bank) {
    setSelectedBankId(bank.id);
    setFormCode(bank.code);
    setFormBankAccount(bank.bankAccount);
    setFormBankName(bank.bankName);
    setFormBankAddress(bank.bankAddress);
    setFormBeneficiaryName(bank.beneficiaryName);
    setFormSwiftCode(bank.swiftCode);
    setFormBeneficiaryAddress(bank.beneficiaryAddress);
    setFormNote(bank.note ?? "");
    setIsEditing(true);
    setIsViewOnly(false);
    setError(null);
    setSuccess(null);
  }

  function handleResetForm() {
    setSelectedBankId(null);
    setFormCode("");
    setFormBankAccount("");
    setFormBankName("");
    setFormBankAddress("");
    setFormBeneficiaryName("");
    setFormSwiftCode("");
    setFormBeneficiaryAddress("");
    setFormNote("");
    setIsEditing(false);
    setIsViewOnly(false);
    setError(null);
  }

  function handleStatusUpdate(id: string, newStatus: string) {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái tài khoản ngân hàng này?`)) return;
    startTransition(async () => {
      try {
        await updateBankStatus(id, newStatus);
        setSuccess("Cập nhật trạng thái thành công!");
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Bạn có chắc chắn muốn xóa tài khoản ngân hàng này?")) return;
    startTransition(async () => {
      try {
        await deleteBank(id);
        setSuccess("Xóa tài khoản ngân hàng thành công!");
        handleResetForm();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (
      !formCode.trim() || 
      !formBankAccount.trim() || 
      !formBankName.trim() || 
      !formBankAddress.trim() || 
      !formBeneficiaryName.trim() || 
      !formSwiftCode.trim() || 
      !formBeneficiaryAddress.trim()
    ) {
      setError("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    const formData = new FormData();
    formData.append("code", formCode.trim().toUpperCase());
    formData.append("bankAccount", formBankAccount.trim());
    formData.append("bankName", formBankName.trim());
    formData.append("bankAddress", formBankAddress.trim());
    formData.append("beneficiaryName", formBeneficiaryName.trim());
    formData.append("swiftCode", formSwiftCode.trim().toUpperCase());
    formData.append("beneficiaryAddress", formBeneficiaryAddress.trim());
    formData.append("note", formNote.trim());
    formData.append("status", selectedStatus || "Hoạt động");

    startTransition(async () => {
      try {
        if (isEditing && selectedBankId) {
          await updateBank(selectedBankId, formData);
          setSuccess("Cập nhật thông tin tài khoản ngân hàng thành công!");
          handleResetForm();
        } else {
          await createBank(formData);
          setSuccess("Thêm tài khoản ngân hàng mới thành công!");
          handleResetForm();
        }
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <div className="bank-page-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .bank-page-container {
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .bank-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px 10px 0px;
        }
        .bank-layout input,
        .bank-layout select,
        .bank-layout textarea,
        .bank-layout button,
        .bank-layout table,
        .bank-layout td,
        .bank-layout th,
        .bank-layout label,
        .bank-layout .badge,
        .bank-layout .blue-panel-header,
        .bank-page-container .breadcrumb-banner {
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
        .panel-left {
          flex: 1 1 55%;
          min-width: 300px;
        }
        .panel-right {
          flex: 0 0 40%;
          min-width: 320px;
        }
        @media (max-width: 1024px) {
          .bank-layout {
            flex-direction: column;
          }
          .panel-right {
            flex: 1 1 100%;
          }
        }
        .blue-panel {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
        }
        .blue-panel-header {
          background-color: #003466;
          color: #ffffff;
          padding: 6px 15px 6px 15px;
          font-weight: 700;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #ff5c00;
        }
        .blue-panel-body {
          padding: 10px;
        }
        .search-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 5px 0px 10px 0px;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .form-btn-group {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-top: 0.5rem;
          padding-bottom: 15px;
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
          font-size: 0.85rem;
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
        .sapo-btn-secondary {
          background-color: #475569;
        }
        .sapo-btn-secondary:hover {
          background-color: #334155;
        }
        .sapo-btn-success {
          background-color: #22c55e;
        }
        .sapo-btn-success:hover {
          background-color: #16a34a;
        }
        .sapo-btn-warning {
          background-color: #f59e0b;
        }
        .sapo-btn-warning:hover {
          background-color: #d97706;
        }
        .sapo-btn-danger {
          background-color: #ef4444;
        }
        .sapo-btn-danger:hover {
          background-color: #dc2626;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 0.75rem;
        }
        .form-group label {
          font-weight: 700;
          font-size: 0.85rem;
          color: #003466;
          text-transform: uppercase;
        }
        .form-group input, .form-group textarea {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 500;
        }
        .form-group input:focus, .form-group textarea:focus {
          outline: none;
          border-color: #2b6cb0;
          box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.15);
        }
        .row-selected {
          background-color: #eff6ff !important;
        }
        .row-hoverable:hover {
          background-color: #f8fafc;
          cursor: pointer;
        }
        .required-star {
          color: #ef4444;
          font-weight: bold;
        }
        .form-desc {
          font-size: 0.8rem;
          font-style: italic;
          color: #64748b;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }
        .table th,
        .table td {
          text-align: center !important;
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
        .table-container {
          margin-left: 0px;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          width: 100%;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f7fafc;
        }
        .table-container::-webkit-scrollbar {
          height: 6px;
        }
        .table-container::-webkit-scrollbar-track {
          background: #f7fafc;
        }
        .table-container::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }
        .table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
        }
        .badge {
          font-size: 13px !important;
          font-weight: 700 !important;
          display: inline-block;
          background-color: transparent !important;
          padding: 0 !important;
        }
        .badge-success {
          background-color: transparent !important;
          color: #22c55e !important;
        }
        .badge-danger {
          background-color: transparent !important;
          color: #ef4444 !important;
        }
        @media (max-width: 768px) {
          .bank-page-container {
            max-width: 100% !important;
            width: 100% !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          .bank-layout {
            max-width: 100% !important;
            width: 100% !important;
            overflow-x: hidden !important;
            gap: 1rem !important;
            padding: 10px 0 !important;
            box-sizing: border-box !important;
          }
          .panel-left, .panel-right {
            flex: none !important;
            min-width: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .blue-panel {
            min-width: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .blue-panel-body {
            min-width: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }
          .table-container {
            margin-left: 0px !important;
            overflow: auto !important;
            overflow-y: hidden !important;
            -webkit-overflow-scrolling: touch !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
            box-sizing: border-box !important;
          }
          .table {
            min-width: 600px !important;
            width: 100% !important;
            table-layout: auto !important;
          }
        }
      ` }} />

      <div className="breadcrumb-banner">
        DANH MỤC TÀI KHOẢN NGÂN HÀNG
      </div>

      <div className="bank-layout">
        {/* Left Panel: List */}
        <div className="panel-left">
          <div className="blue-panel">
            <div className="blue-panel-header">Danh sách tài khoản ngân hàng</div>
            <div className="blue-panel-body">
              
              <div className="search-container">
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <button 
                    type="button" 
                    className="sapo-btn" 
                    onClick={handleResetForm}
                  >
                    Tạo mới
                  </button>

                  {selectedBankId && selectedStatus === "Ngưng hoạt động" && (
                    <button 
                      type="button" 
                      className="sapo-btn" 
                      onClick={() => handleStatusUpdate(selectedBankId, "Hoạt động")}
                      disabled={isPending}
                    >
                      Kích hoạt
                    </button>
                  )}

                  {selectedBankId && selectedStatus === "Hoạt động" && (
                    <button 
                      type="button" 
                      className="sapo-btn" 
                      onClick={() => handleStatusUpdate(selectedBankId, "Ngưng hoạt động")}
                      disabled={isPending}
                    >
                      Ngưng kích hoạt
                    </button>
                  )}

                  {selectedBankId && isAdmin && (
                    <button 
                      type="button" 
                      className="sapo-btn sapo-btn-danger" 
                      onClick={() => handleDelete(selectedBankId)}
                      disabled={isPending}
                    >
                      Xóa
                    </button>
                  )}
                  
                  {selectedBankId && (
                    <button 
                      type="button" 
                      className="sapo-btn sapo-btn-secondary" 
                      onClick={() => setHistoryRecordId(selectedBankId)}
                    >
                      Lịch sử
                    </button>
                  )}
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px", textAlign: "center" }}>STT</th>
                      <th>Mã gợi nhớ</th>
                      <th>Số tài khoản</th>
                      <th>SWIFT Code</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialBanks.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "#888", padding: "2rem" }}>
                          Không tìm thấy tài khoản ngân hàng nào
                        </td>
                      </tr>
                    ) : (
                      initialBanks.map((bank, idx) => {
                        const st = STATUS_MAP[bank.status] ?? { label: bank.status, badge: "badge-warning" };
                        const isSelected = selectedBankId === bank.id;
                        return (
                           <tr 
                            key={bank.id} 
                            className={`row-hoverable ${isSelected ? "row-selected" : ""}`}
                            onClick={() => handleEdit(bank)}
                          >
                            <td style={{ textAlign: "center" }}>{idx + 1}</td>
                            <td style={{ fontWeight: 700, color: "#003466" }}>{bank.code}</td>
                            <td>{bank.bankAccount}</td>
                            <td>{bank.swiftCode}</td>
                            <td style={{ textAlign: "center" }}>
                              <span className={`badge ${st.badge}`}>{st.label}</span>
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
        </div>

        {/* Right Panel: Form */}
        <div className="panel-right">
          <div className="blue-panel">
            <div className="blue-panel-header">
              {isViewOnly ? "Chi tiết Tài khoản" : (isEditing ? "Sửa Tài khoản" : "Thêm Tài khoản")}
            </div>
            <div className="blue-panel-body">

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>
                    Mã gợi nhớ <span className="required-star">(*)</span>
                  </label>
                  <input 
                    type="text" 
                    name="code" 
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    disabled={isViewOnly || isEditing} 
                    placeholder="Ví dụ: VCB_USD"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>
                    Số tài khoản ngân hàng <span className="required-star">(*)</span>
                  </label>
                  <input 
                    type="text" 
                    name="bankAccount" 
                    value={formBankAccount}
                    onChange={(e) => setFormBankAccount(e.target.value)}
                    disabled={isViewOnly} 
                    placeholder="Nhập số tài khoản..."
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>
                    Tên ngân hàng <span className="required-star">(*)</span>
                  </label>
                  <input 
                    type="text" 
                    name="bankName" 
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    disabled={isViewOnly} 
                    placeholder="Ví dụ: VIETCOMBANK CHI NHÁNH TP HCM..."
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>
                    Địa chỉ ngân hàng <span className="required-star">(*)</span>
                  </label>
                  <input 
                    type="text" 
                    name="bankAddress" 
                    value={formBankAddress}
                    onChange={(e) => setFormBankAddress(e.target.value)}
                    disabled={isViewOnly} 
                    placeholder="Nhập địa chỉ chi nhánh ngân hàng..."
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>
                    Người thụ hưởng (Beneficiary) <span className="required-star">(*)</span>
                  </label>
                  <input 
                    type="text" 
                    name="beneficiaryName" 
                    value={formBeneficiaryName}
                    onChange={(e) => setFormBeneficiaryName(e.target.value)}
                    disabled={isViewOnly} 
                    placeholder="Tên đơn vị/cá nhân thụ hưởng..."
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>
                    Mã SWIFT Code <span className="required-star">(*)</span>
                  </label>
                  <input 
                    type="text" 
                    name="swiftCode" 
                    value={formSwiftCode}
                    onChange={(e) => setFormSwiftCode(e.target.value.toUpperCase())}
                    disabled={isViewOnly} 
                    placeholder="Mã SWIFT Code..."
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>
                    Địa chỉ người thụ hưởng <span className="required-star">(*)</span>
                  </label>
                  <input 
                    type="text" 
                    name="beneficiaryAddress" 
                    value={formBeneficiaryAddress}
                    onChange={(e) => setFormBeneficiaryAddress(e.target.value)}
                    disabled={isViewOnly} 
                    placeholder="Địa chỉ đăng ký của người thụ hưởng..."
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Ghi chú</label>
                  <textarea 
                    name="note" 
                    rows={2} 
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    disabled={isViewOnly}
                    placeholder="Ghi chú thêm..."
                  />
                </div>

                <div className="form-desc">
                  (*) Các trường có dấu sao đỏ là bắt buộc nhập.
                </div>

                <div className="form-btn-group">
                  {!isViewOnly && (
                    <button type="submit" className="sapo-btn" disabled={isPending}>
                      {isPending ? "Đang lưu..." : "Lưu thông tin"}
                    </button>
                  )}
                  
                  <button 
                    type="button" 
                    className="sapo-btn sapo-btn-secondary" 
                    onClick={handleResetForm}
                  >
                    Làm mới
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      </div>

      {historyRecordId && (
        <HistoryModal 
          tableName="Bank" 
          recordId={historyRecordId} 
          onClose={() => setHistoryRecordId(null)} 
        />
      )}

      {/* Floating Toast Notification */}
      {(success || error) && (
        <div style={{
          position: "fixed",
          top: "80px",
          right: "20px",
          zIndex: 9999,
          pointerEvents: "none"
        }}>
          {success && (
            <div style={{
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              padding: "0.75rem 1.25rem",
              borderRadius: "6px",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 700,
              fontSize: "0.9rem",
              pointerEvents: "auto",
              marginBottom: "10px",
              minWidth: "250px"
            }}>
              <span>✅</span>
              <div>{success}</div>
            </div>
          )}
          {error && (
            <div style={{
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              padding: "0.75rem 1.25rem",
              borderRadius: "6px",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: 700,
              fontSize: "0.9rem",
              pointerEvents: "auto",
              marginBottom: "10px",
              minWidth: "250px"
            }}>
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
