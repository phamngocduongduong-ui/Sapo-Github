"use client";

import React, { useState, useEffect } from "react";
import { getDocuments } from "./van-thu/van-ban/actions";

export default function OverviewPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const data = await getDocuments();
      // Chỉ lấy các văn bản còn hiệu lực cho màn hình Thông báo
      const activeDocs = data.filter(
        (doc: any) => doc.status === "Còn hiệu lực" || doc.status === "Hiệu lực"
      );
      activeDocs.sort((a: any, b: any) => {
        const timeA = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0;
        const timeB = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0;
        return timeB - timeA;
      });
      setItems(activeDocs);
    } catch (e) {
      console.error("Lỗi tải danh sách văn bản:", e);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateInput: any) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="employee-page-container">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .employee-page-container {
          width: 100%;
          min-width: 0;
        }
        .employee-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          margin-top: 0 !important;
          padding: 10px 0px 10px 0px !important;
        }
        .employee-layout table,
        .employee-layout td,
        .employee-layout th,
        .employee-page-container .breadcrumb-banner {
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
          margin-bottom: 0 !important;
          margin-left: -10px;
          margin-right: -10px;
        }
        .panel-full {
          flex: 1 1 100%;
          width: 100%;
          min-width: 0;
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
        .base-table-wrapper {
          height: auto !important;
          min-height: unset !important;
          overflow-y: hidden !important;
          padding-top: 0px !important;
          padding-bottom: 0px !important;
          margin-top: 0px !important;
          overflow-x: auto !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          min-width: 100% !important;
          table-layout: fixed !important;
          margin-top: 0px !important;
        }
        .base-table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          background: #f1f5f9 !important;
          border-bottom: 2px solid #ff5c00 !important;
          border-right: 1px solid #cbd5e1 !important;
          text-align: center !important;
          vertical-align: middle !important;
          padding: 6px 4px !important;
          white-space: normal !important;
          word-break: break-word !important;
          line-height: 1.2 !important;
        }
        .base-table th:last-child {
          border-right: none !important;
        }
        .base-table td {
          padding: 6px 0.75rem !important;
          vertical-align: middle !important;
          color: #000 !important;
          font-weight: 600 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-right: 1px solid #e2e8f0 !important;
        }
        .base-table td:last-child {
          border-right: none !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
        .base-table tbody tr:hover {
          background-color: #f8fafc;
        }
      `,
        }}
      />

      {/* Banner chuẩn giống tất cả các bảng khác */}
      <div className="breadcrumb-banner">THÔNG BÁO</div>

      <div className="employee-layout">
        <div className="panel-full">
          <div className="base-table-wrapper">
            <table className="base-table">
              <thead>
                <tr>
                  <th className="th-first" style={{ width: "45px", textAlign: "center" }}>
                    STT
                  </th>
                  <th style={{ width: "100px" }}>Số văn bản</th>
                  <th style={{ width: "75px", textAlign: "center" }}>Ngày soạn</th>
                  <th style={{ width: "375px" }}>Tên văn bản</th>
                  <th style={{ width: "90px", textAlign: "center" }}>Chi nhánh</th>
                  <th style={{ width: "85px", textAlign: "center" }}>Ngày hiệu lực</th>
                  <th className="th-last" style={{ width: "60px", textAlign: "center" }}>
                    Tải
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                      Đang tải danh sách văn bản...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                      Chưa có văn bản thông báo nào
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    let attachments: any[] = [];
                    if (item.attachments) {
                      try {
                        attachments = JSON.parse(item.attachments);
                      } catch (e) {}
                    }

                    return (
                      <tr key={item.id}>
                        <td style={{ textAlign: "center" }}>{idx + 1}</td>
                        <td style={{ color: "#003466", fontWeight: 700 }}>{item.documentNumber}</td>
                        <td style={{ textAlign: "center" }}>{formatDate(item.draftDate)}</td>
                        <td
                          title={item.title}
                          style={{
                            maxWidth: "375px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.title}
                        </td>
                        <td
                          title={item.branch}
                          style={{
                            maxWidth: "90px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "center",
                          }}
                        >
                          {item.branch}
                        </td>
                        <td style={{ textAlign: "center" }}>{formatDate(item.effectiveDate)}</td>
                        <td style={{ textAlign: "center" }}>
                          {attachments && attachments.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                              {attachments.map((att: any, attIdx: number) => (
                                <div key={attIdx} style={{ display: "inline-flex", alignItems: "center" }}>
                                  {att.fileContent ? (
                                    <a
                                      href={att.fileContent}
                                      download={att.fileName || `${item.documentNumber}.pdf`}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        color: "#2563eb",
                                        textDecoration: "underline",
                                        fontWeight: 600,
                                        fontSize: "12px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Tải PDF
                                    </a>
                                  ) : (
                                    <span style={{ color: "#94a3b8", fontWeight: 400 }}>Không có</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontWeight: 400 }}>Không có</span>
                          )}
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
  );
}
