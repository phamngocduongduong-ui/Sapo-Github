"use client";

import { useEffect } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

interface PrintContractClientProps {
  contract: any;
  customer: any;
  sellerDetails?: any;
}

// Local formatter helper
function formatNumber(num: number): string {
  if (num === undefined || num === null) return "0";
  const parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function formatNumber2Dec(num: number): string {
  if (num === undefined || num === null) return "0.00";
  const parts = num.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

// English Number to Words helper
function numberToEnglishWords(num: number): string {
  if (num === 0) return "Zero";
  
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Million", "Billion"];

  function convertChunk(n: number): string {
    let s = "";
    if (n >= 100) {
      s += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      s += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      s += ones[n] + " ";
    }
    return s.trim();
  }

  let words = "";
  let scaleIndex = 0;
  
  let integerPart = Math.floor(num);
  let decimalPart = Math.round((num - integerPart) * 100);
  
  if (integerPart === 0) {
    words = "Zero";
  } else {
    while (integerPart > 0) {
      const chunk = integerPart % 1000;
      if (chunk > 0) {
        const chunkWords = convertChunk(chunk);
        words = chunkWords + " " + scales[scaleIndex] + " " + words;
      }
      integerPart = Math.floor(integerPart / 1000);
      scaleIndex++;
    }
  }
  
  words = words.trim();
  
  if (decimalPart > 0) {
    words += " and Cents " + convertChunk(decimalPart);
  }
  
  return words.trim() + " US Dollars";
}

function getDocLabel(key: string, label: string): string {
  const lower = (key || label || "").toLowerCase();
  if (lower.includes("invoice")) return "Commercial Invoice";
  if (lower.includes("packing")) return "Packing List";
  if (lower.includes("lading") || lower.includes("b/l")) return "Bill of Lading";
  if (lower.includes("origin") || lower.includes("co ")) return "Certificate of Original form EUR.1";
  if (lower.includes("phytosanitary")) return "Certificate of Phytosanitary";
  if (lower.includes("coa") || lower.includes("analysis")) return "Certificate of Analysis";
  if (lower.includes("fumigation")) return "Fumigation";
  return label;
}

function getBuyerRepresentative(customer: any): string {
  if (!customer) return "";
  return customer.representative || "";
}

export default function PrintContractClient({ contract, customer, sellerDetails }: PrintContractClientProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Calculate totals
  const totalQuantity = contract.contractitem.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  const totalAmount = contract.contractitem.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

  // Parse documents
  let activeDocs: any[] = [];
  if (contract.accompanyingDocuments) {
    try {
      const parsed = JSON.parse(contract.accompanyingDocuments);
      if (Array.isArray(parsed)) {
        activeDocs = parsed.filter((d: any) => d.original || d.copy);
      }
    } catch (e) {}
  }

  const formattedExpiryDate = contract.expiryDate
    ? new Date(contract.expiryDate).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })
    : "Dec 31, 2026";

  // Check if any bank field is populated
  const hasBankInfo = !!(
    contract.bankName ||
    contract.bankAccount ||
    contract.swiftCode ||
    contract.bankAddress ||
    contract.beneficiaryName ||
    contract.beneficiaryAddress
  );

  return (
    <div className="print-container">
      {/* Watermark */}
      <div className={`watermark ${contract.status === "Đã phê duyệt" ? "approved" : ""}`}>
        {contract.status === "Đã phê duyệt" ? "Approved" : "Draft"}
      </div>

      {/* Floating control bar (Hidden during print) */}
      <div className="control-bar no-print">
        <button className="ctrl-btn" onClick={() => router.back()}>
          <ArrowLeft size={16} /> Quay lại (Back)
        </button>
        <button className="ctrl-btn primary-btn" onClick={() => window.print()}>
          <Printer size={16} /> In hợp đồng (Print)
        </button>
      </div>

      {/* Contract Page Layout */}
      <div className="a4-page">
        {/* Unified Contract Table */}
        <table className="unified-contract-table">
          <tbody>
            {/* Header */}
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "12px", borderBottom: "1px solid #000" }}>
                <h1 className="main-title" style={{ fontSize: "16pt", margin: "0", fontWeight: "bold" }}>SALES CONTRACT</h1>
                <p style={{ margin: "5px 0 0 0", fontSize: "11pt" }}>
                  <strong>No:</strong> {contract.contractNumber} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>Dated:</strong> {new Date(contract.contractDate).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </td>
            </tr>

            {/* Seller & Buyer Info */}
            <tr>
              <td colSpan={6} style={{ padding: "0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "50%", verticalAlign: "top", padding: "10px", borderRight: "1px solid #000", borderBottom: "none", borderTop: "none", borderLeft: "none" }}>
                        <p style={{ margin: "0 0 5px 0" }}><strong>THE SELLER:</strong></p>
                        <p style={{ margin: "0 0 5px 0" }}><strong>{contract.seller}</strong></p>
                        <p style={{ margin: "0 0 5px 0", textTransform: "uppercase" }}>
                          {sellerDetails?.address || "Số 266 Đội Cấn, Phường Liễu Giai, Quận Ba Đình, Hà Nội, Việt Nam"}
                        </p>
                        <p style={{ margin: "0 0 5px 0" }}>
                          Represented : {sellerDetails?.representative || "Ông Nguyễn Minh Quý — Giám đốc"}
                        </p>
                        <p style={{ margin: 0 }}>
                          Email: {sellerDetails?.email || "contact@sapo.vn"}
                        </p>
                      </td>
                      <td style={{ width: "50%", verticalAlign: "top", padding: "10px", border: "none" }}>
                        <p style={{ margin: "0 0 5px 0" }}><strong>THE BUYER:</strong></p>
                        <p style={{ margin: "0 0 5px 0" }}><strong>{contract.buyer}</strong></p>
                        <p style={{ margin: "0 0 5px 0" }}>{customer?.address || "—"}</p>
                        <p style={{ margin: "0 0 5px 0" }}>Represented : {getBuyerRepresentative(customer)}</p>
                        <p style={{ margin: 0 }}>Email: {customer?.email || "—"}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* Intro Clause */}
            <tr>
              <td colSpan={6} style={{ padding: "10px", borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                After discuss both side have agreed to sign the contract with terms and conditions as below:
              </td>
            </tr>

            {/* Article I Title */}
            <tr>
              <th colSpan={6} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #000" }}>
                ARTICLE I : DESCRIPTION-QUANTITY-UNIT/PRICE-AMOUNT:
              </th>
            </tr>

            {/* Commodity Headers */}
            <tr style={{ textAlign: "center", fontWeight: "bold", background: "#f2f2f2" }}>
              <td style={{ width: "6%", textAlign: "center" }}>NO</td>
              <td style={{ width: "44%", textAlign: "center" }}>DESCRIPTION</td>
              <td style={{ width: "15%", textAlign: "center" }}>QUANTITY<br/>(+/- 10%)</td>
              <td style={{ width: "10%", textAlign: "center" }}>UNIT</td>
              <td style={{ width: "10%", textAlign: "center" }}>UNIT PRICE</td>
              <td style={{ width: "15%", textAlign: "center" }}>AMOUNT<br/>(USD)</td>
            </tr>

            {/* Commodity Items */}
            {contract.contractitem.map((item: any, idx: number) => (
              <tr key={item.id || idx}>
                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                <td>
                  <strong style={{ display: "block" }}>{item.productName}</strong>
                  {item.packaging && <div style={{ fontSize: "0.85rem", marginTop: "4px" }}>Packed: {item.packaging}</div>}
                  {item.note && <div style={{ fontSize: "0.85rem", fontStyle: "italic", color: "#555" }}>Note: {item.note}</div>}
                </td>
                <td style={{ textAlign: "right" }}>
                  {formatNumber(item.quantity)}
                </td>
                <td style={{ textAlign: "center" }}>
                  {item.unit || "—"}
                </td>
                <td style={{ textAlign: "right" }}>
                  ${formatNumber2Dec(item.price)}
                </td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  ${formatNumber2Dec(item.amount)}
                </td>
              </tr>
            ))}

            {/* Total Row */}
            <tr style={{ fontWeight: "bold" }}>
              <td colSpan={2} style={{ textAlign: "center" }}>TOTAL</td>
              <td style={{ textAlign: "right" }}>{formatNumber(totalQuantity)}</td>
              <td></td>
              <td></td>
              <td style={{ textAlign: "right" }}>${formatNumber2Dec(totalAmount)}</td>
            </tr>

            {/* Say Words Row */}
            <tr>
              <td colSpan={6} style={{ padding: "8px 10px", fontSize: "10.5pt", borderBottom: "1px solid #000" }}>
                <strong>Say:</strong> {numberToEnglishWords(totalAmount)}
              </td>
            </tr>

            {/* Note Row */}
            <tr>
              <td colSpan={6} style={{ padding: "8px 10px", fontSize: "9.5pt", fontStyle: "italic", borderBottom: "1px solid #000" }}>
                <strong>Note:</strong> The actual value of the contract will be based on the actual value of the quantity of loaded goods mentioned in the original invoice.
              </td>
            </tr>

            {/* ARTICLE II Header */}
            <tr>
              <th colSpan={6} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #000" }}>
                ARTICLE II : QUALITY-PACKING-SHIPMENT
              </th>
            </tr>

            {/* Article II Body Rows */}
            <tr>
              <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Quality</td>
              <td colSpan={4} style={{ padding: "8px 10px" }}>As Specification which has been agreed by both parties.</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Packing</td>
              <td colSpan={4} style={{ padding: "8px 10px" }}>Blank and brown cartons with label, sealed with clear/color tape.</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Delivery time</td>
              <td colSpan={4} style={{ padding: "8px 10px" }}>{contract.deliveryDate || "—"}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Port of Loading</td>
              <td colSpan={4} style={{ padding: "8px 10px" }}>{contract.portOfLoading || "Hochiminh port, Vietnam"}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Port of Destination</td>
              <td colSpan={4} style={{ padding: "8px 10px" }}>{contract.portOfDischarge || "—"}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Partial Shipment</td>
              <td colSpan={4} style={{ padding: "8px 10px" }}>{contract.partialShipment === "Allowed" ? "Allowed" : "Not Allowed"}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Transshipment</td>
              <td colSpan={4} style={{ padding: "8px 10px" }}>{contract.transshipment === "Allowed" ? "Allowed" : "Not Allowed"}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Temp recorder</td>
              <td colSpan={4} style={{ padding: "8px 10px" }}>
                {contract.thermometer
                  ? contract.thermometerQty > 0
                    ? `Yes (${contract.thermometerQty})`
                    : "Yes"
                  : "No"}
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Pallet</td>
              <td colSpan={4} style={{ padding: "8px 10px" }}>{contract.pallet ? "Yes" : "No"}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Delivery terms</td>
              <td colSpan={4} style={{ padding: "8px 10px" }}>
                <span style={{ marginRight: "15px" }}>{contract.deliveryTerms === "EXW" ? "☑" : "☐"} EXW</span>
                <span style={{ marginRight: "15px" }}>{contract.deliveryTerms === "FOB" ? "☑" : "☐"} FOB</span>
                <span style={{ marginRight: "15px" }}>{contract.deliveryTerms === "FCA" ? "☑" : "☐"} FCA</span>
                <span style={{ marginRight: "15px" }}>{contract.deliveryTerms === "CFR" ? "☑" : "☐"} CFR</span>
                <span>{contract.deliveryTerms === "CIF" ? "☑" : "☐"} CIF</span>
              </td>
            </tr>

            {/* ARTICLE III Header */}
            <tr>
              <th colSpan={6} style={{ textAlign: "left", padding: "8px 10px", borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                ARTICLE III : TERM AND PAYMENT
              </th>
            </tr>

            {/* Article III Body Rows */}
            <tr>
              <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Method of payment</td>
              <td colSpan={4} style={{ padding: "8px 10px" }}>
                <span style={{ marginRight: "15px" }}>{contract.paymentMethod === "T/T" ? "☑" : "☐"} T/T</span>
                <span style={{ marginRight: "15px" }}>{contract.paymentMethod === "CAD" ? "☑" : "☐"} CAD</span>
                <span style={{ marginRight: "15px" }}>{contract.paymentMethod === "L/C at sight" ? "☑" : "☐"} L/C at sight</span>
                <span>{contract.paymentMethod === "D/P at sight" ? "☑" : "☐"} D/P at sight</span>
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Term of payment</td>
              <td colSpan={4} style={{ padding: "8px 10px" }}>{contract.paymentTerms || "—"}</td>
            </tr>
            {hasBankInfo && (
              <tr>
                <td colSpan={2} style={{ fontWeight: "bold", padding: "8px 10px" }}>Bank account information</td>
                <td colSpan={4} style={{ padding: "8px 10px", lineHeight: "1.6" }}>
                  {contract.bankAccount && <div><strong>Account No:</strong> {contract.bankAccount}</div>}
                  {contract.beneficiaryName && <div><strong>Account name:</strong> {contract.beneficiaryName}</div>}
                  {contract.bankName && <div><strong>Bank name:</strong> {contract.bankName}</div>}
                  {contract.bankAddress && <div><strong>Address :</strong> {contract.bankAddress}</div>}
                  {contract.swiftCode && <div><strong>Swift Code :</strong> {contract.swiftCode}</div>}
                  {contract.beneficiaryAddress && <div><strong>Beneficiary Address :</strong> {contract.beneficiaryAddress}</div>}
                </td>
              </tr>
            )}
            {/* ARTICLE IV Header */}
            <tr>
              <th colSpan={6} style={{ textAlign: "left", padding: "8px 10px", borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                ARTICLE IV : REQUIRED DOCUMENTS:
              </th>
            </tr>

            {/* Document Table Column Headers */}
            <tr style={{ textAlign: "center", fontWeight: "bold", background: "#f2f2f2" }}>
              <td style={{ width: "6%", textAlign: "center" }}>No</td>
              <td style={{ width: "44%", textAlign: "center" }} colSpan={2}>Documents</td>
              <td style={{ width: "15%", textAlign: "center" }}>Scan/Copy</td>
              <td style={{ width: "15%", textAlign: "center" }}>Original</td>
              <td style={{ width: "20%", textAlign: "center" }}>Note</td>
            </tr>

            {/* Document List Rows */}
            {activeDocs.length > 0 ? (
              activeDocs.map((doc, idx) => (
                <tr key={doc.key || idx}>
                  <td style={{ textAlign: "center" }}>{idx + 1}</td>
                  <td colSpan={2}>
                    {getDocLabel(doc.key, doc.label)}
                  </td>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>
                    {typeof doc.copy === "number"
                      ? doc.copy > 0
                        ? doc.copy < 10
                          ? `0${doc.copy}`
                          : String(doc.copy)
                        : ""
                      : doc.copy
                      ? "Yes"
                      : ""}
                  </td>
                  <td style={{ textAlign: "center", fontWeight: "bold" }}>
                    {typeof doc.original === "number"
                      ? doc.original > 0
                        ? doc.original < 10
                          ? `0${doc.original}`
                          : String(doc.original)
                        : ""
                      : doc.original
                      ? "Yes"
                      : ""}
                  </td>
                  <td></td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={{ textAlign: "center" }}>1</td>
                <td colSpan={2}>Commercial Invoice</td>
                <td style={{ textAlign: "center", fontWeight: "bold" }}>Yes</td>
                <td></td>
                <td></td>
              </tr>
            )}

            {/* Document Note Row */}
            <tr>
              <td colSpan={6} style={{ padding: "10px", fontSize: "9.5pt", borderBottom: "1px solid #000" }}>
                <strong>Note:</strong><br />
                - COAs tests in the specs is the responsibility of the Seller.<br />
                - The additional tests if required by the buyer – The Buyer will bear the cost.<br />
                - All documents will be color scanned to the buyer before sending by DHL.<br />
              </td>
            </tr>

            {/* ARTICLE V Header */}
            <tr>
              <th colSpan={6} style={{ textAlign: "left", padding: "8px 10px", borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                ARTICLE V: CLAIM
              </th>
            </tr>
            {/* ARTICLE V Content */}
            <tr>
              <td colSpan={6} style={{ padding: "12px", textAlign: "justify", lineHeight: "1.5" }}>
                <p style={{ margin: "0 0 10px 0" }}>
                  The seller only accepts to resolve the buyer's complaints about goods quality within 30 days from the date the ship arrives at the port. The parties must actively resolve to find the cause and come up with solutions.
                </p>
                <p style={{ margin: "0 0 10px 0" }}>
                  The buyer is responsible for providing complete information, videos, images, batch number, time of foreign object detection, etc. When opening the goods or when detecting foreign objects inside, give the seller information as a basis for evaluating the cause. The seller has the right to refuse responsibility for resolving complaints if the buyer cannot provide images or videos of the shipment.
                </p>
                <p style={{ margin: "0 0 10px 0" }}>
                  The seller will be responsible for goods refused to be imported by customs (Excess amounts of pesticides and microorganisms exceeding the prescribed level). In this case, the buyer must provide evidence that the goods are refused import by customs.
                </p>
                <p style={{ margin: 0 }}>
                  In case the goods have been inspected by the buyer or authorized representative of the buyer at the seller's factory before the goods are loaded into the container, the seller has the right to refuse responsibility for the quality of the goods after The container leaves the seller's factory.
                </p>
              </td>
            </tr>

            {/* ARTICLE VI Header */}
            <tr>
              <th colSpan={6} style={{ textAlign: "left", padding: "8px 10px", borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                ARTICLE VI : ARBITRATION
              </th>
            </tr>
            {/* ARTICLE VI Content */}
            <tr>
              <td colSpan={6} style={{ padding: "12px", textAlign: "justify", lineHeight: "1.5", borderBottom: "1px solid #000" }}>
                <p style={{ margin: "0 0 10px 0" }}>
                  Any disputes in connection with this contract not reaching an amicable settlement shall referred to the arbitration committee attached to the VIETNAM Chamber of Commerce in HOCHIMINH City, VIET NAM who awards shall be final and biding on both parties. The arbitration costs and other expenses relating to the arbitration shall be borne by both parties equally. Any change or amendment to this contract shall be made in written and agree by both parties.
                </p>
                <p style={{ margin: 0 }}>
                  This contract is made 02 original in English and come into effect from the signing day to {formattedExpiryDate}. Each party keeps 01 with equal value.
                </p>
              </td>
            </tr>

            {/* Remarks (Optional Note) */}
            {contract.note && (
              <tr>
                <td colSpan={6} style={{ padding: "10px", fontSize: "9.5pt", borderBottom: "1px solid #000" }}>
                  <strong>Remarks / Ghi chú:</strong> {contract.note}
                </td>
              </tr>
            )}

            {/* Unified Signatures Block inside the table */}
            <tr style={{ pageBreakInside: "avoid" }}>
              <td colSpan={6} style={{ padding: "0" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "50%", textAlign: "center", padding: "10px", borderRight: "1px solid #000", borderBottom: "1px solid #000", borderTop: "none", borderLeft: "none" }}>
                        <p style={{ margin: "0 0 4.5rem 0", fontWeight: "bold" }}>FOR THE SELLER</p>
                        <p style={{ margin: 0, fontStyle: "italic", fontSize: "9.5pt" }}>(Sign and stamp here)</p>
                      </td>
                      <td style={{ width: "50%", textAlign: "center", padding: "10px", borderBottom: "1px solid #000", borderTop: "none", borderRight: "none", borderLeft: "none" }}>
                        <p style={{ margin: "0 0 4.5rem 0", fontWeight: "bold" }}>FOR THE BUYER</p>
                        <p style={{ margin: 0, fontStyle: "italic", fontSize: "9.5pt" }}>(Sign and stamp here)</p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ width: "50%", textAlign: "center", padding: "8px 10px", fontWeight: "bold", borderRight: "1px solid #000", borderBottom: "none", borderTop: "none", borderLeft: "none" }}>
                        Name: {sellerDetails?.representative ? sellerDetails.representative.split("—")[0].trim() : "Ông Nguyễn Minh Quý"}
                      </td>
                      <td style={{ width: "50%", textAlign: "center", padding: "8px 10px", fontWeight: "bold", border: "none" }}>
                        Name: {getBuyerRepresentative(customer)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        /* Standard layout styling */
        html, body {
          height: auto !important;
          overflow: visible !important;
        }

        .quality-packing-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5px;
          margin-bottom: 0.5rem;
        }

        .quality-packing-table th, .quality-packing-table td {
          border: 1px solid #000;
          padding: 8px 12px;
          font-size: 10.5pt;
          text-align: left;
        }

        .quality-packing-table th {
          background-color: #fff;
          font-weight: bold;
          text-transform: uppercase;
        }

        .unified-contract-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0.5rem;
          border: 1px solid #000;
        }

        .unified-contract-table th, .unified-contract-table td {
          border: 1px solid #000;
          padding: 8px 12px;
          font-size: 10.5pt;
          text-align: left;
        }

        .unified-contract-table th {
          background-color: #fff;
          font-weight: bold;
          text-transform: uppercase;
        }

        body {
          margin: 0;
          padding: 0;
          background-color: #f1f5f9;
          font-family: "Times New Roman", Times, serif;
          color: #111;
          font-size: 11pt;
          line-height: 1.45;
        }

        .print-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 0;
        }

        .control-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          width: 100%;
          max-width: 800px;
          justify-content: space-between;
          padding: 0 1rem;
        }

        .ctrl-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 10px 20px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background-color: #fff;
          color: #334155;
          font-weight: 600;
          cursor: pointer;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .ctrl-btn:hover {
          background-color: #f8fafc;
          border-color: #94a3b8;
        }

        .primary-btn {
          background-color: #2563eb;
          color: #fff;
          border-color: #2563eb;
        }

        .primary-btn:hover {
          background-color: #1d4ed8;
          border-color: #1d4ed8;
        }

        .a4-page {
          background-color: #fff;
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 20mm 15mm 20mm;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          box-sizing: border-box;
        }

        .header-section {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .main-title {
          font-size: 20pt;
          font-weight: bold;
          margin: 0;
          text-transform: uppercase;
        }

        .sub-title {
          font-size: 14pt;
          font-weight: bold;
          margin: 0.25rem 0 1rem 0;
          text-transform: uppercase;
        }

        .meta-info {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #000;
          padding-bottom: 0.5rem;
          margin-top: 1rem;
        }

        .meta-info p {
          margin: 0;
        }

        .intro-text {
          margin-bottom: 1.25rem;
        }

        .intro-text p {
          margin: 0;
        }

        .parties-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 1.25rem;
        }

        .party-block {
          border: 1px solid #ccc;
          padding: 0.75rem;
          border-radius: 6px;
        }

        .party-title {
          font-size: 11pt;
          font-weight: bold;
          margin: 0 0 0.5rem 0;
          border-bottom: 1px solid #ccc;
          padding-bottom: 0.25rem;
        }

        .party-block p {
          margin: 4px 0;
          font-size: 10pt;
          line-height: 1.35;
        }

        .agreement-clause {
          margin-bottom: 1.25rem;
        }

        .agreement-clause p {
          margin: 0;
        }

        .article-block {
          margin-bottom: 0.75rem;
        }

        .article-title {
          font-size: 10.5pt;
          font-weight: bold;
          margin: 0 0 0.5rem 0;
          text-transform: uppercase;
        }

        .contract-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0.5rem;
        }

        .contract-table th, .contract-table td {
          border: 1px solid #000;
          padding: 6px 8px;
          font-size: 10pt;
        }

        .contract-table th {
          background-color: #f2f2f2;
          font-weight: bold;
          text-align: center;
        }

        .vn-text {
          font-weight: normal;
          font-style: italic;
          font-size: 8.5pt;
        }

        .total-row td {
          font-weight: bold;
          background-color: #fafafa;
        }

        .terms-list {
          list-style-type: none;
          padding-left: 0;
          margin: 0;
        }

        .terms-list li {
          margin-bottom: 4px;
          font-size: 10.5pt;
        }

        .nested-info-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
          margin-left: 1rem;
        }

        .nested-info-table td {
          padding: 3px 6px;
          font-size: 10pt;
        }

        .doc-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
        }

        .doc-table th, .doc-table td {
          border: 1px solid #000;
          padding: 5px 8px;
          font-size: 10pt;
        }

        .doc-table th {
          background-color: #f2f2f2;
          text-align: left;
        }

        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 2.5rem;
        }

        .sig-column {
          width: 45%;
          text-align: center;
        }

        .sig-title {
          font-weight: bold;
          font-size: 10.5pt;
          margin-bottom: 3.5rem;
        }

        .sig-space {
          height: 60px;
        }

        .sig-name {
          font-weight: bold;
          margin: 0;
          text-decoration: underline;
        }

        .sig-desc {
          margin: 0;
          font-style: italic;
          font-size: 9.5pt;
        }

        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-35deg);
          font-size: 8rem;
          font-weight: 900;
          color: rgba(0, 0, 0, 0.08) !important;
          z-index: 9999;
          pointer-events: none;
          white-space: nowrap;
          text-transform: uppercase;
          font-family: 'Segoe UI', Arial, sans-serif;
          user-select: none;
        }

        .watermark.approved {
          font-size: 6.5rem;
          color: rgba(0, 0, 0, 0.04) !important;
        }

        /* Print Media Styles */
        @media print {
          .watermark {
            display: block !important;
            color: rgba(0, 0, 0, 0.08) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .watermark.approved {
            color: rgba(0, 0, 0, 0.04) !important;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
          }
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
            display: block !important;
          }
          .a4-page {
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          .party-block {
            border: 1px solid #000 !important;
          }
        }
      `}} />
    </div>
  );
}
