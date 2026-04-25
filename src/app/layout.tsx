import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMS - Enterprise Management System",
  description: "Phần mềm quản lý doanh nghiệp tích hợp Kinh Doanh, Sản Xuất, Thu Mua",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
