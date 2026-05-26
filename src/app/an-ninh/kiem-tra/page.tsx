import { Suspense } from "react";
import CheckEmployee from "./CheckEmployee";

export default function KiemTraPage() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      minHeight: "100vh",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      backgroundColor: "#f8fafc",
      padding: "10px 20px 20px 20px"
    }}>
      <div style={{ width: "100%" }}>
        <Suspense fallback={
          <div className="check-loading-state" style={{ textAlign: "center", padding: "2rem" }}>
            <div className="loading-pulse"></div>
            <p style={{ marginTop: "1rem", color: "#64748b", fontFamily: "sans-serif" }}>Đang tải giao diện kiểm tra...</p>
          </div>
        }>
          <CheckEmployee />
        </Suspense>
      </div>
    </div>
  );
}
