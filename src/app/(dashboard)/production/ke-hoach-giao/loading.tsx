export default function Loading() {
  return (
    <div style={{ padding: "0 10px", width: "100%", boxSizing: "border-box" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes skeleton-pulse {
            0% {
              background-color: #cbd5e1;
              opacity: 0.6;
            }
            50% {
              background-color: #e2e8f0;
              opacity: 0.9;
            }
            100% {
              background-color: #cbd5e1;
              opacity: 0.6;
            }
          }
          .skeleton-pulse {
            animation: skeleton-pulse 1.5s infinite ease-in-out;
          }
          @keyframes loading-spin {
            to { transform: rotate(360deg); }
          }
          .loading-spin {
            animation: loading-spin 1s linear infinite;
          }
        `
      }} />

      {/* Breadcrumb banner */}
      <div style={{
        backgroundColor: "#003466",
        color: "white",
        padding: "6px 15px",
        fontWeight: 700,
        display: "block",
        marginLeft: "-10px",
        marginRight: "-10px",
        marginBottom: "15px",
        fontSize: "13px"
      }}>
        PHÂN HỆ SẢN XUẤT &mdash; KẾ HOẠCH GIAO (ĐANG TẢI...)
      </div>

      <div style={{ display: "flex", gap: "1.5rem", width: "100%", fontFamily: '"Segoe UI", -apple-system, sans-serif', padding: "10px 0" }}>
        <div style={{ flex: "1 1 100%", width: "100%" }}>
          
          {/* Skeleton Filters */}
          <div style={{
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            padding: "10px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginTop: "10px",
            marginBottom: "15px"
          }}>
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="skeleton-pulse" style={{ height: "14px", width: "100px", borderRadius: "4px", marginBottom: "8px" }} />
                <div className="skeleton-pulse" style={{ height: "32px", width: "100%", borderRadius: "4px" }} />
              </div>
            ))}
          </div>

          {/* Skeleton Card Container */}
          <div style={{ border: "1px solid #cbd5e1", borderRadius: "6px", background: "#ffffff", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" }}>
            {/* Header */}
            <div style={{ backgroundColor: "#003466", color: "#ffffff", padding: "8px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #ff5c00" }}>
              <span style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase" }}>Lịch xuất hàng</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div className="loading-spin" style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#ffffff", borderRadius: "50%" }} />
                <span style={{ fontSize: "12px", opacity: 0.9 }}>Đang tải kế hoạch...</span>
              </div>
            </div>

            {/* Skeleton Grid body */}
            <div style={{ padding: "10px" }}>
              {/* Header weekday skeleton */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "8px" }}>
                {["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"].map((day, idx) => (
                  <div key={idx} className="skeleton-pulse" style={{ height: "28px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "12px", color: "transparent" }}>{day}</span>
                  </div>
                ))}
              </div>

              {/* Day cells skeleton */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "100px", gap: "6px" }}>
                {Array.from({ length: 28 }).map((_, idx) => (
                  <div key={idx} style={{ border: "1px solid #cbd5e1", borderRadius: "4px", padding: "6px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div className="skeleton-pulse" style={{ height: "14px", width: "20px", borderRadius: "2px" }} />
                    {idx % 5 === 2 && (
                      <div className="skeleton-pulse" style={{ height: "24px", width: "100%", borderRadius: "4px", marginTop: "4px" }} />
                    )}
                    {idx % 7 === 4 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div className="skeleton-pulse" style={{ height: "18px", width: "100%", borderRadius: "4px" }} />
                        <div className="skeleton-pulse" style={{ height: "18px", width: "80%", borderRadius: "4px" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
