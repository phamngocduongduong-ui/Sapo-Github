import { Suspense } from "react";
import CheckEmployee from "./CheckEmployee";

export default function KiemTraPage() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      backgroundColor: "#f8fafc",
      padding: "20px"
    }}>
      <div style={{ width: "100%", maxWidth: "1200px" }}>
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
