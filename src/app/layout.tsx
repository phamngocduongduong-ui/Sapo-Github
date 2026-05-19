import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMS - Enterprise Management System",
  description: "Phần mềm quản lý doanh nghiệp tích hợp Kinh Doanh, Sản Xuất, Thu Mua",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import FirebaseAnalytics from "@/components/FirebaseAnalytics";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
          // Prevent mobile pinch-to-zoom
          document.addEventListener('touchmove', function (event) {
            if (event.touches.length > 1) {
              event.preventDefault();
            }
          }, { passive: false });

          // Prevent iOS Safari pinch-gesture zoom
          document.addEventListener('gesturestart', function (event) {
            event.preventDefault();
          });
        ` }} />
      </head>
      <body style={{ touchAction: "manipulation" }}>
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
