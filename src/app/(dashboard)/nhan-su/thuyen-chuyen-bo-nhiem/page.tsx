"use client";

import { useState, useEffect } from "react";

export default function TransferPromotionPage() {
  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 className="page-title">🔄 Thuyên chuyển, Bổ nhiệm</h1>
        <button className="btn btn-primary">+ Thêm mới</button>
      </div>
      
      <div className="card" style={{ textAlign: "center", padding: "5rem", color: "#888" }}>
        <h3>Tính năng đang được phát triển</h3>
        <p>Vui lòng quay lại sau.</p>
      </div>
    </div>
  );
}
