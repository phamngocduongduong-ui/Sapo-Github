"use client";

import { useState, useTransition, useRef } from "react";
import { createCustomer, updateCustomer } from "./actions";

type Customer = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export default function CustomerTable({ initialCustomers }: { initialCustomers: Customer[] }) {
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleClose() {
    setShowModal(false);
    setEditingCustomer(null);
    setError(null);
    formRef.current?.reset();
  }

  function handleEdit(customer: Customer) {
    setEditingCustomer(customer);
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingCustomer) {
          await updateCustomer(editingCustomer.id, formData);
        } else {
          await createCustomer(formData);
        }
        handleClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0 }}>Danh sách Khách hàng</h3>
        <button
          className="btn btn-primary"
          onClick={() => { setEditingCustomer(null); setShowModal(true); }}
        >
          + Thêm mới
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "56px", textAlign: "center" }}>STT</th>
              <th>Mã KH</th>
              <th>Tên khách hàng</th>
              <th>Số điện thoại</th>
              <th>Email</th>
              <th>Địa chỉ</th>
              <th style={{ width: "80px", textAlign: "center" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {initialCustomers.map((customer, idx) => (
              <tr key={customer.id}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td style={{ fontWeight: 600 }}>{customer.code}</td>
                <td>{customer.name}</td>
                <td>{customer.phone ?? "—"}</td>
                <td>{customer.email ?? "—"}</td>
                <td>{customer.address ?? "—"}</td>
                <td style={{ textAlign: "center" }}>
                  <button
                    onClick={() => handleEdit(customer)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
                    title="Sửa"
                  >✏️</button>
                </td>
              </tr>
            ))}
            {initialCustomers.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "#888" }}>
                  Chưa có dữ liệu khách hàng.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
          }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="card" style={{ width: "100%", maxWidth: "500px", margin: "1rem" }}>
            <h3>{editingCustomer ? "✏️ Sửa Khách hàng" : "👥 Thêm Khách hàng mới"}</h3>
            {error && <div style={{ color: "#e74c3c", marginBottom: "1rem" }}>⚠️ {error}</div>}
            
            <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label>Mã khách hàng *</label>
                <input
                  type="text" name="code" className="input" required
                  defaultValue={editingCustomer?.code}
                  disabled={!!editingCustomer}
                />
              </div>
              <div>
                <label>Tên khách hàng *</label>
                <input
                  type="text" name="name" className="input" required
                  defaultValue={editingCustomer?.name}
                />
              </div>
              <div>
                <label>Số điện thoại</label>
                <input
                  type="tel" name="phone" className="input"
                  defaultValue={editingCustomer?.phone ?? ""}
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  type="email" name="email" className="input"
                  defaultValue={editingCustomer?.email ?? ""}
                />
              </div>
              <div>
                <label>Địa chỉ</label>
                <textarea
                  name="address" className="input" rows={2}
                  defaultValue={editingCustomer?.address ?? ""}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="button" className="btn" onClick={handleClose}>Thoát</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? "Đang lưu..." : editingCustomer ? "Cập nhật" : "Lưu lại"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
