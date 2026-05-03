/**
 * Định dạng số theo chuẩn Việt Nam:
 * - Dấu chấm (.) phân cách hàng nghìn
 * - Dấu phẩy (,) phân cách thập phân
 */
export const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  
  return new Intl.NumberFormat("vi-VN").format(num);
};

/**
 * Định dạng tiền tệ VND
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "0 ₫";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0 ₫";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(num);
};
