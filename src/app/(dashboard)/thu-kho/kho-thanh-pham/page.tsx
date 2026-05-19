"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, Loader2, Calendar, User, FileText, Map as MapIcon, LogIn, LogOut, Trash2 } from "lucide-react";

// Types
interface Location {
  id: string;
  row: string;
  bin: string;
  level: string;
}

interface ReceiptDetail {
  productCode: string;
  productName: string;
  batchNumber: string;
  locationId: string;
  quantity: number;
  unit: string;
  location?: Location;
}

interface Receipt {
  id: string;
  receiptCode: string;
  date: string;
  creator: string;
  note: string | null;
  details: ReceiptDetail[];
}

interface IssueDetail {
  productCode: string;
  productName: string;
  batchNumber: string;
  locationId: string;
  quantity: number;
  unit: string;
  location?: Location;
}

interface Issue {
  id: string;
  issueCode: string;
  date: string;
  creator: string;
  note: string | null;
  details: IssueDetail[];
}

interface MapLocation extends Location {
  totalQuantity: number;
  hasStock: boolean;
  items: any[];
}

export default function FinishedGoodsWarehouse() {
  const [activeTab, setActiveTab] = useState(1);
  const [locations, setLocations] = useState<Location[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [mapData, setMapData] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [viewType, setViewType] = useState<"receipt" | "issue" | null>(null);
  const [issueInitialData, setIssueInitialData] = useState<any[] | null>(null);

  useEffect(() => {
    fetchLocations();
    if (activeTab === 1) fetchReceipts();
    if (activeTab === 2) fetchIssues();
    if (activeTab === 3) fetchMapData();
    if (activeTab === 4) fetchLocations();
  }, [activeTab]);

  const fetchLocations = async () => {
    const res = await fetch("/api/warehouse/finished-goods/locations");
    if (res.ok) setLocations(await res.json());
  };

  const fetchReceipts = async () => {
    setLoading(true);
    const res = await fetch("/api/warehouse/finished-goods/receipts");
    if (res.ok) setReceipts(await res.json());
    setLoading(false);
  };

  const fetchIssues = async () => {
    setLoading(true);
    const res = await fetch("/api/warehouse/finished-goods/issues");
    if (res.ok) setIssues(await res.json());
    setLoading(false);
  };

  const fetchMapData = async () => {
    setLoading(true);
    const res = await fetch("/api/warehouse/finished-goods/stock-map");
    if (res.ok) setMapData(await res.json());
    setLoading(false);
  };

  const handleDeleteReceipt = async (id: string) => {
    console.log("Deleting receipt:", id);
    if (!confirm("Bạn có chắc chắn muốn xóa phiếu nhập này? Hàng tồn kho sẽ được trừ lại tương ứng.")) return;
    const res = await fetch(`/api/warehouse/finished-goods/receipts/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchReceipts();
      fetchMapData();
    } else {
      const err = await res.json();
      alert("Lỗi: " + err.error);
    }
  };

  const handleDeleteIssue = async (id: string) => {
    console.log("Deleting issue:", id);
    if (!confirm("Bạn có chắc chắn muốn xóa phiếu xuất này? Hàng tồn kho sẽ được cộng lại tương ứng.")) return;
    const res = await fetch(`/api/warehouse/finished-goods/issues/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchIssues();
      fetchMapData();
    } else {
      const err = await res.json();
      alert("Lỗi: " + err.error);
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">Kho thành phẩm</h1>

      {/* Tabs */}
      <div className="card" style={{ padding: '0', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button
            className={`tab-btn ${activeTab === 1 ? 'active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            <LogIn size={18} />
            <span>Phiếu nhập kho</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 2 ? 'active' : ''}`}
            onClick={() => setActiveTab(2)}
          >
            <LogOut size={18} />
            <span>Phiếu xuất kho</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 3 ? 'active' : ''}`}
            onClick={() => setActiveTab(3)}
          >
            <MapIcon size={18} />
            <span>Sơ đồ vị trí</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 4 ? 'active' : ''}`}
            onClick={() => setActiveTab(4)}
          >
            <FileText size={18} />
            <span>Danh mục vị trí</span>
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {activeTab === 1 && (
            <ReceiptTab
              receipts={receipts}
              loading={loading}
              locations={locations}
              onRefresh={fetchReceipts}
              openModal={() => setIsReceiptModalOpen(true)}
              onViewDetail={(r: any) => { setSelectedItem(r); setViewType("receipt"); }}
              onDelete={handleDeleteReceipt}
            />
          )}
          {activeTab === 2 && (
            <IssueTab
              issues={issues}
              loading={loading}
              locations={locations}
              onRefresh={fetchIssues}
              openModal={() => {
                setIssueInitialData(null);
                setIsIssueModalOpen(true);
              }}
              onViewDetail={(i: any) => { setSelectedItem(i); setViewType("issue"); }}
              onDelete={handleDeleteIssue}
            />
          )}
          {activeTab === 3 && (
            <MapTab
              mapData={mapData}
              loading={loading}
              onBulkIssue={(items: any[]) => {
                setIssueInitialData(items);
                setIsIssueModalOpen(true);
              }}
            />
          )}
          {activeTab === 4 && (
            <LocationCatalogTab
              locations={locations}
              loading={loading}
              onRefresh={fetchLocations}
            />
          )}
        </div>
      </div>

      {isReceiptModalOpen && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          onSuccess={fetchReceipts}
        />
      )}

      {isIssueModalOpen && (
        <IssueModal
          isOpen={isIssueModalOpen}
          locations={locations}
          initialData={issueInitialData}
          onClose={() => {
            setIsIssueModalOpen(false);
            setIssueInitialData(null);
          }}
          onSuccess={() => {
            fetchIssues();
            fetchMapData();
          }}
        />
      )}

      {selectedItem && (
        <DetailModal
          item={selectedItem}
          type={viewType}
          onClose={() => { setSelectedItem(null); setViewType(null); }}
        />
      )}

      <style jsx>{`
        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          font-weight: 600;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          background-color: var(--bg-color);
          color: var(--primary-color);
        }
        .tab-btn.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
          background-color: rgba(59, 130, 246, 0.05);
        }
      `}</style>
    </div>
  );
}

// Sub-components
function ReceiptTab({ receipts, loading, openModal, onViewDetail, onDelete }: any) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input type="text" placeholder="Tìm phiếu nhập..." className="form-control" style={{ paddingLeft: '2.2rem', width: '250px' }} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          Lập phiếu nhập
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Ngày nhập</th>
              <th>Mục đích</th>
              <th>Mã đơn hàng</th>
              <th>Người lập</th>
              <th>Số mặt hàng</th>
              <th>Ghi chú</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center' }}><Loader2 className="spin" /></td></tr>
            ) : receipts.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center' }}>Chưa có phiếu nhập kho nào</td></tr>
            ) : receipts.map((r: any) => (
              <tr key={r.id}>
                <td><span className="badge badge-info">{r.receiptCode}</span></td>
                <td>{new Date(r.date).toLocaleDateString('vi-VN')}</td>
                <td><span className="badge badge-outline">{r.purpose || "—"}</span></td>
                <td>{r.orderCode || "—"}</td>
                <td>{r.creator}</td>
                <td>{r.details.length} items</td>
                <td>{r.note}</td>
                <td><span className="badge badge-success">Hoàn thành</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="btn-icon" onClick={() => onViewDetail(r)} title="Xem chi tiết"><FileText size={16} /></button>
                    <button className="btn-icon btn-icon--danger" onClick={() => onDelete(r.id)} title="Xóa phiếu"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IssueTab({ issues, loading, openModal, onViewDetail, onDelete }: any) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input type="text" placeholder="Tìm phiếu xuất..." className="form-control" style={{ paddingLeft: '2.2rem', width: '250px' }} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          Lập phiếu xuất
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Ngày xuất</th>
              <th>Người lập</th>
              <th>Số mặt hàng</th>
              <th>Ghi chú</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center' }}><Loader2 className="spin" /></td></tr>
            ) : issues.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center' }}>Chưa có phiếu xuất nào</td></tr>
            ) : issues.map((i: any) => (
              <tr key={i.id}>
                <td><span className="badge badge-info">{i.issueCode}</span></td>
                <td>{new Date(i.date).toLocaleDateString('vi-VN')}</td>
                <td>{i.creator}</td>
                <td>{i.details.length} items</td>
                <td>{i.note}</td>
                <td><span className="badge badge-success">Đã xuất kho</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="btn-icon" onClick={() => onViewDetail(i)} title="Xem chi tiết"><FileText size={16} /></button>
                    <button className="btn-icon btn-icon--danger" onClick={() => onDelete(i.id)} title="Xóa phiếu"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MapTab({ mapData, loading, onBulkIssue }: any) {
  const [selectedRow, setSelectedRow] = useState("Tất cả");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterOrder, setFilterOrder] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Unique values for filters from existing stock
  const productsMap: Record<string, string> = {};
  mapData.forEach((l: any) => {
    (l.items || []).forEach((i: any) => {
      if (i.productCode) {
        productsMap[i.productCode] = i.productName || "Không rõ tên";
      }
    });
  });
  const products = Object.entries(productsMap)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const batches = Array.from(new Set(mapData.flatMap((l: any) => (l.items || []).map((i: any) => i.batchNumber))))
    .filter(Boolean)
    .sort() as string[];

  const orders = Array.from(new Set(mapData.flatMap((l: any) => (l.items || []).map((i: any) => i.orderCode))))
    .filter(Boolean)
    .sort() as string[];

  // Logic to check if a location matches current filters
  const matchesFilter = (loc: any) => {
    if (!loc.hasStock) return false;
    if (!filterProduct && !filterBatch && !filterOrder) return false;

    return loc.items.some((i: any) => {
      const matchProduct = !filterProduct || i.productCode === filterProduct;
      const matchBatch = !filterBatch || i.batchNumber === filterBatch;
      const matchOrder = !filterOrder || i.orderCode === filterOrder;
      return matchProduct && matchBatch && matchOrder;
    });
  };

  const toggleLocation = (id: string, hasStock: boolean) => {
    if (!hasStock) return;
    setSelectedLocations(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Reset selection when filters change
  useEffect(() => {
    setSelectedLocations([]);
  }, [filterProduct, filterBatch, filterOrder]);

  const handleCreateIssue = () => {
    if (selectedLocations.length === 0) return;

    const itemsToIssue = mapData
      .filter((loc: any) => selectedLocations.includes(loc.id))
      .flatMap((loc: any) => loc.items.map((i: any) => ({
        ...i,
        locationId: loc.id
      })));

    // If filters are active, only issue matching items from the selected locations
    const filteredItems = itemsToIssue.filter((i: any) => {
      const matchProduct = !filterProduct || i.productCode === filterProduct;
      const matchBatch = !filterBatch || i.batchNumber === filterBatch;
      const matchOrder = !filterOrder || i.orderCode === filterOrder;
      return matchProduct && matchBatch && matchOrder;
    });

    onBulkIssue(filteredItems);
  };

  const allRows = ["Tất cả", ...new Set(mapData.map((loc: any) => loc.row))].sort() as string[];
  const filteredMapData = selectedRow === "Tất cả"
    ? mapData
    : mapData.filter((loc: any) => loc.row === selectedRow);
  const displayRows = [...new Set(filteredMapData.map((loc: any) => loc.row))].sort() as string[];

  return (
    <div>
      {/* Search and Selection Controls */}
      <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem', display: 'block' }}>Mã sản phẩm</label>
            <select className="form-control" value={filterProduct} onChange={e => setFilterProduct(e.target.value)}>
              <option value="">Tất cả sản phẩm</option>
              {products.map((p: any) => (
                <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem', display: 'block' }}>Số lô</label>
            <select className="form-control" value={filterBatch} onChange={e => setFilterBatch(e.target.value)}>
              <option value="">Tất cả số lô</option>
              {batches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.25rem', display: 'block' }}>Mã đơn hàng</label>
            <select className="form-control" value={filterOrder} onChange={e => setFilterOrder(e.target.value)}>
              <option value="">Tất cả đơn hàng</option>
              {orders.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Đã chọn: <strong>{selectedLocations.length}</strong> vị trí
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Tổng lượng: <strong>{mapData.filter(l => selectedLocations.includes(l.id)).reduce((sum, l) => sum + l.totalQuantity, 0).toLocaleString("vi-VN")}</strong> Kg
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', height: '42px' }}
              disabled={selectedLocations.length === 0}
              onClick={handleCreateIssue}
            >
              Tạo phiếu xuất kho
            </button>
          </div>
        </div>

        {/* Row Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          {allRows.map(row => (
            <button
              key={row}
              className={`btn btn-sm ${selectedRow === row ? 'btn-primary' : 'btn-outline'}`}
              style={{ minWidth: '60px', fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
              onClick={() => setSelectedRow(row)}
            >
              {row === "Tất cả" ? "Tất cả" : `Dãy ${row}`}
            </button>
          ))}
          <button
            className="btn btn-sm btn-outline"
            style={{ marginLeft: 'auto', fontSize: '0.75rem' }}
            onClick={() => setSelectedLocations([])}
          >
            Bỏ chọn tất cả
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--success-color)', borderRadius: '4px' }}></div>
          <span style={{ fontSize: '0.875rem' }}>Còn tồn hàng</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: 'var(--primary-color)', borderRadius: '4px' }}></div>
          <span style={{ fontSize: '0.875rem' }}>Đã chọn (Màu xanh dương)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', border: '2px solid #e74c3c', borderRadius: '4px' }}></div>
          <span style={{ fontSize: '0.875rem' }}>Phù hợp lọc (Viền đỏ)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '16px', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '4px' }}></div>
          <span style={{ fontSize: '0.875rem' }}>Trống</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><Loader2 className="spin" size={32} /></div>
      ) : mapData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Chưa khai báo vị trí kho</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {displayRows.map(rowName => {
            const rowLocations = filteredMapData.filter((l: any) => l.row === rowName);
            const bins = [...new Set(rowLocations.map((l: any) => l.bin))].sort() as string[];

            return (
              <div key={rowName} className="warehouse-row" style={{ width: '100%', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                <h3 style={{ marginBottom: '1rem', borderBottom: '2px solid var(--primary-color)', width: 'fit-content', paddingRight: '1rem', fontSize: '1rem' }}>
                  Dãy {rowName}
                </h3>
                <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'nowrap' }}>
                  {bins.map(binName => {
                    const levels = rowLocations.filter((l: any) => l.bin === binName).sort((a: any, b: any) => b.level.localeCompare(a.level));

                    return (
                      <div key={binName} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Ô {binName}</div>
                        {levels.map((loc: any) => {
                          const isSel = selectedLocations.includes(loc.id);
                          const isMatch = matchesFilter(loc);

                          return (
                            <div
                              key={loc.id}
                              onClick={() => toggleLocation(loc.id, loc.hasStock)}
                              title={`${loc.row}-${loc.bin}-${loc.level}: ${loc.totalQuantity} items\n${loc.items.map((i: any) => `- ${i.productName} (${i.quantity})`).join('\n')}`}
                              style={{
                                width: '60px',
                                height: '35px',
                                backgroundColor: isSel ? 'var(--primary-color)' : (loc.hasStock ? 'var(--success-color)' : '#f1f5f9'),
                                border: isMatch ? '2px solid #e74c3c' : '1px solid #e2e8f0',
                                borderRadius: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0',
                                color: (isSel || loc.hasStock) ? 'white' : '#64748b',
                                fontSize: '0.65rem',
                                fontWeight: 'bold',
                                transition: 'all 0.1s',
                                cursor: loc.hasStock ? 'pointer' : 'default',
                                opacity: (filterProduct || filterBatch || filterOrder) && !isMatch && !isSel ? 0.4 : 1
                              }}
                              onMouseOver={(e) => loc.hasStock && (e.currentTarget.style.transform = 'scale(1.03)')}
                              onMouseOut={(e) => loc.hasStock && (e.currentTarget.style.transform = 'scale(1)')}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', lineHeight: '1' }}>
                                <span>T. {loc.level}</span>
                                {loc.hasStock && (
                                  <span style={{ fontSize: '0.5rem', fontWeight: 'normal', marginTop: '1px' }}>
                                    {loc.totalQuantity}Kg
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LocationCatalogTab({ locations, loading, onRefresh }: any) {
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = ["Day (Row)", "O (Bin)", "Tang (Level)", "Suc chua (Capacity)", "Trang thai (Status)"];
    const rows = [
      ["A", "01", "1", "1000", "Hoạt động"],
      ["A", "01", "2", "1000", "Hoạt động"],
      ["B", "01", "1", "2000", "Hoạt động"]
    ];
    let csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "mau_nhap_vi_tri.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

        // Basic CSV parsing (comma separated)
        const data = lines.slice(1).map(line => {
          const parts = line.split(",").map(p => p.trim());
          return {
            row: parts[0],
            bin: parts[1],
            level: parts[2],
            capacity: parseFloat(parts[3]) || 0,
            status: parts[4] || "Hoạt động"
          };
        });

        const res = await fetch("/api/warehouse/finished-goods/locations/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locations: data })
        });

        if (res.ok) {
          alert("Import thành công!");
          onRefresh();
        } else {
          const err = await res.json();
          alert("Import thất bại: " + (err.error || "Lỗi không xác định"));
        }
      } catch (err) {
        console.error(err);
        alert("Lỗi khi xử lý file!");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Danh mục vị trí kho ({locations.length})</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={downloadTemplate}>
            <Calendar size={18} style={{ marginRight: '0.5rem' }} /> Tải file mẫu
          </button>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="spin" size={18} /> : <LogIn size={18} style={{ marginRight: '0.5rem' }} />}
            Import Excel
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".csv,.xlsx"
            onChange={handleImport}
          />
        </div>
      </div>

      <div className="table-container shadow-sm">
        <table className="table">
          <thead>
            <tr>
              <th>Dãy (Row)</th>
              <th>Ô (Bin)</th>
              <th>Tầng (Level)</th>
              <th>Sức chứa</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}><Loader2 className="spin" /></td></tr>
            ) : locations.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center' }}>Chưa có vị trí nào</td></tr>
            ) : locations.map((loc: any) => (
              <tr key={loc.id}>
                <td><span className="badge badge-info">{loc.row}</span></td>
                <td>{loc.bin}</td>
                <td>{loc.level}</td>
                <td>{loc.capacity?.toLocaleString() || 0} Kg</td>
                <td>
                  <span className={`badge ${loc.status === 'Hoạt động' ? 'badge-success' : 'badge-danger'}`}>
                    {loc.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Modals
function ReceiptModal({ isOpen, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    receiptCode: `PNK${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    creator: "Admin",
    purpose: "Nhập từ sản xuất mới",
    description: "",
    note: "",
    items: [{ productCode: "", productName: "", batchNumber: "", locationId: "", quantity: 0, unit: "", orderCode: "", note: "" }]
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [useOrderDropdown, setUseOrderDropdown] = useState(false);
  const [options, setOptions] = useState<{ products: any[], orders: any[], locations: any[], branches: any[] }>({
    products: [],
    orders: [],
    locations: [],
    branches: []
  });

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen]);

  const fetchOptions = async () => {
    try {
      const [optRes, userRes, receiptsRes] = await Promise.all([
        fetch("/api/warehouse/finished-goods/options"),
        fetch("/api/user-permissions"),
        fetch("/api/warehouse/finished-goods/receipts")
      ]);

      if (optRes.ok && userRes.ok && receiptsRes.ok) {
        const optData = await optRes.json();
        const userData = await userRes.json();
        const receiptsData = await receiptsRes.json();

        setOptions(optData);

        // Logic for code generation
        const branchName = userData.branch || "Tất cả chi nhánh";
        const branchObj = optData.branches.find((b: any) => b.name === branchName);
        const bCode = branchObj?.code || "ALL";

        const branchReceipts = receiptsData.filter((r: any) =>
          r.receiptCode.startsWith("PNK") && r.receiptCode.endsWith("/" + bCode)
        );

        const nextNum = branchReceipts.length + 1;
        const formattedNum = nextNum.toString().padStart(6, '0');
        const newCode = `PNK${formattedNum}/${bCode}`;

        setFormData(prev => ({
          ...prev,
          receiptCode: newCode,
          creator: userData.employeeName || "Admin"
        }));
      }
    } catch (err) {
      console.error("Failed to fetch data for initialization", err);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productCode: "", productName: "", batchNumber: "", locationId: "", quantity: 0, unit: "", orderCode: "", note: "" }]
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];

    // Auto-fill productName and units when productCode changes
    if (field === 'productCode') {
      const product = options.products.find(p => p.code === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          [field]: value,
          productName: product.name,
          unit: product.unit?.[0]?.name || ""
        };
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }

    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/warehouse/finished-goods/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Lỗi khi lưu phiếu");
      }
    } catch (err) {
      setError("Lỗi kết nối");
    } finally {
      setSubmitting(false);
    }
  };

  const totalQuantity = formData.items.reduce((sum, item) => sum + (parseFloat(item.quantity.toString()) || 0), 0);
  const totalItems = formData.items.length;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '95vw', maxWidth: 'none' }}>
        <div className="modal-header">
          <h2>Lập phiếu nhập kho thành phẩm</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}

            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", border: "1px solid var(--border-color)" }}>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                Người lập phiếu: <strong style={{ color: "var(--primary-color)" }}>{formData.creator}</strong>
              </p>
              <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Ngày tạo phiếu: <strong>{new Date(formData.date).toLocaleDateString("vi-VN")}</strong>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Mã phiếu nhập</label>
                <input type="text" className="form-control" value={formData.receiptCode} onChange={e => setFormData({ ...formData, receiptCode: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Ngày nhập</label>
                <input type="date" className="form-control" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="form-group" style={{ display: 'none' }}>
                <label>Người lập</label>
                <input type="text" className="form-control" value={formData.creator} onChange={e => setFormData({ ...formData, creator: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Mục đích nhập</label>
                <select className="form-control" value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })}>
                  <option value="Nhập từ sản xuất mới">Nhập từ sản xuất mới</option>
                  <option value="Nhập hàng xuất bị trả về">Nhập hàng xuất bị trả về</option>
                  <option value="Nhập từ hàng đóng gói lại">Nhập từ hàng đóng gói lại</option>
                  <option value="Nhập từ chuyển nội bộ">Nhập từ chuyển nội bộ</option>
                  <option value="Nhập khác">Nhập khác</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Diễn giải</label>
                <input type="text" className="form-control" placeholder="Nhập diễn giải lý do nhập kho..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Danh sách hàng hóa (Kho lạnh)</h3>
            <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '4px', overflowX: 'auto' }}>
              <table className="table" style={{ width: '1920px', tableLayout: 'fixed' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ width: '300px' }}>Mã SP</th>
                    <th style={{ width: '350px' }}>Tên sản phẩm</th>
                    <th style={{ width: '250px' }}>Số lô (Batch)</th>
                    <th style={{ width: '250px' }}>Vị trí (Tồn / Sức chứa)</th>
                    <th style={{ width: '200px' }}>
                      Mã đơn hàng
                      <input type="checkbox" style={{ marginLeft: '0.5rem' }} checked={useOrderDropdown} onChange={e => setUseOrderDropdown(e.target.checked)} />
                    </th>
                    <th style={{ width: '150px' }}>ĐVT</th>
                    <th style={{ width: '150px' }}>Số lượng</th>
                    <th style={{ width: '300px' }}>Ghi chú</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ width: '300px' }}>
                        <select className="form-control" value={item.productCode} onChange={e => updateItem(index, 'productCode', e.target.value)} required>
                          <option value="">Chọn mã...</option>
                          {options.products.map(p => (
                            <option key={p.id} value={p.code}>{p.code} - {p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ width: '350px' }}>
                        <input type="text" className="form-control" value={item.productName} onChange={e => updateItem(index, 'productName', e.target.value)} required />
                      </td>
                      <td style={{ width: '250px' }}>
                        <input type="text" className="form-control" placeholder="(Tùy chọn)" value={item.batchNumber} onChange={e => updateItem(index, 'batchNumber', e.target.value)} />
                      </td>
                      <td style={{ width: '250px' }}>
                        <select className="form-control" value={item.locationId} onChange={e => updateItem(index, 'locationId', e.target.value)} required>
                          <option value="">Chọn vị trí...</option>
                          {options.locations.map((loc: any) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.row}-{loc.bin}-{loc.level} ({loc.currentQuantity} / {loc.capacity || '∞'})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ width: '200px' }}>
                        {useOrderDropdown ? (
                          <select className="form-control" value={item.orderCode} onChange={e => updateItem(index, 'orderCode', e.target.value)}>
                            <option value="">Chọn...</option>
                            {options.orders.map(order => (
                              <option key={order.id} value={order.orderCode}>{order.orderCode}</option>
                            ))}
                          </select>
                        ) : (
                          <input type="text" className="form-control" placeholder="Mã ĐH..." value={item.orderCode} onChange={e => updateItem(index, 'orderCode', e.target.value)} />
                        )}
                      </td>
                      <td style={{ width: '150px' }}>
                        <select className="form-control" value={item.unit} onChange={e => updateItem(index, 'unit', e.target.value)}>
                          <option value="">ĐVT...</option>
                          {options.products.find(p => p.code === item.productCode)?.unit?.map((u: any) => (
                            <option key={u.id} value={u.name}>{u.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ width: '150px' }}>
                        <input type="number" className="form-control" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} min="0" step="0.01" required />
                      </td>
                      <td style={{ width: '300px' }}>
                        <input type="text" className="form-control" placeholder="..." value={item.note} onChange={e => updateItem(index, 'note', e.target.value)} />
                      </td>
                      <td style={{ width: '40px' }}>
                        <button type="button" className="btn-icon btn-icon--danger" onClick={() => removeItem(index)}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'right' }}>Tổng cộng:</td>
                    <td>{totalQuantity.toLocaleString("vi-VN")}</td>
                    <td colSpan={2}>({totalItems} dòng hàng)</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button type="button" className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={addItem}>
              <Plus size={16} style={{ marginRight: '0.5rem' }} /> Thêm dòng
            </button>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Ghi chú chung</label>
              <textarea className="form-control" rows={2} value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })}></textarea>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Loader2 className="spin" size={18} /> : "Lưu phiếu nhập"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function IssueModal({ isOpen, onClose, locations, onSuccess, initialData }: any) {
  const [formData, setFormData] = useState({
    issueCode: `PXK${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    creator: "Admin",
    note: "",
    items: [{ productCode: "", productName: "", batchNumber: "", locationId: "", quantity: 1, unit: "Cái", orderCode: "", note: "" }]
  });
  const [options, setOptions] = useState<{ products: any[], orders: any[], branches: any[] }>({
    products: [],
    orders: [],
    branches: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchOptions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialData && initialData.length > 0) {
      setFormData(prev => ({
        ...prev,
        items: initialData.map(item => ({
          productCode: item.productCode,
          productName: item.productName,
          batchNumber: item.batchNumber,
          locationId: item.locationId,
          quantity: item.quantity,
          unit: item.unit || "Cái",
          orderCode: item.orderCode || "",
          note: item.note || ""
        }))
      }));
    }
  }, [isOpen, initialData]);

  const fetchOptions = async () => {
    try {
      const [optRes, userRes, issuesRes] = await Promise.all([
        fetch("/api/warehouse/finished-goods/options"),
        fetch("/api/user-permissions"),
        fetch("/api/warehouse/finished-goods/issues")
      ]);

      if (optRes.ok && userRes.ok && issuesRes.ok) {
        const optData = await optRes.json();
        const userData = await userRes.json();
        const issuesData = await issuesRes.json();

        setOptions(optData);

        // Logic for code generation
        const branchName = userData.branch || "Tất cả chi nhánh";
        const branchObj = optData.branches.find((b: any) => b.name === branchName);
        const bCode = branchObj?.code || "ALL";

        const branchIssues = issuesData.filter((i: any) =>
          i.issueCode.startsWith("PXK") && i.issueCode.endsWith("/" + bCode)
        );

        const nextNum = branchIssues.length + 1;
        const formattedNum = nextNum.toString().padStart(6, '0');
        const newCode = `PXK${formattedNum}/${bCode}`;

        setFormData(prev => ({
          ...prev,
          issueCode: newCode,
          creator: userData.employeeName || "Admin"
        }));
      }
    } catch (err) {
      console.error("Failed to fetch data for initialization", err);
    }
  };

  // Track available batches
  // for each item row
  const [availableBatches, setAvailableBatches] = useState<Record<number, any[]>>({});

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productCode: "", productName: "", batchNumber: "", locationId: "", quantity: 1, unit: "Cái", orderCode: "", note: "" }]
    });
  };

  const fetchBatches = async (index: number, productCode: string, locationId: string) => {
    if (!productCode || !locationId) return;

    try {
      const res = await fetch(`/api/warehouse/finished-goods/stock/batches?productCode=${productCode}&locationId=${locationId}`);
      if (res.ok) {
        const batches = await res.json();
        setAvailableBatches(prev => ({ ...prev, [index]: batches }));

        // Auto-select if only one batch
        if (batches.length === 1) {
          updateItem(index, 'batchNumber', batches[0].batchNumber);
        } else if (batches.length === 0) {
          updateItem(index, 'batchNumber', "");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];

    if (field === 'productCode') {
      const product = options.products.find(p => p.code === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          [field]: value,
          productName: product.name,
          unit: product.unit?.[0]?.name || "Cái"
        };
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }

    setFormData({ ...formData, items: newItems });

    // Trigger batch fetch if productCode or locationId changes
    if (field === 'productCode' || field === 'locationId') {
      const item = newItems[index];
      fetchBatches(index, item.productCode, item.locationId);
    }
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/warehouse/finished-goods/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Lỗi khi lưu phiếu");
      }
    } catch (err) {
      setError("Lỗi kết nối");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '95vw', maxWidth: 'none' }}>
        <div className="modal-header">
          <h2>Lập phiếu xuất kho thành phẩm</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}

            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", border: "1px solid var(--border-color)" }}>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                Người lập phiếu: <strong style={{ color: "var(--primary-color)" }}>{formData.creator}</strong>
              </p>
              <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Ngày tạo phiếu: <strong>{new Date(formData.date).toLocaleDateString("vi-VN")}</strong>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Mã phiếu xuất</label>
                <input type="text" className="form-control" value={formData.issueCode} onChange={e => setFormData({ ...formData, issueCode: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Ngày xuất</label>
                <input type="date" className="form-control" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="form-group" style={{ display: 'none' }}>
                <label>Người lập</label>
                <input type="text" className="form-control" value={formData.creator} onChange={e => setFormData({ ...formData, creator: e.target.value })} required />
              </div>
            </div>

            <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '4px', overflowX: 'auto' }}>
              <table className="table" style={{ width: '2000px', tableLayout: 'fixed' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ width: '300px' }}>Mã SP</th>
                    <th style={{ width: '350px' }}>Tên sản phẩm</th>
                    <th style={{ width: '250px' }}>Số lô (Batch)</th>
                    <th style={{ width: '250px' }}>Vị trí</th>
                    <th style={{ width: '200px' }}>Mã đơn hàng</th>
                    <th style={{ width: '150px' }}>Số lượng</th>
                    <th style={{ width: '150px' }}>ĐVT</th>
                    <th style={{ width: '300px' }}>Ghi chú</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ width: '300px' }}>
                        <select className="form-control" value={item.productCode} onChange={e => updateItem(index, 'productCode', e.target.value)} required>
                          <option value="">Chọn...</option>
                          {options.products.map(p => (
                            <option key={p.id} value={p.code}>{p.code} - {p.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ width: '350px' }}>
                        <input type="text" className="form-control" value={item.productName} onChange={e => updateItem(index, 'productName', e.target.value)} required />
                      </td>
                      <td style={{ width: '250px' }}>
                        {(availableBatches[index]?.length || 0) > 1 ? (
                          <select
                            className="form-control"
                            value={item.batchNumber}
                            onChange={e => updateItem(index, 'batchNumber', e.target.value)}
                            required
                          >
                            <option value="">Chọn lô...</option>
                            {availableBatches[index].map((b: any) => (
                              <option key={b.batchNumber} value={b.batchNumber}>{b.batchNumber} (Tồn: {b.quantity})</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-control"
                            value={item.batchNumber}
                            onChange={e => updateItem(index, 'batchNumber', e.target.value)}
                            placeholder={(availableBatches[index] && availableBatches[index].length === 0) ? "Không có tồn" : "Số lô"}
                            required
                          />
                        )}
                      </td>
                      <td style={{ width: '250px' }}>
                        <select className="form-control" value={item.locationId} onChange={e => updateItem(index, 'locationId', e.target.value)} required>
                          <option value="">Chọn vị trí...</option>
                          {locations.map((loc: any) => (
                            <option key={loc.id} value={loc.id}>{loc.row}-{loc.bin}-{loc.level}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ width: '200px' }}>
                        <input
                          type="text"
                          className="form-control"
                          value={item.orderCode}
                          onChange={e => updateItem(index, 'orderCode', e.target.value)}
                          list={`orders-list-${index}`}
                          placeholder="Mã đơn hàng..."
                        />
                        <datalist id={`orders-list-${index}`}>
                          {options.orders.map((order: any) => (
                            <option key={order.id} value={order.orderCode}>{order.orderCode}</option>
                          ))}
                        </datalist>
                      </td>
                      <td style={{ width: '150px' }}>
                        <input type="number" className="form-control" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} min="0.01" step="0.01" required />
                      </td>
                      <td style={{ width: '150px' }}>
                        <input type="text" className="form-control" value={item.unit} onChange={e => updateItem(index, 'unit', e.target.value)} />
                      </td>
                      <td style={{ width: '300px' }}>
                        <input type="text" className="form-control" placeholder="..." value={item.note} onChange={e => updateItem(index, 'note', e.target.value)} />
                      </td>
                      <td style={{ width: '40px' }}>
                        <button type="button" className="btn-icon btn-icon--danger" onClick={() => removeItem(index)}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={addItem}>
              <Plus size={16} style={{ marginRight: '0.5rem' }} /> Thêm dòng
            </button>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Ghi chú</label>
              <textarea className="form-control" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })}></textarea>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Loader2 className="spin" size={18} /> : "Lưu phiếu xuất"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function DetailModal({ item, type, onClose }: any) {
  const isReceipt = type === "receipt";
  const code = isReceipt ? item.receiptCode : item.issueCode;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>Chi tiết {isReceipt ? "phiếu nhập" : "phiếu xuất"} #{code}</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <div>
              <p><strong>Ngày:</strong> {new Date(item.date).toLocaleString('vi-VN')}</p>
              <p><strong>Người lập:</strong> {item.creator}</p>
            </div>
            <div>
              <p><strong>Trạng thái:</strong> <span className="badge badge-success">Hoàn thành</span></p>
              <p><strong>Ghi chú:</strong> {item.note || "---"}</p>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Danh sách hàng hóa</h3>
          <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '4px' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Mã SP</th>
                  <th>Tên sản phẩm</th>
                  <th>Số lô</th>
                  <th>Vị trí</th>
                  <th>Mã đơn hàng</th>
                  <th style={{ textAlign: 'right' }}>Số lượng</th>
                  <th>ĐVT</th>
                </tr>
              </thead>
              <tbody>
                {item.details.map((detail: any, idx: number) => (
                  <tr key={idx}>
                    <td>{detail.productCode}</td>
                    <td>{detail.productName}</td>
                    <td><span className="badge badge-info">{detail.batchNumber}</span></td>
                    <td>{detail.location?.row}-{detail.location?.bin}-{detail.location?.level}</td>
                    <td>{detail.orderCode || "—"}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{detail.quantity}</td>
                    <td>{detail.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Đóng</button>
          <button className="btn btn-primary" onClick={() => window.print()}>In phiếu</button>
        </div>
      </div>
    </div>
  );
}

// Removed duplicate imports
