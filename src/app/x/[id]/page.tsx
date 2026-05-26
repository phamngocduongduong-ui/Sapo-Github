import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Truck, Calendar, Clock, ShieldCheck } from "lucide-react";
import QueueClient from "@/app/an-ninh/tai-xe/thu-tu/[id]/QueueClient";

export const revalidate = 0; // Force dynamic page re-rendering

function getCallTypeName(type: string) {
  switch (type) {
    case "can-xe":
      return "Cân xe";
    case "kho-vat-tu":
      return "Kho vật tư";
    case "kho-nguyen-lieu-cua-1":
      return "Kho nguyên liệu cửa 1";
    case "kho-nguyen-lieu-cua-2":
      return "Kho nguyên liệu cửa 2";
    default:
      return "Cân xe";
  }
}

export default async function DriverQueueDashboardPage({ params }: { params: { id: string } }) {
  const registration = await (prisma as any).securityregistration.findUnique({
    where: { id: params.id }
  });

  if (!registration) {
    notFound();
  }

  // Convert regDate to Vietnam calendar day (YYYY-MM-DD) to solve timezone offset boundary issues
  const dateStr = new Date(registration.timeIn).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  const startOfDay = new Date(`${dateStr}T00:00:00+07:00`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999+07:00`);

  const hasEnteredQueue = registration.status !== "Đã đăng ký" && registration.status !== "Đã vào";
  const isCompleted = registration.status === "Đã hoàn thành";

  // Get called state from global map
  const calledMap = (global as any).calledVehicles;
  const calledInfo = calledMap ? calledMap.get(registration.licensePlate) : null;
  const isCalled = registration.status === "Đã gọi xe" || !!calledInfo;

  // Fetch all same-day registrations, sorted by timeIn ascending
  const allSameDayRegs = await (prisma as any).securityregistration.findMany({
    where: {
      branch: registration.branch,
      timeIn: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: {
      timeIn: "asc"
    }
  });

  // Calculate global registration order number in the day
  const myGlobalIndex = allSameDayRegs.findIndex((r: any) => r.id === registration.id);
  const queueNumber = myGlobalIndex !== -1 ? myGlobalIndex + 1 : null;

  // Filter registrations of the same purpose
  const samePurposeRegs = allSameDayRegs.filter((r: any) => r.purpose === registration.purpose);

  // The wait-to-call queue only includes same-purpose vehicles with status "Đã vào cổng" (not called, not completed)
  const waitingToCallRegs = samePurposeRegs.filter((r: any) => r.status === "Đã vào cổng");
  
  // Sort by entry time (timeIn) ascending (first-in first-served)
  waitingToCallRegs.sort((a: any, b: any) => new Date(a.timeIn).getTime() - new Date(b.timeIn).getTime());

  // Find index in the waiting list
  const myIndexInWaiting = waitingToCallRegs.findIndex((r: any) => r.id === registration.id);
  const myQueuePos = myIndexInWaiting !== -1 ? myIndexInWaiting + 1 : null;
  const waitingInFront = myIndexInWaiting !== -1 ? myIndexInWaiting : 0;

  const formattedTime = new Date(registration.timeIn).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const formattedDate = new Date(registration.timeIn).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  // Step 2 properties (Đã vào cổng)
  const hasEntered = registration.status === "Đã vào cổng" || isCalled || isCompleted;
  const stepEntryColor = hasEntered ? "#10b981" : "#0284c7";

  // Step 3 properties (Chờ gọi / Đã gọi vào)
  const isStepCalledCompleted = isCalled || isCompleted;
  const isStepCalledActive = registration.status === "Đã vào cổng";
  const stepCalledColor = isStepCalledCompleted ? "#10b981" : (isStepCalledActive ? "#0284c7" : "#cbd5e1");

  // Step 4 properties (Chờ giao nhận / Đã hoàn thành)
  const isStepFinishCompleted = isCompleted;
  const isStepFinishActive = registration.status === "Đã gọi xe";
  const stepFinishColor = isStepFinishCompleted ? "#10b981" : (isStepFinishActive ? "#0284c7" : "#cbd5e1");

  return (
    <div 
      className="driver-page-container"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)",
        padding: "0.4rem 0.4rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .driver-card {
          background: white;
          width: 100%;
          max-width: 450px;
          border-radius: 15px;
          box-shadow: 0 10px 25px -10px rgba(0, 0, 0, 0.05), 0 4px 10px -5px rgba(0, 0, 0, 0.03);
          border: 1px solid #f1f5f9;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .driver-card-body {
          padding: 0.6rem 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .driver-left-col, .driver-right-col {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        @media (min-width: 768px) {
          .driver-page-container {
            padding: 1.5rem 1rem !important;
          }
        }
      `}} />

      {/* Dynamic Header */}
      <div className="driver-header" style={{ textAlign: "center", marginBottom: "0.25rem", maxWidth: "450px", width: "100%" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
          <div style={{ display: "inline-flex", background: "#e0f2fe", padding: "0.22rem", borderRadius: "7px" }}>
            <Truck size={16} color="#0284c7" />
          </div>
          <h1 style={{ fontSize: "0.98rem", fontWeight: 800, color: "#0f172a", margin: 0, textTransform: "uppercase" }}>
            Theo Dõi Hàng Đợi Tài Xế
          </h1>
        </div>
      </div>

      {/* Main card */}
      <div className="driver-card">
        {/* Status banner */}
        <div style={{
          background: isCompleted ? "linear-gradient(90deg, #10b981 0%, #059669 100%)" : "linear-gradient(90deg, #0284c7 0%, #0369a1 100%)",
          color: "white",
          padding: "0.35rem 0.55rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.42rem"
        }}>
          <ShieldCheck size={15} />
          <span style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
            {isCompleted ? "ĐÃ HOÀN THÀNH / ĐÃ RA CỔNG" : "ĐANG TRONG HÀNG ĐỢI XIN MỜI"}
          </span>
        </div>

        <div className="driver-card-body">
          <div className="driver-left-col">
          
          {/* Giant Queue Number Display */}
          <div style={{
            background: isCompleted ? "#f0fdf4" : (isCalled ? "#f0f9ff" : (!hasEnteredQueue ? "#fffbeb" : "#f0f9ff")),
            border: isCompleted ? "1.5px dashed #86efac" : (isCalled ? "1.5px dashed #bae6fd" : (!hasEnteredQueue ? "1.5px dashed #fef3c7" : "1.5px dashed #bae6fd")),
            borderRadius: "11px",
            padding: "0.45rem 0.55rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isCompleted ? "#166534" : (isCalled ? "#0369a1" : (!hasEnteredQueue ? "#b45309" : "#0369a1")), textTransform: "uppercase" }}>
              {isCompleted || isCalled || !hasEnteredQueue ? "Trạng thái xe" : "Vị trí hàng đợi chờ gọi"}
            </span>
            <div style={{ fontSize: isCompleted || isCalled || !hasEnteredQueue ? "2rem" : "2.4rem", fontWeight: 900, color: isCompleted ? "#10b981" : (isCalled ? "#0284c7" : (hasEnteredQueue ? "#0284c7" : "#d97706")), margin: "0.02rem 0", lineHeight: 1 }}>
              {isCompleted ? "ĐÃ RA CỔNG" : (isCalled ? "ĐÃ GỌI XE" : (hasEnteredQueue ? `#${myQueuePos}` : "CHỜ VÀO CỔNG"))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0", fontSize: "0.74rem", color: "#64748b", fontWeight: 500 }}>
              <span>Hàng đợi: <strong style={{ color: "#334155" }}>{registration.purpose}</strong></span>
              <span>Số thứ tự đăng ký trong ngày: <strong style={{ color: "#334155" }}>{queueNumber ? `#${queueNumber}` : "—"}</strong></span>
            </div>
          </div>

          {/* Queue Real-time Message */}
          {!isCompleted && !isCalled && (
            <div style={{
              background: !hasEnteredQueue ? "#fffbeb" : (waitingInFront === 0 ? "#fef3c7" : "#f8fafc"),
              border: !hasEnteredQueue ? "1px solid #fde68a" : (waitingInFront === 0 ? "1px solid #fde68a" : "1px solid #e2e8f0"),
              borderRadius: "8px",
              padding: "0.35rem 0.45rem",
              textAlign: "center",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: !hasEnteredQueue ? "#b45309" : (waitingInFront === 0 ? "#92400e" : "#475569")
            }}>
              {!hasEnteredQueue ? (
                <>📢 Vui lòng di chuyển xe đến cổng bảo vệ để xác nhận vào cổng và nhận số thứ tự.</>
              ) : waitingInFront === 0 ? (
                <>📢 Bạn đang là xe tiếp theo chuẩn bị được gọi!</>
              ) : (
                <>⏳ Có <strong style={{ color: "#0284c7", fontSize: "0.88rem" }}>{waitingInFront}</strong> xe khác đang xếp hàng chờ trước bạn</>
              )}
            </div>
          )}

          {/* Vehicle Information Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.22rem" }}>
            <h3 style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 0.04rem 0" }}>
              Thông tin đăng ký của bạn
            </h3>

            {/* License plate */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.12rem", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>Biển số xe:</span>
              <span style={{ fontSize: "0.84rem", fontWeight: 800, color: "#0f172a", background: "#f1f5f9", padding: "0.08rem 0.3rem", borderRadius: "5px" }}>
                {registration.licensePlate}
              </span>
            </div>

            {/* Driver Name */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.12rem", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>Tài xế:</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>{registration.driverName}</span>
            </div>

            {/* Unit */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.12rem", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>Đơn vị công tác:</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>{registration.unit}</span>
            </div>

            {/* Registration Time */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.12rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>Thời gian vào:</span>
              {registration.status === "Đã đăng ký" || registration.status === "Đã vào" ? (
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>—</span>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.28rem", fontSize: "0.76rem", color: "#475569", fontWeight: 600 }}>
                  <Clock size={11} color="#94a3b8" />
                  <span>{formattedTime}</span>
                  <span style={{ color: "#cbd5e1" }}>•</span>
                  <Calendar size={11} color="#94a3b8" />
                  <span>{formattedDate}</span>
                </div>
              )}
            </div>
          </div>
          </div>

          <div className="driver-right-col">
          {/* Progress Tracker Stepper */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0rem" }}>
            <h3 style={{ fontSize: "0.75rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em", margin: 0 }}>
              Tiến trình làm việc
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.32rem", paddingLeft: "0.48rem", position: "relative", borderLeft: "1.8px solid #e2e8f0", marginLeft: "0.38rem" }}>
              {/* Step 1: Đăng ký thành công */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.52rem", position: "relative" }}>
                <div style={{
                  position: "absolute",
                  left: "-1.05rem",
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  background: "#10b981",
                  border: "2px solid white"
                }} />
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#10b981" }}>1. Đăng ký thành công</span>
              </div>

              {/* Step 2: Đã vào cổng */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.52rem", position: "relative" }}>
                <div style={{
                  position: "absolute",
                  left: "-1.05rem",
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  background: stepEntryColor,
                  border: "2px solid white",
                  boxShadow: hasEntered ? "none" : "0 0 0 2px rgba(2, 132, 199, 0.2)"
                }} />
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: stepEntryColor }}>
                  2. Đã vào cổng
                </span>
              </div>

              {/* Step 3: Chờ gọi / Đã gọi vào */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.52rem", position: "relative" }}>
                <div style={{
                  position: "absolute",
                  left: "-1.05rem",
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  background: stepCalledColor,
                  border: "2px solid white",
                  boxShadow: isStepCalledActive ? "0 0 0 2px rgba(2, 132, 199, 0.2)" : "none"
                }} />
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: stepCalledColor }}>
                  {isStepCalledCompleted ? (
                    <>3. Đã gọi vào: {getCallTypeName(calledInfo?.type || "can-xe")}</>
                  ) : (
                    <>3. Chờ gọi {hasEntered ? `(${waitingInFront} xe trước)` : ""}</>
                  )}
                </span>
              </div>

              {/* Step 4: Hoàn thành (Xe ra cổng) */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.52rem", position: "relative" }}>
                <div style={{
                  position: "absolute",
                  left: "-1.05rem",
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  background: isCompleted ? "#10b981" : "#cbd5e1",
                  border: "2px solid white"
                }} />
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: isCompleted ? "#10b981" : "#94a3b8" }}>
                  {isCompleted ? "4. Hoàn thành (Xe đã ra cổng)" : "4. Hoàn thành"}
                </span>
              </div>
            </div>
          </div>

          {/* Auto Refresher Timer Component */}
          <QueueClient 
            licensePlate={registration.licensePlate}
            registrationId={registration.id}
            initialIsCompleted={isCompleted}
          />

          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "0.4rem", color: "#64748b", fontSize: "0.66rem", textAlign: "center" }}>
        © {new Date().getFullYear()} SAPO EMS. Vui lòng giữ trang này mở để cập nhật thứ tự.
      </div>
    </div>
  );
}
