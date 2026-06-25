"use client";

import React, { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useRealTimeSync } from "@/lib/hooks/useRealTimeSync";
import { Check, RotateCcw, MoreHorizontal, Pencil, History, CheckCircle, Clock, Eye, Trash2, Calendar, FileText, Landmark, Printer, Search, Filter, Plus, Send, XCircle, PowerOff } from "lucide-react";
import { createContract, updateContract, deleteContract, approveContract, updateContractStatus } from "./actions";
import HistoryModal from "../../HistoryModal";

interface Customer {
  code: string;
  name: string;
  abbreviation: string | null;
}

interface Product {
  code: string;
  name: string;
  englishName: string | null;
  packaging: string | null;
  unit: { name: string }[];
}

interface ContractTableProps {
  initialContracts: any[];
  customers: Customer[];
  products: Product[];
  currentUser: string;
  initialEmployees: any[];
  banks: any[];
}

const DEFAULT_DOCUMENTS = [
  { key: "invoice", label: "Commercial Invoice (Hóa đơn thương mại)", original: 0, copy: 0 },
  { key: "packing_list", label: "Packing List (Phiếu đóng gói chi tiết)", original: 0, copy: 0 },
  { key: "bl", label: "Bill of Lading - B/L (Vận đơn đường biển)", original: 0, copy: 0 },
  { key: "co", label: "Certificate of Origin - C/O (Chứng nhận xuất xứ)", original: 0, copy: 0 },
  { key: "phytosanitary", label: "Certificate of Phytosanitary (Kiểm dịch thực vật)", original: 0, copy: 0 },
  { key: "coa", label: "Certificate of Analysis - COA (Chứng nhận phân tích)", original: 0, copy: 0 },
  { key: "fumigation", label: "Fumigation Certificate (Chứng nhận khử trùng)", original: 0, copy: 0 },
];

// Formatting helper: Commas for thousands, dot for decimals
export function formatLocaleNumber(num: number): string {
  if (num === undefined || num === null) return "0";
  const parts = num.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function formatLocaleNumber2Dec(num: number): string {
  if (num === undefined || num === null) return "0.00";
  const parts = num.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

// Parsing helper: Strips commas (thousands)
export function parseLocaleNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str
    .replace(/\$/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, ""); // remove commas (thousands)
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export default function ContractTable({ initialContracts, customers: initialCustomers, products: initialProducts, currentUser, initialEmployees, banks = [] }: ContractTableProps) {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>(initialContracts);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [employees, setEmployees] = useState<any[]>(initialEmployees);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingContract, setEditingContract] = useState<any | null>(null);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);

  useEffect(() => {
    setContracts(initialContracts);
  }, [initialContracts]);

  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  const salesEmployees = useMemo(() => {
    return employees
      .filter((e) => e.department === "Kinh doanh")
      .map((e) => e.fullName);
  }, [employees]);
  
  // Goods list items state
  const [items, setItems] = useState<any[]>([
    { productCode: "", productName: "", unit: "", quantity: 1, price: 0, amount: 0, brix: "", packaging: "", note: "", quantityInput: "1", priceInput: "$ 0", productSearch: "" }
  ]);
  
  const [docList, setDocList] = useState<any[]>(DEFAULT_DOCUMENTS);
  const [attachmentList, setAttachmentList] = useState<any[]>([]);
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  const selectedContract = useMemo(() => {
    return contracts.find((c) => c.id === selectedContractId) || null;
  }, [contracts, selectedContractId]);

  // State for Searchable Seller
  const [sellerSearch, setSellerSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState("");
  const [showSellerDropdown, setShowSellerDropdown] = useState(false);

  // State for Searchable Buyer
  const [buyerSearch, setBuyerSearch] = useState("");
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [showBuyerDropdown, setShowBuyerDropdown] = useState(false);

  // State for Searchable Product per row
  const [activeProductSearchIdx, setActiveProductSearchIdx] = useState<number | null>(null);

  // Date calculation states
  const [contractDate, setContractDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [salesEmployee, setSalesEmployee] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState("");

  const currentSelectedBank = useMemo(() => {
    return banks.find(b => b.bankAccount === selectedBankAccount) || null;
  }, [banks, selectedBankAccount]);

  const calculateExpiryDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    date.setMonth(date.getMonth() + 12);
    return date.toISOString().split("T")[0];
  };

  const generateContractNumber = (buyerName: string, dateStr: string): string => {
    if (!buyerName || !dateStr) return "";

    const cust = customers.find(c => c.name.toLowerCase() === buyerName.toLowerCase());
    if (!cust) return "";

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const year2Digits = String(date.getFullYear()).slice(-2);

    const customerAbbr = (cust.abbreviation || cust.code || "").trim().toUpperCase();
    const prefix = `SC${year2Digits}${customerAbbr}`;
    const matchingContracts = contracts.filter(c => 
      c.contractNumber && c.contractNumber.startsWith(prefix)
    );

    let maxSeq = 0;
    matchingContracts.forEach(c => {
      const suffix = c.contractNumber.slice(prefix.length);
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    });

    const seq = String(maxSeq + 1).padStart(2, "0");

    return `${prefix}${seq}`;
  };

  // Sync inputs with editingContract
  useEffect(() => {
    if (editingContract) {
      setSellerSearch(editingContract.seller || "");
      setSelectedSeller(editingContract.seller || "");
      setBuyerSearch(editingContract.buyer || "");
      setSelectedBuyer(editingContract.buyer || "");
      setSalesEmployee(editingContract.salesEmployee || "");
      setPaymentMethod(editingContract.paymentMethod || "L/C at sight");
      setThermometerChecked(!!editingContract.thermometer);
      setThermometerQty(editingContract.thermometerQty || 0);
      setSelectedBankAccount(editingContract.bankAccount || "");

      if (isDuplicateMode) {
        const today = new Date().toISOString().split("T")[0];
        setContractDate(today);
        setExpiryDate(calculateExpiryDate(today));
        const generated = generateContractNumber(editingContract.buyer, today);
        setContractNumber(generated);
      } else {
        setContractNumber(editingContract.contractNumber || "");
        const cDate = editingContract.contractDate
          ? new Date(editingContract.contractDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        setContractDate(cDate);
        const eDate = editingContract.expiryDate
          ? new Date(editingContract.expiryDate).toISOString().split("T")[0]
          : "";
        setExpiryDate(eDate);
      }
    } else {
      setSellerSearch("");
      setSelectedSeller("");
      setBuyerSearch("");
      setSelectedBuyer("");
      setContractNumber("");
      // Default to currentUser if they are in the sales employee list
      const defaultSalesEmp = salesEmployees.includes(currentUser) ? currentUser : "";
      setSalesEmployee(defaultSalesEmp);

      const today = new Date().toISOString().split("T")[0];
      setContractDate(today);
      setExpiryDate(calculateExpiryDate(today));
      setPaymentMethod("L/C at sight");
      setThermometerChecked(false);
      setThermometerQty(0);
      setSelectedBankAccount("");
    }
  }, [editingContract, showModal, isDuplicateMode]);

  // Auto-generate contract number when creating new contract or duplicating
  useEffect(() => {
    if ((!editingContract || isDuplicateMode) && showModal) {
      const generated = generateContractNumber(selectedBuyer, contractDate);
      setContractNumber(generated);
    }
  }, [selectedBuyer, contractDate, editingContract, showModal, isDuplicateMode]);

  // For Seller suggestions:
  const filteredSellers = useMemo(() => {
    if (!sellerSearch) return customers;
    const s = sellerSearch.toLowerCase();
    return customers.filter(cust => 
      (cust.name || "").toLowerCase().includes(s) ||
      (cust.code || "").toLowerCase().includes(s) ||
      (cust.abbreviation || "").toLowerCase().includes(s)
    );
  }, [customers, sellerSearch]);

  // For Buyer suggestions:
  const filteredBuyers = useMemo(() => {
    if (!buyerSearch) return customers;
    const s = buyerSearch.toLowerCase();
    return customers.filter(cust => 
      (cust.name || "").toLowerCase().includes(s) ||
      (cust.code || "").toLowerCase().includes(s) ||
      (cust.abbreviation || "").toLowerCase().includes(s)
    );
  }, [customers, buyerSearch]);

  const handleSellerBlur = () => {
    setTimeout(() => {
      const match = customers.find(c => c.name.toLowerCase() === sellerSearch.trim().toLowerCase());
      if (match) {
        setSelectedSeller(match.name);
        setSellerSearch(match.name);
      } else {
        setSelectedSeller("");
        setSellerSearch("");
      }
      setShowSellerDropdown(false);
    }, 200);
  };

  const handleBuyerBlur = () => {
    setTimeout(() => {
      const match = customers.find(c => c.name.toLowerCase() === buyerSearch.trim().toLowerCase());
      if (match) {
        setSelectedBuyer(match.name);
        setBuyerSearch(match.name);
      } else {
        setSelectedBuyer("");
        setBuyerSearch("");
      }
      setShowBuyerDropdown(false);
    }, 200);
  };

  // Filters
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeller, setFilterSeller] = useState("");
  const [filterBuyer, setFilterBuyer] = useState("");
  const [filterSalesEmployee, setFilterSalesEmployee] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("down");
  const [showFilters, setShowFilters] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState<{ id: string; status: string; info: string } | null>(null);
  const [printWarningContract, setPrintWarningContract] = useState<{ id: string; number: string } | null>(null);
  const [historyRecordId, setHistoryRecordId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("L/C at sight");
  const [thermometerChecked, setThermometerChecked] = useState<boolean>(false);
  const [thermometerQty, setThermometerQty] = useState<number>(0);
  const [productNameWidth, setProductNameWidth] = useState<number>(250);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = productNameWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(150, startWidth + (moveEvent.clientX - startX));
      setProductNameWidth(newWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Close dropdown when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Auto-Sync
  useRealTimeSync("contracts", contracts, setContracts);
  useRealTimeSync("customers", customers, setCustomers);
  useRealTimeSync("products", products, setProducts);
  useRealTimeSync("employees", employees, setEmployees);

  // Filter Logic
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const matchSearch =
        !filterSearch ||
        c.contractNumber.toLowerCase().includes(filterSearch.toLowerCase()) ||
        c.seller.toLowerCase().includes(filterSearch.toLowerCase()) ||
        c.buyer.toLowerCase().includes(filterSearch.toLowerCase());
      const matchStatus = !filterStatus || c.status === filterStatus;
      const matchSeller = !filterSeller || c.seller === filterSeller;
      const matchBuyer = !filterBuyer || c.buyer === filterBuyer;
      const matchSalesEmployee = !filterSalesEmployee || c.salesEmployee === filterSalesEmployee;
      const matchMonth =
        !filterMonth ||
        (new Date(c.contractDate).getMonth() + 1).toString().padStart(2, "0") === filterMonth.split("-")[1];
      return matchSearch && matchStatus && matchSeller && matchBuyer && matchSalesEmployee && matchMonth;
    });
  }, [contracts, filterSearch, filterStatus, filterSeller, filterBuyer, filterSalesEmployee, filterMonth]);

  const toggleExpand = (id: string) => {
    setExpandedContractId((prev) => (prev === id ? null : id));
  };

  const uniqueSellers = useMemo(() => {
    return Array.from(new Set(contracts.map((c) => c.seller)));
  }, [contracts]);

  const uniqueBuyers = useMemo(() => {
    return Array.from(new Set(contracts.map((c) => c.buyer)));
  }, [contracts]);

  function handleClose() {
    setShowModal(false);
    setEditingContract(null);
    setIsViewMode(false);
    setIsDuplicateMode(false);
    setItems([
      { productCode: "", productName: "", unit: "", quantity: 1, price: 0, amount: 0, brix: "", packaging: "", note: "", quantityInput: "1", priceInput: "$ 0", productSearch: "" }
    ]);
    setDocList(DEFAULT_DOCUMENTS);
    setAttachmentList([]);
    setActiveTab(1);
    setError(null);
  }

  function handleDuplicate(contract: any) {
    setEditingContract(contract);
    setIsViewMode(false);
    setIsDuplicateMode(true);
    setItems(
      contract.contractitem.length > 0
        ? contract.contractitem.map((item: any) => ({
            ...item,
            id: undefined,
            contractId: undefined,
            quantityInput: formatLocaleNumber(item.quantity),
            priceInput: `$ ${formatLocaleNumber(item.price)}`,
            productSearch: item.productCode ? `${item.productCode} - ${item.productName}` : ""
          }))
        : [{ productCode: "", productName: "", unit: "", quantity: 1, price: 0, amount: 0, brix: "", packaging: "", note: "", quantityInput: "1", priceInput: "$ 0", productSearch: "" }]
    );
    
    // Parse accompanying documents JSON
    if (contract.accompanyingDocuments) {
      try {
        const parsed = JSON.parse(contract.accompanyingDocuments);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.map((doc: any) => ({
            ...doc,
            original: doc.original === true ? 1 : (typeof doc.original === "number" ? doc.original : 0),
            copy: doc.copy === true ? 1 : (typeof doc.copy === "number" ? doc.copy : 0),
          }));
          setDocList(sanitized);
        } else {
          setDocList(DEFAULT_DOCUMENTS);
        }
      } catch (e) {
        setDocList(DEFAULT_DOCUMENTS);
      }
    } else {
      setDocList(DEFAULT_DOCUMENTS);
    }

    // Parse attachments JSON
    if (contract.attachments) {
      try {
        const parsed = JSON.parse(contract.attachments);
        if (Array.isArray(parsed)) {
          setAttachmentList(parsed);
        } else {
          setAttachmentList([]);
        }
      } catch (e) {
        setAttachmentList([]);
      }
    } else {
      setAttachmentList([]);
    }

    setSellerSearch(contract.seller || "");
    setSelectedSeller(contract.seller || "");
    setBuyerSearch(contract.buyer || "");
    setSelectedBuyer(contract.buyer || "");
    setSalesEmployee(contract.salesEmployee || "");

    const today = new Date().toISOString().split("T")[0];
    setContractDate(today);
    setExpiryDate(calculateExpiryDate(today));
    setPaymentMethod(contract.paymentMethod || "L/C at sight");
    setThermometerChecked(!!contract.thermometer);
    setThermometerQty(contract.thermometerQty || 0);

    // Auto-generate contract number immediately
    const generated = generateContractNumber(contract.buyer, today);
    setContractNumber(generated);

    setActiveTab(1);
    setShowModal(true);
  }

  function handleEdit(contract: any) {
    setEditingContract(contract);
    setIsViewMode(false);
    setItems(
      contract.contractitem.length > 0
        ? contract.contractitem.map((item: any) => ({
            ...item,
            quantityInput: formatLocaleNumber(item.quantity),
            priceInput: `$ ${formatLocaleNumber(item.price)}`,
            productSearch: item.productCode ? `${item.productCode} - ${item.productName}` : ""
          }))
        : [{ productCode: "", productName: "", unit: "", quantity: 1, price: 0, amount: 0, brix: "", packaging: "", note: "", quantityInput: "1", priceInput: "$ 0", productSearch: "" }]
    );
    
    // Parse accompanying documents JSON
    if (contract.accompanyingDocuments) {
      try {
        const parsed = JSON.parse(contract.accompanyingDocuments);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.map((doc: any) => ({
            ...doc,
            original: doc.original === true ? 1 : (typeof doc.original === "number" ? doc.original : 0),
            copy: doc.copy === true ? 1 : (typeof doc.copy === "number" ? doc.copy : 0),
          }));
          setDocList(sanitized);
        } else {
          setDocList(DEFAULT_DOCUMENTS);
        }
      } catch (e) {
        setDocList(DEFAULT_DOCUMENTS);
      }
    } else {
      setDocList(DEFAULT_DOCUMENTS);
    }

    // Parse attachments JSON
    if (contract.attachments) {
      try {
        const parsed = JSON.parse(contract.attachments);
        if (Array.isArray(parsed)) {
          setAttachmentList(parsed);
        } else {
          setAttachmentList([]);
        }
      } catch (e) {
        setAttachmentList([]);
      }
    } else {
      setAttachmentList([]);
    }

    setActiveTab(1);
    setShowModal(true);
  }

  function handleView(contract: any) {
    setEditingContract(contract);
    setIsViewMode(true);
    setItems(
      contract.contractitem.length > 0
        ? contract.contractitem.map((item: any) => ({
            ...item,
            quantityInput: formatLocaleNumber(item.quantity),
            priceInput: `$ ${formatLocaleNumber(item.price)}`,
            productSearch: item.productCode ? `${item.productCode} - ${item.productName}` : ""
          }))
        : []
    );
    
    // Parse accompanying documents JSON
    if (contract.accompanyingDocuments) {
      try {
        const parsed = JSON.parse(contract.accompanyingDocuments);
        if (Array.isArray(parsed)) {
          const sanitized = parsed.map((doc: any) => ({
            ...doc,
            original: doc.original === true ? 1 : (typeof doc.original === "number" ? doc.original : 0),
            copy: doc.copy === true ? 1 : (typeof doc.copy === "number" ? doc.copy : 0),
          }));
          setDocList(sanitized);
        } else {
          setDocList(DEFAULT_DOCUMENTS);
        }
      } catch (e) {
        setDocList(DEFAULT_DOCUMENTS);
      }
    } else {
      setDocList(DEFAULT_DOCUMENTS);
    }

    // Parse attachments JSON
    if (contract.attachments) {
      try {
        const parsed = JSON.parse(contract.attachments);
        if (Array.isArray(parsed)) {
          setAttachmentList(parsed);
        } else {
          setAttachmentList([]);
        }
      } catch (e) {
        setAttachmentList([]);
      }
    } else {
      setAttachmentList([]);
    }

    setActiveTab(1);
    setShowModal(true);
  }

  function handleStatusChange(id: string, newStatus: string, info?: string) {
    setConfirmUpdate({ id, status: newStatus, info: info || "" });
  }

  function executeStatusChange() {
    if (!confirmUpdate) return;
    const { id, status: newStatus } = confirmUpdate;
    setConfirmUpdate(null);
    startTransition(async () => {
      try {
        if (newStatus === "Đã phê duyệt") {
          await approveContract(id);
        } else {
          await updateContractStatus(id, newStatus);
        }
      } catch (err: any) {
        alert(err.message);
      }
    });
  }

  function handleDelete(id: string, number: string) {
    if (confirm(`Bạn có chắc chắn muốn xóa hợp đồng số ${number} không?`)) {
      startTransition(async () => {
        try {
          await deleteContract(id);
        } catch (err: any) {
          alert(err.message);
        }
      });
    }
  }

  function addItem() {
    if (isViewMode) return;
    setItems([...items, { productCode: "", productName: "", unit: "", quantity: 1, price: 0, amount: 0, brix: "", packaging: "", note: "", quantityInput: "1", priceInput: "$ 0", productSearch: "" }]);
  }

  function removeItem(index: number) {
    if (isViewMode) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: any) {
    if (isViewMode) return;
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  // Handle formatted Quantity input changes
  const handleQuantityChange = (idx: number, rawVal: string) => {
    const cleanInput = rawVal.replace(/[^0-9.,-]/g, "");
    const newItems = [...items];
    newItems[idx].quantityInput = cleanInput;
    
    const parsed = parseLocaleNumber(cleanInput);
    newItems[idx].quantity = parsed;
    newItems[idx].amount = parsed * (newItems[idx].price || 0);
    setItems(newItems);
  };
  
  const handleQuantityBlur = (idx: number) => {
    const newItems = [...items];
    const num = newItems[idx].quantity || 0;
    newItems[idx].quantityInput = formatLocaleNumber(num);
    setItems(newItems);
  };

  // Handle formatted Price input changes
  const handlePriceChange = (idx: number, rawVal: string) => {
    const cleanInput = rawVal.replace(/[^0-9.,-]/g, "");
    const newItems = [...items];
    newItems[idx].priceInput = cleanInput;
    
    // Round to maximum of 3 decimal places
    const parsed = Math.round(parseLocaleNumber(cleanInput) * 1000) / 1000;
    newItems[idx].price = parsed;
    newItems[idx].amount = (newItems[idx].quantity || 0) * parsed;
    setItems(newItems);
  };
  
  const handlePriceBlur = (idx: number) => {
    const newItems = [...items];
    // Round price to maximum of 3 decimal places
    const rounded = Math.round((newItems[idx].price || 0) * 1000) / 1000;
    newItems[idx].price = rounded;
    newItems[idx].priceInput = `$ ${formatLocaleNumber2Dec(rounded)}`;
    newItems[idx].amount = (newItems[idx].quantity || 0) * rounded;
    setItems(newItems);
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isViewMode) return;

    // Validate goods list items
    if (items.length === 0) {
      setActiveTab(3);
      setError("Vui lòng thêm ít nhất một dòng hàng hóa.");
      setTimeout(() => {
        const scrollable = document.querySelector(".scrollable-body");
        if (scrollable) scrollable.scrollTop = 0;
      }, 100);
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productCode) {
        setActiveTab(3);
        setError(`Vui lòng chọn sản phẩm cho dòng hàng hóa thứ ${i + 1}.`);
        setTimeout(() => {
          const scrollable = document.querySelector(".scrollable-body");
          if (scrollable) scrollable.scrollTop = 0;
        }, 100);
        return;
      }
      if (item.brix === undefined || item.brix === null || item.brix.toString().trim() === "") {
        setActiveTab(3);
        setError(`Vui lòng nhập độ Brix cho dòng hàng hóa thứ ${i + 1}.`);
        setTimeout(() => {
          const scrollable = document.querySelector(".scrollable-body");
          if (scrollable) scrollable.scrollTop = 0;
        }, 100);
        return;
      }
      if (!item.unit || !item.unit.trim()) {
        setActiveTab(3);
        setError(`Vui lòng nhập ĐVT cho dòng hàng hóa thứ ${i + 1}.`);
        setTimeout(() => {
          const scrollable = document.querySelector(".scrollable-body");
          if (scrollable) scrollable.scrollTop = 0;
        }, 100);
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        setActiveTab(3);
        setError(`Vui lòng nhập Số lượng hợp lệ (lớn hơn 0) cho dòng hàng hóa thứ ${i + 1}.`);
        setTimeout(() => {
          const scrollable = document.querySelector(".scrollable-body");
          if (scrollable) scrollable.scrollTop = 0;
        }, 100);
        return;
      }
      if (item.price === undefined || item.price === null || item.price <= 0) {
        setActiveTab(3);
        setError(`Vui lòng nhập Đơn giá hợp lệ (lớn hơn 0) cho dòng hàng hóa thứ ${i + 1}.`);
        setTimeout(() => {
          const scrollable = document.querySelector(".scrollable-body");
          if (scrollable) scrollable.scrollTop = 0;
        }, 100);
        return;
      }
    }

    // Validate attachments
    for (let i = 0; i < attachmentList.length; i++) {
      if (!attachmentList[i].name || !attachmentList[i].name.trim()) {
        setActiveTab(5); // Switch to Tab 5 (Tệp đính kèm)
        setError(`Vui lòng nhập tên tài liệu / mô tả cho tệp đính kèm dòng số ${i + 1}.`);
        setTimeout(() => {
          const scrollable = document.querySelector(".scrollable-body");
          if (scrollable) scrollable.scrollTop = 0;
        }, 100);
        return;
      }
      if (!attachmentList[i].fileName) {
        setActiveTab(5); // Switch to Tab 5
        setError(`Vui lòng tải lên tệp PDF cho tệp đính kèm dòng số ${i + 1}.`);
        setTimeout(() => {
          const scrollable = document.querySelector(".scrollable-body");
          if (scrollable) scrollable.scrollTop = 0;
        }, 100);
        return;
      }
    }

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (editingContract && !isDuplicateMode) await updateContract(editingContract.id, formData, items);
        else await createContract(formData, items);
        router.refresh();
        handleClose();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  // Parse and display accompanying documents
  function renderAccompanyingDocs(docsString: string | null) {
    if (!docsString) return "—";
    try {
      const list = JSON.parse(docsString);
      if (!Array.isArray(list)) return docsString;
      
      const activeDocs = list.filter(d => d.original || d.copy);
      if (activeDocs.length === 0) return "Không chọn chứng từ kèm theo";
      
      return (
        <table style={{ fontSize: "13px", width: "100%", marginTop: "0.5rem", borderCollapse: "collapse", border: "1px solid #e2e8f0" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ padding: "4px 8px", borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", textAlign: "left" }}>Chứng từ</th>
              <th style={{ padding: "4px 8px", borderBottom: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", textAlign: "center", width: "70px" }}>Original</th>
              <th style={{ padding: "4px 8px", borderBottom: "1px solid #e2e8f0", textAlign: "center", width: "70px" }}>Copy</th>
            </tr>
          </thead>
          <tbody>
            {activeDocs.map((doc, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 1 ? "#f8fafc" : "#fff" }}>
                <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: idx !== activeDocs.length - 1 ? "1px solid #e2e8f0" : "none", fontWeight: 500 }}>{doc.label}</td>
                <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", borderBottom: idx !== activeDocs.length - 1 ? "1px solid #e2e8f0" : "none", textAlign: "center" }}>
                  {doc.original ? <span style={{ color: "#10b981", fontWeight: "bold" }}>✓ Original</span> : "—"}
                </td>
                <td style={{ padding: "4px 8px", borderBottom: idx !== activeDocs.length - 1 ? "1px solid #e2e8f0" : "none", textAlign: "center" }}>
                  {doc.copy ? <span style={{ color: "#3b82f6", fontWeight: "bold" }}>✓ Copy</span> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } catch (e) {
      return docsString; // Fallback
    }
  }

  const getTabButtonStyle = (tabNum: number) => ({
    padding: "8px 12px",
    border: "none",
    background: "none",
    cursor: "pointer",
    borderBottom: activeTab === tabNum ? "2px solid #0066cc" : "2px solid transparent",
    fontWeight: activeTab === tabNum ? 700 : 500,
    color: activeTab === tabNum ? "#0066cc" : "#4b5563",
    fontSize: "12px",
    transition: "all 0.15s ease",
    marginBottom: "-2px",
    whiteSpace: "nowrap",
  });

  return (
    <div className="contract-page-container">
      <style dangerouslySetInnerHTML={{
        __html: `
        .contract-page-container {
          width: 100%;
          min-width: 0;
        }
        .contract-layout {
          display: flex;
          gap: 1.5rem;
          width: 100%;
          min-width: 0;
          font-family: "Segoe UI", -apple-system, sans-serif;
          font-size: 13px;
          padding: 10px 0px 10px 0px;
        }
        .contract-layout input,
        .contract-layout select,
        .contract-layout textarea,
        .contract-layout button,
        .contract-layout table,
        .contract-layout td,
        .contract-layout th,
        .contract-layout label,
        .contract-layout .badge,
        .contract-layout .blue-panel-header,
        .contract-page-container .breadcrumb-banner {
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
          margin-left: -10px;
          margin-right: -10px;
        }
        .panel-full {
          flex: 1 1 100%;
          width: 100%;
          min-width: 0;
        }
        .blue-panel {
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #ffffff;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
        }
        .blue-panel-header {
          background-color: #003466;
          color: #ffffff;
          padding: 6px 15px 6px 15px;
          font-weight: 700;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #ff5c00;
        }
        .blue-panel-body {
          padding: 10px;
        }
        .search-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 5px 0px 10px 0px;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .sapo-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background-color: #003466;
          color: white;
          padding: 6px 15px 6px 15px;
          border-radius: 4px;
          font-weight: 400;
          font-size: 13px !important;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          border: none;
        }
        .sapo-btn:hover {
          background-color: #002244;
        }
        .sapo-btn:active {
          transform: scale(0.98);
        }
        .sapo-btn-secondary {
          background-color: #475569;
        }
        .sapo-btn-secondary:hover {
          background-color: #334155;
        }
        .sapo-btn-success {
          background-color: #22c55e;
        }
        .sapo-btn-success:hover {
          background-color: #16a34a;
        }
        .sapo-btn-warning {
          background-color: #f59e0b;
        }
        .sapo-btn-warning:hover {
          background-color: #d97706;
        }
        .sapo-btn-danger {
          background-color: #ef4444;
        }
        .sapo-btn-danger:hover {
          background-color: #dc2626;
        }
        .sapo-btn-info {
          background-color: #2563eb;
        }
        .sapo-btn-info:hover {
          background-color: #1d4ed8;
        }
        .sapo-btn-teal {
          background-color: #0d9488;
        }
        .sapo-btn-teal:hover {
          background-color: #0f766e;
        }
        .sapo-btn-sm {
          padding: 4px 8px !important;
          font-size: 12px !important;
          border-radius: 4px !important;
          font-weight: 400 !important;
        }
        .sapo-btn-sm svg {
          width: 14px !important;
          height: 14px !important;
        }
        .row-hoverable:hover {
          background-color: #f8fafc;
        }
        .row-selected {
          background-color: #eff6ff !important;
        }

        .base-toolbar {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 0.75rem !important;
          padding: 0 !important;
          gap: 1rem !important;
          flex-wrap: nowrap !important;
          width: 100% !important;
          font-family: "Segoe UI", sans-serif !important;
        }
        .toolbar-left {
          display: flex !important;
          align-items: center !important;
          gap: 1rem !important;
        }
        .toolbar-right {
          display: flex !important;
          align-items: center !important;
          gap: 0.75rem !important;
        }
        .btn-group-base {
          display: flex !important;
          gap: 0.75rem !important;
        }
        .page-title-base {
          font-size: 1.25rem !important;
          font-weight: 700 !important;
          color: #000000 !important;
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          margin: 0 !important;
        }
        .badge-count {
          background: #e2e8f0 !important;
          color: #000000 !important;
          font-size: 0.75rem !important;
          font-weight: 700 !important;
          padding: 2px 8px !important;
          border-radius: 999px !important;
          margin-left: 0.25rem !important;
        }
        .base-table-wrapper {
          height: auto !important;
          min-height: unset !important;
          overflow-y: hidden !important;
          overflow-x: auto !important;
          padding-bottom: 0px !important;
        }
        .base-table {
          height: auto !important;
          width: 100% !important;
          min-width: 1200px !important;
          table-layout: auto !important;
        }
        .base-table th {
          text-transform: uppercase !important;
          font-weight: 700 !important;
          color: #003466 !important;
          background: #f1f5f9 !important;
          border-bottom: 2px solid #ff5c00 !important;
          text-align: center !important;
          height: 35px !important;
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
        .base-table td {
          padding: 6px 0.75rem !important;
          vertical-align: middle !important;
          white-space: normal !important;
          word-break: break-word !important;
        }
        .base-table tbody tr {
          height: 45px !important;
        }
        .nowrap, .base-table .nowrap {
          white-space: nowrap !important;
        }
        .search-box-base {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
        }
        .search-box-base input {
          width: 220px !important;
          padding: 6px 10px 6px 30px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          outline: none !important;
          font-weight: 500 !important;
        }
        .search-box-base .search-icon {
          position: absolute !important;
          left: 10px !important;
          color: #94a3b8 !important;
        }
        .base-filters {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          padding: 10px !important;
        }
        .form-control {
          padding: 6px 10px !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 4px !important;
          outline: none !important;
          background: white !important;
        }
      ` }} />

      <div className="breadcrumb-banner">
        HỢP ĐỒNG XUẤT KHẨU
      </div>

      <div className="base-filters" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "10px", marginBottom: "10px" }}>
        <div>
          <label className="filter-label">Khách hàng</label>
          <select className="form-control" style={{ width: "100%" }} value={filterBuyer} onChange={(e) => setFilterBuyer(e.target.value)}>
            <option value="">-- Tất cả khách hàng --</option>
            {uniqueBuyers.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="filter-label">Trạng thái</label>
          <select className="form-control" style={{ width: "100%" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">-- Tất cả trạng thái --</option>
            <option value="Tạo mới">Tạo mới</option>
            <option value="Chờ phê duyệt">Chờ phê duyệt</option>
            <option value="Đã phê duyệt">Đã phê duyệt</option>
            <option value="Từ chối">Từ chối</option>
            <option value="Đã hủy">Đã hủy</option>
          </select>
        </div>
        <div>
          <label className="filter-label">Nhân viên</label>
          <select className="form-control" style={{ width: "100%" }} value={filterSalesEmployee} onChange={(e) => setFilterSalesEmployee(e.target.value)}>
            <option value="">-- Tất cả nhân viên --</option>
            {salesEmployees.map(se => <option key={se} value={se}>{se}</option>)}
          </select>
        </div>
        <div>
          <label className="filter-label">Tháng</label>
          <input type="month" className="form-control" style={{ width: "100%" }} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
        </div>
      </div>

      <div className="contract-layout" style={{ paddingTop: "0px" }}>
        <div className="panel-full">
          <div className="search-container" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", alignItems: "center", marginTop: "0px" }}>
            <button
              type="button"
              className="sapo-btn"
              onClick={() => {
                setIsViewMode(false);
                setShowModal(true);
              }}
            >
              Thêm mới
            </button>

            {selectedContract && (
              <>
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => handleView(selectedContract)}
                >
                  Xem
                </button>
                {selectedContract.status !== "Đã hủy" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => {
                      if (selectedContract.status !== "Đã phê duyệt") {
                        setPrintWarningContract({ id: selectedContract.id, number: selectedContract.contractNumber });
                      } else {
                        window.open(`/sales/hop-dong/in/${selectedContract.id}`, "_blank");
                      }
                    }}
                  >
                    In
                  </button>
                )}
                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => setHistoryRecordId(selectedContract.id)}
                >
                  Lịch sử
                </button>

                <button
                  type="button"
                  className="sapo-btn"
                  onClick={() => handleDuplicate(selectedContract)}
                >
                  Nhân bản
                </button>

                {selectedContract.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleEdit(selectedContract)}
                  >
                    Sửa
                  </button>
                )}
                {selectedContract.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusChange(selectedContract.id, "Chờ phê duyệt", `hợp đồng ${selectedContract.contractNumber}`)}
                  >
                    Gửi
                  </button>
                )}
                {selectedContract.status === "Chờ phê duyệt" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusChange(selectedContract.id, "Đã phê duyệt", `hợp đồng ${selectedContract.contractNumber}`)}
                  >
                    Duyệt
                  </button>
                )}
                {selectedContract.status === "Chờ phê duyệt" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusChange(selectedContract.id, "Từ chối", `hợp đồng ${selectedContract.contractNumber}`)}
                  >
                    Từ chối
                  </button>
                )}
                {selectedContract.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusChange(selectedContract.id, "Đã hủy", `hợp đồng ${selectedContract.contractNumber}`)}
                  >
                    Hủy
                  </button>
                )}
                {selectedContract.status === "Chờ phê duyệt" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleStatusChange(selectedContract.id, "Tạo mới", `hợp đồng ${selectedContract.contractNumber}`)}
                  >
                    Thu hồi
                  </button>
                )}
                {selectedContract.status === "Tạo mới" && (
                  <button
                    type="button"
                    className="sapo-btn"
                    onClick={() => handleDelete(selectedContract.id, selectedContract.contractNumber)}
                  >
                    Xóa
                  </button>
                )}
              </>
            )}

          </div>

          {/* Contracts Table */}
          <div className="base-table-wrapper" style={filteredContracts.length === 0 ? { height: "auto" } : undefined}>
            <table className="base-table">
              <thead>
                <tr>
                  <th className="th-first nowrap" style={{ width: "50px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>STT</th>
                  <th className="nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>NVKD</th>
                  <th className="nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Hợp đồng</th>
                  <th style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Khách hàng (Bên mua)</th>
                  <th style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>ĐK giao hàng</th>
                  <th className="nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>PT thanh toán</th>
                  <th className="nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Giá trị</th>
                  <th className="th-last nowrap" style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Trạng thái</th>
                </tr>
              </thead>
          <tbody>
            {filteredContracts.map((contract, idx) => (
              <React.Fragment key={contract.id}>
                <tr
                  onClick={() => setSelectedContractId(selectedContractId === contract.id ? null : contract.id)}
                  title="Nhấp để chọn hợp đồng"
                  className={`row-hoverable ${selectedContractId === contract.id ? "row-selected" : ""}`}
                  style={{
                    cursor: "pointer"
                  }}
                >
                  <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>{idx + 1}</td>
                  <td className="nowrap" style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>
                    {contract.salesEmployee || "—"}
                  </td>
                  <td className="nowrap" style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 600, color: "var(--primary-color)" }}>{contract.contractNumber}</div>
                    <div style={{ fontSize: "0.8rem", color: "#000", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginTop: "2px" }}>
                      <Calendar size={12} />
                      {new Date(contract.contractDate).toLocaleDateString("vi-VN")}
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 600, color: "#000" }}>{contract.buyer}</div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 600, color: "#000" }}>
                      {contract.deliveryTerms || "—"}
                      {contract.portOfDischarge ? ` • Cảng đến: ${contract.portOfDischarge}` : ""}
                    </div>
                  </td>
                  <td className="nowrap" style={{ textAlign: "center" }}>
                    <div style={{ color: "#000", fontWeight: 600 }}>{contract.paymentMethod || "—"}</div>
                  </td>
                  <td className="nowrap" style={{ textAlign: "center", fontWeight: 600, color: "#2563eb" }}>
                    ${formatLocaleNumber2Dec(contract.contractitem?.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0) || 0)}
                  </td>
                  <td className="nowrap" style={{ textAlign: "center" }}>
                    <span
                      className={`status-pill ${
                        contract.status === "Đã phê duyệt"
                          ? "status-active"
                          : contract.status === "Tạo mới"
                          ? "status-new"
                          : contract.status === "Chờ phê duyệt"
                          ? "status-pending"
                          : "status-inactive"
                      }`}
                    >
                      {contract.status}
                    </span>
                  </td>
                </tr>
                {expandedContractId === contract.id && (
                  <tr>
                    <td colSpan={8} style={{ padding: "0.75rem 1.5rem", background: "#f8fafc" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "max-content 1fr",
                          gap: "1.5rem",
                          padding: "1rem",
                          background: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)",
                        }}
                      >
                        {/* Shipping & Payment column */}
                        <div>
                          <h4
                            style={{
                              margin: "0 0 0.75rem 0",
                              fontSize: "0.9rem",
                              color: "#000",
                              fontWeight: "700",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              borderBottom: "1px solid #f1f5f9",
                              paddingBottom: "0.5rem",
                            }}
                          >
                            <FileText size={16} /> Giao nhận & Thanh toán
                          </h4>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 1.5rem", fontSize: "0.85rem", whiteSpace: "nowrap", color: "#000", fontWeight: 600 }}>
                            <div><strong>Cảng đi:</strong> {contract.portOfLoading || "—"}</div>
                            <div><strong>Cảng đến:</strong> {contract.portOfDischarge || "—"}</div>
                            <div><strong>Chuyển tải:</strong> {contract.transshipment || "—"}</div>
                            <div><strong>Giao hàng từng phần:</strong> {contract.partialShipment || "—"}</div>
                            <div><strong>Nhiệt kế:</strong> {contract.thermometer ? `Có${contract.thermometerQty ? ` (${contract.thermometerQty} cái)` : ""}` : "Không"}</div>
                            <div><strong>Pallet:</strong> {contract.pallet ? "Có" : "Không"}</div>
                            <div><strong>ĐK Giao hàng:</strong> {contract.deliveryTerms || "—"}</div>
                            <div><strong>NVKD:</strong> {contract.salesEmployee || "—"}</div>
                          </div>
                        </div>

                        {/* Product list column */}
                        <div>
                          <h4
                            style={{
                              margin: "0 0 0.75rem 0",
                              fontSize: "0.9rem",
                              color: "#000",
                              fontWeight: "700",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              borderBottom: "1px solid #f1f5f9",
                              paddingBottom: "0.5rem",
                            }}
                          >
                            <Calendar size={16} /> Danh sách hàng hóa
                          </h4>
                          <table className="table" style={{ fontSize: "13px", marginBottom: 0 }}>
                            <thead>
                              <tr style={{ background: "#f1f5f9" }}>
                                <th style={{ color: "#000", fontWeight: 700 }}>Mã SP</th>
                                <th style={{ color: "#000", fontWeight: 700 }}>Tên hàng hóa (EN)</th>
                                <th style={{ color: "#000", fontWeight: 700 }}>ĐVT</th>
                                <th style={{ textAlign: "right", color: "#000", fontWeight: 700 }}>Số lượng</th>
                                <th style={{ textAlign: "right", color: "#000", fontWeight: 700 }}>Đơn giá</th>
                                <th style={{ textAlign: "right", color: "#000", fontWeight: 700 }}>Thành tiền</th>
                                <th style={{ color: "#000", fontWeight: 700 }}>Ghi chú</th>
                              </tr>
                            </thead>
                            <tbody>
                              {contract.contractitem.map((item: any, i: number) => (
                                <tr key={i}>
                                  <td style={{ fontWeight: 600, color: "#000" }}>{item.productCode || "—"}</td>
                                  <td style={{ fontWeight: 600, color: "#000" }}>
                                    <div>{item.productName}</div>
                                    {(() => {
                                      const pkg = item.packaging || products.find(p => p.code === item.productCode)?.packaging;
                                      return pkg ? (
                                        <div style={{ fontSize: "10px", color: "#000", fontWeight: 600, fontStyle: "italic", marginTop: "2px" }}>
                                          Quy cách: {pkg}
                                        </div>
                                      ) : null;
                                    })()}
                                  </td>
                                  <td style={{ color: "#000", fontWeight: 600 }}>{item.unit || "—"}</td>
                                  <td style={{ textAlign: "right", fontWeight: 600, color: "#000" }}>{formatLocaleNumber(item.quantity)}</td>
                                  <td style={{ textAlign: "right", fontWeight: 600, color: "#10b981" }}>${formatLocaleNumber2Dec(item.price)}</td>
                                  <td style={{ textAlign: "right", fontWeight: 600, color: "#2563eb" }}>${formatLocaleNumber2Dec(item.amount)}</td>
                                  <td style={{ color: "#000", fontWeight: 600, fontStyle: "italic" }}>{item.note || "—"}</td>
                                </tr>
                              ))}
                              {contract.contractitem.length === 0 && (
                                <tr>
                                  <td colSpan={7} style={{ textAlign: "center", color: "#000", fontWeight: 600 }}>
                                    Không có chi tiết hàng hóa.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filteredContracts.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "#000", fontWeight: 600 }}>
                  Chưa có hợp đồng nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

        </div>
      </div>

      {/* History log modal */}
      {historyRecordId && (
        <HistoryModal tableName="Contract" recordId={historyRecordId} onClose={() => setHistoryRecordId(null)} />
      )}

      {/* Add / Edit Contract Modal */}
      {showModal && (
        <div className="custom-modal-overlay">
          <div
            style={{
              width: "95%",
              maxWidth: "800px",
              maxHeight: "90%",
              height: "480px", // Optimized height to fit laptops and small screens comfortably
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #cbd5e1",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden"
            }}
          >
            {/* Sticky Header */}
            <h3 style={{ borderBottom: "1px solid #e2e8f0", padding: "10px 24px", margin: 0, background: "#fff", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", fontSize: "16px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
              {isViewMode ? (
                <>
                  <span>🔍 Xem chi tiết hợp đồng:</span>
                  <span style={{ color: "#ff5c00" }}>{editingContract?.contractNumber}</span>
                </>
              ) : isDuplicateMode ? (
                <>
                  <span>📋 Nhân bản hợp đồng xuất khẩu:</span>
                  <span style={{ color: "#ff5c00" }}>{editingContract?.contractNumber}</span>
                </>
              ) : editingContract ? (
                <>
                  <span>✏️ Chỉnh sửa hợp đồng:</span>
                  <span style={{ color: "#ff5c00" }}>{editingContract?.contractNumber}</span>
                </>
              ) : (
                <span>📦 Thêm mới hợp đồng xuất khẩu</span>
              )}
            </h3>

            {/* Sticky Modal Tabs Navigation */}
            <div style={{ display: "flex", gap: "0.15rem", borderBottom: "2px solid #e2e8f0", padding: "0 1rem", background: "#f8fafc", overflowX: "auto", scrollbarWidth: "none" }}>
              <button
                type="button"
                onClick={() => setActiveTab(1)}
                style={getTabButtonStyle(1)}
              >
                1. Thông tin chung
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(2)}
                style={getTabButtonStyle(2)}
              >
                2. Giao nhận & Thanh toán
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(3)}
                style={getTabButtonStyle(3)}
              >
                3. Danh sách hàng hóa
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(4)}
                style={getTabButtonStyle(4)}
              >
                4. Chứng từ kèm theo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(5)}
                style={getTabButtonStyle(5)}
              >
                5. Tệp đính kèm
              </button>
            </div>

            {/* Scrollable Form Body Container */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              {(!editingContract || isDuplicateMode) && (
                <input type="hidden" name="expiryDate" value={expiryDate} />
              )}
              <div className="scrollable-body" style={{ flex: 1, overflowX: "auto", overflowY: "auto", padding: "12px 1.5rem" }}>
                {error && <div style={{ color: "#e74c3c", marginBottom: "1rem" }}>⚠️ {error}</div>}

                {/* Tab 1: General Info */}
                <div
                  style={{
                    display: activeTab === 1 ? "grid" : "none",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    rowGap: "10px",
                    columnGap: "1.25rem",
                  }}
                >
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: "30px" }}>
                    <div>
                      <label className="filter-label">Số hợp đồng <span style={{ color: "red" }}>(*)</span></label>
                      <input
                        type="text"
                        name="contractNumber"
                        className="input"
                        value={contractNumber}
                        onChange={(e) => setContractNumber(e.target.value)}
                        disabled={(!!editingContract && !isDuplicateMode) || isViewMode}
                        required
                        placeholder="Số hợp đồng sẽ tự động tạo"
                        style={{ width: "150px" }}
                      />
                    </div>
                    <div>
                      <label className="filter-label">Ngày ký hợp đồng <span style={{ color: "red" }}>(*)</span></label>
                      <input
                        type="date"
                        name="contractDate"
                        className="input"
                        disabled={isViewMode}
                        value={contractDate}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setContractDate(newDate);
                          if (newDate) {
                            setExpiryDate(calculateExpiryDate(newDate));
                          }
                        }}
                        required
                        style={{ width: "150px" }}
                      />
                    </div>
                    <div>
                      <label className="filter-label">Nhân viên kinh doanh <span style={{ color: "red" }}>(*)</span></label>
                      {isViewMode ? (
                        <input type="text" className="input" value={salesEmployee} disabled style={{ width: "230px" }} />
                      ) : (
                        <select
                          name="salesEmployee"
                          className="input"
                          value={salesEmployee}
                          onChange={(e) => setSalesEmployee(e.target.value)}
                          disabled={isViewMode}
                          required
                          style={{ width: "230px" }}
                        >
                          <option value="">-- Chọn nhân viên --</option>
                          {salesEmployees.map((emp) => (
                            <option key={emp} value={emp}>{emp}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  {/* Seller + Buyer: side-by-side, 50% each */}
                  <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: "10px", columnGap: "1.25rem" }}>
                    <div style={{ position: "relative", width: "100%" }}>
                      <label className="filter-label">Người bán <span style={{ color: "red" }}>(*)</span></label>
                      <input
                        type="text"
                        className="input"
                        value={sellerSearch}
                        onChange={(e) => {
                          setSellerSearch(e.target.value);
                          setSelectedSeller("");
                          setShowSellerDropdown(true);
                        }}
                        onFocus={() => setShowSellerDropdown(true)}
                        onBlur={handleSellerBlur}
                        disabled={isViewMode}
                        required
                        placeholder="Tìm kiếm người bán theo mã, tên, tên viết tắt..."
                      />
                      <input type="hidden" name="seller" value={selectedSeller} />
                      {showSellerDropdown && !isViewMode && (
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 1000,
                          maxHeight: "200px",
                          overflowY: "auto",
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                          marginTop: "4px"
                        }}>
                          {filteredSellers.length === 0 ? (
                            <div style={{ padding: "8px 12px", color: "#000000", fontWeight: 600, fontSize: "0.875rem" }}>
                              Không tìm thấy khách hàng
                            </div>
                          ) : (
                            filteredSellers.map((cust) => (
                              <div
                                key={cust.code}
                                onMouseDown={() => {
                                  setSelectedSeller(cust.name);
                                  setSellerSearch(cust.name);
                                  setShowSellerDropdown(false);
                                }}
                                style={{
                                  padding: "8px 12px",
                                  cursor: "pointer",
                                  fontSize: "0.875rem",
                                  color: "#000000",
                                  fontWeight: 600,
                                  borderBottom: "1px solid #f1f5f9"
                                }}
                                className="search-item-hover"
                              >
                                <div style={{ fontWeight: 600 }}>{cust.name}</div>
                                <div style={{ fontSize: "0.75rem", color: "#000000", fontWeight: 600 }}>
                                  Mã: {cust.code} {cust.abbreviation ? `| Tên viết tắt: ${cust.abbreviation}` : ""}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ position: "relative", width: "100%" }}>
                      <label className="filter-label">Người mua (Bên mua) <span style={{ color: "red" }}>(*)</span></label>
                      <input
                        type="text"
                        className="input"
                        value={buyerSearch}
                        onChange={(e) => {
                          setBuyerSearch(e.target.value);
                          setSelectedBuyer("");
                          setShowBuyerDropdown(true);
                        }}
                        onFocus={() => setShowBuyerDropdown(true)}
                        onBlur={handleBuyerBlur}
                        disabled={isViewMode}
                        required
                        placeholder="Tìm kiếm người mua theo mã, tên, tên viết tắt..."
                      />
                      <input type="hidden" name="buyer" value={selectedBuyer} />
                      {showBuyerDropdown && !isViewMode && (
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 1000,
                          maxHeight: "200px",
                          overflowY: "auto",
                          backgroundColor: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                          marginTop: "4px"
                        }}>
                          {filteredBuyers.length === 0 ? (
                            <div style={{ padding: "8px 12px", color: "#000000", fontWeight: 600, fontSize: "0.875rem" }}>
                              Không tìm thấy khách hàng
                            </div>
                          ) : (
                            filteredBuyers.map((cust) => (
                              <div
                                key={cust.code}
                                onMouseDown={() => {
                                  setSelectedBuyer(cust.name);
                                  setBuyerSearch(cust.name);
                                  setShowBuyerDropdown(false);
                                }}
                                style={{
                                  padding: "8px 12px",
                                  cursor: "pointer",
                                  fontSize: "0.875rem",
                                  color: "#000000",
                                  fontWeight: 600,
                                  borderBottom: "1px solid #f1f5f9"
                                }}
                                className="search-item-hover"
                              >
                                <div style={{ fontWeight: 600 }}>{cust.name}</div>
                                <div style={{ fontSize: "0.75rem", color: "#000000", fontWeight: 600 }}>
                                  Mã: {cust.code} {cust.abbreviation ? `| Tên viết tắt: ${cust.abbreviation}` : ""}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ghi chú chung */}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label className="filter-label">Ghi chú chung</label>
                      <textarea
                        name="note"
                        className="input"
                        disabled={isViewMode}
                        defaultValue={editingContract?.note ?? ""}
                        placeholder="Nhập ghi chú (nếu có)"
                        ref={(el) => {
                          if (el) {
                            el.style.height = "auto";
                            el.style.height = `${el.scrollHeight}px`;
                          }
                        }}
                        onInput={(e: any) => {
                          e.target.style.height = "auto";
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        rows={1}
                        style={{
                          width: "100%",
                          minHeight: "36px",
                          resize: "vertical",
                          padding: "8px 12px",
                          lineHeight: "1.4",
                          fontFamily: "inherit",
                          overflow: "auto"
                        }}
                      />
                    </div>
                  </div>
                  {editingContract && !isDuplicateMode ? (
                    <>
                      <div>
                        <label className="filter-label">Ngày hết hạn hợp đồng</label>
                        <input
                          type="date"
                          name="expiryDate"
                          className="input"
                          disabled={isViewMode}
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="filter-label">Trạng thái hồ sơ</label>
                        {isViewMode ? (
                          <input type="text" className="input" defaultValue={editingContract?.status ?? "Tạo mới"} disabled style={{ width: "100%" }} />
                        ) : (
                          <select
                            name="status"
                            className="input"
                            disabled={isViewMode}
                            defaultValue={editingContract?.status ?? "Tạo mới"}
                            style={{ width: "100%" }}
                          >
                            <option value="Tạo mới">Tạo mới</option>
                            <option value="Chờ phê duyệt">Chờ phê duyệt</option>
                            <option value="Đã phê duyệt">Đã phê duyệt</option>
                            <option value="Từ chối">Từ chối</option>
                            <option value="Đã hủy">Đã hủy</option>
                          </select>
                        )}
                      </div>
                    </>
                  ) : null}
                  {/* Banking Info Section */}
                  <div style={{ gridColumn: "1 / -1", margin: "0px 0 5px 0", borderBottom: "1px solid #e2e8f0", paddingBottom: "5px" }}>
                    <span style={{ fontWeight: 700, color: "#003466", fontSize: "12px", textTransform: "uppercase" }}>Thông tin ngân hàng</span>
                  </div>

                  <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", rowGap: "10px", columnGap: "1.25rem" }}>
                    <div style={{ gridColumn: "1 / -1", display: "flex", gap: "1.25rem" }}>
                      <div style={{ width: "calc(50% - 150px - 0.625rem)", flexShrink: 0 }}>
                        <label className="filter-label">Số tài khoản ngân hàng <span style={{ color: "red" }}>(*)</span></label>
                        {isViewMode ? (
                          <input
                            type="text"
                            className="input"
                            value={selectedBankAccount}
                            disabled
                            style={{ width: "100%" }}
                          />
                        ) : (
                          <select
                            name="bankAccount"
                            className="input"
                            value={selectedBankAccount}
                            onChange={(e) => setSelectedBankAccount(e.target.value)}
                            style={{ width: "100%" }}
                            required
                          >
                            <option value="">-- Chọn số tài khoản --</option>
                            {banks.map(b => {
                              if (b.status !== "Hoạt động" && b.bankAccount !== selectedBankAccount) return null;
                              return (
                                <option key={b.id} value={b.bankAccount}>
                                  {b.code} - {b.bankAccount}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="filter-label">Tên ngân hàng</label>
                        <input
                          type="text"
                          className="input"
                          value={currentSelectedBank?.bankName || ""}
                          disabled
                          placeholder="Tên ngân hàng..."
                          style={{ width: "100%", backgroundColor: "#f8fafc" }}
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Tab 2: Delivery & Payments */}
                <div
                  style={{
                    display: activeTab === 2 ? "grid" : "none",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    rowGap: "10px",
                    columnGap: "20px",
                  }}
                >
                  <div style={{ gridColumn: "1 / -1", width: "350px" }}>
                    <label className="filter-label">Ngày giao hàng dự kiến <span style={{ color: "red" }}>(*)</span></label>
                    <input
                      type="text"
                      name="deliveryDate"
                      className="input"
                      disabled={isViewMode}
                      defaultValue={editingContract?.deliveryDate ?? ""}
                      placeholder="VD: Trong vòng 30 ngày kể từ ngày ký"
                      required
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                    <div style={{ width: "230px" }}>
                      <label className="filter-label">Cảng đi <span style={{ color: "red" }}>(*)</span></label>
                      <input
                        type="text"
                        name="portOfLoading"
                        className="input"
                        disabled={isViewMode}
                        defaultValue={editingContract?.portOfLoading ?? "Hochiminh Port, Vietnam"}
                        placeholder="Mặc định: Hochiminh Port, Vietnam"
                        required
                      />
                    </div>
                    <div style={{ width: "230px" }}>
                      <label className="filter-label">Cảng đến <span style={{ color: "red" }}>(*)</span></label>
                      <input
                        type="text"
                        name="portOfDischarge"
                        className="input"
                        disabled={isViewMode}
                        defaultValue={editingContract?.portOfDischarge ?? ""}
                        placeholder="Tự điền cảng đến..."
                        required
                      />
                    </div>
                    <div style={{ width: "130px" }}>
                      <label className="filter-label" style={{ whiteSpace: "nowrap" }}>ĐK Giao hàng <span style={{ color: "red" }}>(*)</span></label>
                      {isViewMode ? (
                        <input type="text" className="input" defaultValue={editingContract?.deliveryTerms ?? "FOB"} disabled style={{ width: "100%" }} />
                      ) : (
                        <select
                          name="deliveryTerms"
                          className="input"
                          disabled={isViewMode}
                          defaultValue={editingContract?.deliveryTerms ?? "FOB"}
                          required
                          style={{ width: "100%" }}
                        >
                          <option value="EXW">EXW</option>
                          <option value="FCA">FCA</option>
                          <option value="FOB">FOB</option>
                          <option value="CFR">CFR</option>
                          <option value="CIF">CIF</option>
                          <option value="DAP">DAP</option>
                          <option value="DDP">DDP</option>
                          <option value="DDU">DDU</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Checkboxes for Transshipment, Partial Shipment, Thermometer, and Pallet */}
                  <div style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          name="transshipment"
                          disabled={isViewMode}
                          defaultChecked={editingContract ? editingContract.transshipment === "Allowed" : false}
                          style={{ width: "18px", height: "18px" }}
                        />
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#000000" }}>Cho phép chuyển tải</span>
                      </label>
                    </div>

                    <div style={{ display: "flex", alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          name="partialShipment"
                          disabled={isViewMode}
                          defaultChecked={editingContract ? editingContract.partialShipment === "Allowed" : false}
                          style={{ width: "18px", height: "18px" }}
                        />
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#000000" }}>Giao hàng từng phần</span>
                      </label>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          name="thermometer"
                          disabled={isViewMode}
                          checked={thermometerChecked}
                          onChange={(e) => {
                            setThermometerChecked(e.target.checked);
                            if (!e.target.checked) {
                              setThermometerQty(0);
                            } else if (thermometerQty === 0) {
                              setThermometerQty(1);
                            }
                          }}
                          style={{ width: "18px", height: "18px" }}
                        />
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#000000" }}>Nhiệt kế</span>
                      </label>
                      {thermometerChecked && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "6px", overflow: "hidden" }}>
                            <button
                              type="button"
                              onClick={() => setThermometerQty(Math.max(0, thermometerQty - 1))}
                              disabled={isViewMode || thermometerQty <= 0}
                              style={{
                                padding: "4px 10px",
                                backgroundColor: "#f8fafc",
                                border: "none",
                                borderRight: "1px solid #cbd5e1",
                                cursor: thermometerQty <= 0 ? "not-allowed" : "pointer",
                                userSelect: "none",
                                fontWeight: "bold",
                                fontSize: "0.9rem",
                                color: "#000000",
                              }}
                            >
                              -
                            </button>
                            <span style={{ padding: "4px 12px", minWidth: "30px", textAlign: "center", fontSize: "0.85rem", fontWeight: "600", backgroundColor: "#fff", color: "#000000" }}>
                              {thermometerQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setThermometerQty(thermometerQty + 1)}
                              disabled={isViewMode}
                              style={{
                                padding: "4px 10px",
                                backgroundColor: "#f8fafc",
                                border: "none",
                                borderLeft: "1px solid #cbd5e1",
                                cursor: "pointer",
                                userSelect: "none",
                                fontWeight: "bold",
                                fontSize: "0.9rem",
                                color: "#000000",
                              }}
                            >
                              +
                            </button>
                          </div>
                          <input type="hidden" name="thermometerQty" value={thermometerQty} />
                          <span style={{ fontSize: "0.85rem", color: "#000000", fontWeight: 600 }}>Cái</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          name="pallet"
                          disabled={isViewMode}
                          defaultChecked={editingContract ? !!editingContract.pallet : false}
                          style={{ width: "18px", height: "18px" }}
                        />
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#000000" }}>Pallet</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
                    <div style={{ width: "130px" }}>
                      <label className="filter-label" style={{ whiteSpace: "nowrap" }}>PT thanh toán <span style={{ color: "red" }}>(*)</span></label>
                      {isViewMode ? (
                        <input type="text" className="input" value={paymentMethod} disabled style={{ width: "100%" }} />
                      ) : (
                        <select
                          name="paymentMethod"
                          className="input"
                          disabled={isViewMode}
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          required
                          style={{ width: "100%" }}
                        >
                          <option value="CAD">CAD</option>
                          <option value="D/P at sight">D/P at sight</option>
                          <option value="L/C at sight">L/C at sight</option>
                          <option value="T/T">T/T</option>
                          <option value="Other">Other</option>
                        </select>
                      )}
                    </div>
                    <div style={{ flex: 1, maxWidth: "500px" }}>
                      <label className="filter-label">Điều kiện thanh toán <span style={{ color: "red" }}>(*)</span></label>
                      <input
                        type="text"
                        name="paymentTerms"
                        className="input"
                        disabled={isViewMode}
                        defaultValue={editingContract?.paymentTerms ?? ""}
                        placeholder={
                          paymentMethod.includes("L/C") || paymentMethod.includes("D/P")
                            ? "At sight"
                            : "VD: 30 days after BL date"
                        }
                        required
                      />
                      <span style={{ fontSize: "11px", color: "#000000", fontWeight: 600, display: "block", marginTop: "4px" }}>
                        * Hướng dẫn: Nếu phương thức là L/C hoặc D/P thì ghi "At sight". Phương thức khác thì ghi cụ thể điều kiện thanh toán.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tab 3: List of Goods */}
                <div style={{ display: activeTab === 3 ? "block" : "none" }}>
                  <div style={{ overflow: "visible", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                    <table className="table tab3-goods-table" style={{ fontSize: "13px", width: "100%", minWidth: "1280px", tableLayout: "fixed" }}>
                      <thead style={{ background: "#f8fafc" }}>
                        <tr>
                          <th style={{ width: "350px", padding: "5px 6px", textAlign: "center" }}>Mã / Tên sản phẩm <span style={{ color: "red" }}>(*)</span></th>
                          <th style={{ width: "80px", padding: "5px 6px", textAlign: "center" }}>Brix <span style={{ color: "red" }}>(*)</span></th>
                          <th style={{ width: "80px", padding: "5px 6px", textAlign: "center" }}>ĐVT <span style={{ color: "red" }}>(*)</span></th>
                          <th style={{ width: "100px", padding: "5px 6px", textAlign: "center" }}>Số lượng <span style={{ color: "red" }}>(*)</span></th>
                          <th style={{ width: "90px", padding: "5px 6px", textAlign: "center" }}>Đơn giá <span style={{ color: "red" }}>(*)</span></th>
                          <th style={{ width: "115px", padding: "5px 6px", textAlign: "center" }}>Thành tiền</th>
                          <th style={{ width: "400px", padding: "5px 6px", textAlign: "center" }}>Ghi chú sản phẩm</th>
                          {!isViewMode && <th style={{ width: "50px", padding: "5px 6px", textAlign: "center" }}>#</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => {
                          return (
                            <tr key={idx}>
                              <td style={{ padding: "5px 6px", position: "relative" }}>
                                {isViewMode ? (
                                  <input
                                    type="text"
                                    className="input-sm"
                                    value={item.productCode ? `${item.productCode} - ${item.productName}` : ""}
                                    disabled={true}
                                    style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                                  />
                                ) : (
                                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                    <input
                                      type="text"
                                      className="input-sm"
                                      value={item.productSearch ?? (item.productCode ? `${item.productCode} - ${item.productName}` : "")}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const newItems = [...items];
                                        newItems[idx].productSearch = val;
                                        newItems[idx].productCode = "";
                                        setItems(newItems);
                                        setActiveProductSearchIdx(idx);
                                      }}
                                      onFocus={() => {
                                        setActiveProductSearchIdx(idx);
                                      }}
                                      onBlur={() => {
                                        setTimeout(() => {
                                          const newItems = [...items];
                                          const query = (newItems[idx].productSearch || "").trim().toLowerCase();
                                          const match = products.find(p => 
                                            p.code.toLowerCase() === query ||
                                            p.name.toLowerCase() === query ||
                                            (p.englishName || "").toLowerCase() === query ||
                                            (p.code + " - " + p.name).toLowerCase() === query ||
                                            (p.code + " - " + (p.englishName || p.name)).toLowerCase() === query
                                          );
                                          if (match) {
                                            newItems[idx].productCode = match.code;
                                            newItems[idx].productName = match.englishName || match.name;
                                            newItems[idx].unit = match.unit?.[0]?.name || "";
                                            newItems[idx].productSearch = `${match.code} - ${match.englishName || match.name}`;
                                            newItems[idx].packaging = match.packaging || "";
                                          } else {
                                            if (newItems[idx].productCode) {
                                              const originalProd = products.find(p => p.code === newItems[idx].productCode);
                                              if (originalProd) {
                                                newItems[idx].productSearch = `${originalProd.code} - ${originalProd.englishName || originalProd.name}`;
                                              }
                                            } else {
                                              newItems[idx].productSearch = "";
                                              newItems[idx].productCode = "";
                                              newItems[idx].productName = "";
                                              newItems[idx].unit = "";
                                              newItems[idx].packaging = "";
                                            }
                                          }
                                          newItems[idx].amount = (newItems[idx].quantity || 0) * (newItems[idx].price || 0);
                                          setItems(newItems);
                                          setActiveProductSearchIdx((prev) => prev === idx ? null : prev);
                                        }, 200);
                                      }}
                                      required
                                      placeholder="Chọn hoặc nhập tìm kiếm..."
                                      style={{ paddingRight: "24px" }}
                                    />
                                    <span 
                                      onClick={() => setActiveProductSearchIdx(activeProductSearchIdx === idx ? null : idx)}
                                      style={{
                                        position: "absolute",
                                        right: "8px",
                                        cursor: "pointer",
                                        color: "#64748b",
                                        fontSize: "0.65rem",
                                        userSelect: "none"
                                      }}
                                    >
                                      ▼
                                    </span>
                                    {activeProductSearchIdx === idx && (
                                      <div style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        width: "430px",
                                        zIndex: 1000,
                                        maxHeight: "180px",
                                        overflowY: "auto",
                                        backgroundColor: "#ffffff",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "6px",
                                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                                        marginTop: "4px"
                                      }}>
                                        {(() => {
                                          const searchVal = item.productSearch ?? "";
                                          const currentProdText = item.productCode ? `${item.productCode} - ${item.productName}` : "";
                                          const filteredProds = !searchVal || searchVal === currentProdText
                                            ? products
                                            : products.filter(p =>
                                                p.code.toLowerCase().includes(searchVal.toLowerCase()) ||
                                                p.name.toLowerCase().includes(searchVal.toLowerCase()) ||
                                                (p.englishName || "").toLowerCase().includes(searchVal.toLowerCase())
                                              );
                                          
                                          if (filteredProds.length === 0) {
                                            return (
                                              <div style={{ padding: "6px 10px", color: "#64748b", fontSize: "0.8rem" }}>
                                                Không tìm thấy sản phẩm
                                              </div>
                                            );
                                          }
                                          return filteredProds.map((prod) => (
                                            <div
                                              key={prod.code}
                                              onMouseDown={() => {
                                                const newItems = [...items];
                                                newItems[idx].productCode = prod.code;
                                                newItems[idx].productName = prod.englishName || prod.name;
                                                newItems[idx].unit = prod.unit?.[0]?.name || "";
                                                newItems[idx].productSearch = `${prod.code} - ${prod.englishName || prod.name}`;
                                                newItems[idx].packaging = prod.packaging || "";
                                                newItems[idx].amount = (newItems[idx].quantity || 0) * (newItems[idx].price || 0);
                                                setItems(newItems);
                                                setActiveProductSearchIdx(null);
                                              }}
                                              style={{
                                                padding: "6px 10px",
                                                cursor: "pointer",
                                                fontSize: "0.8rem",
                                                color: "#000000",
                                                fontWeight: 600,
                                                borderBottom: "1px solid #f1f5f9",
                                                textAlign: "left"
                                              }}
                                              className="search-item-hover"
                                            >
                                              <div style={{ fontWeight: 600 }}>{prod.code}</div>
                                              <div style={{ fontSize: "0.75rem", color: "#000000", fontWeight: 600 }}>
                                                {prod.name}
                                              </div>
                                              {prod.englishName && (
                                                <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600, fontStyle: "italic", marginTop: "2px" }}>
                                                  {prod.englishName}
                                                </div>
                                              )}
                                            </div>
                                          ));
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {(() => {
                                  const pkg = item.packaging || products.find(p => p.code === item.productCode)?.packaging;
                                  return pkg ? (
                                    <div style={{ 
                                      fontSize: "11px", 
                                      color: "#64748b", 
                                      marginTop: "2px",
                                      paddingLeft: "4px",
                                      fontStyle: "italic"
                                    }}>
                                      Quy cách: {pkg}
                                    </div>
                                  ) : null;
                                })()}
                              </td>
                              <td style={{ padding: "5px 6px" }}>
                                <input
                                  type="number"
                                  step="any"
                                  className="input-sm"
                                  value={item.brix ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newItems = [...items];
                                    newItems[idx].brix = val;
                                    setItems(newItems);
                                  }}
                                  disabled={isViewMode}
                                  required
                                  placeholder="Brix"
                                  style={{ textAlign: "right" }}
                                />
                              </td>
                              <td style={{ padding: "5px 6px" }}>
                                <input
                                  type="text"
                                  className="input-sm"
                                  value={item.unit || ""}
                                  disabled={true}
                                  style={{ background: "#f1f5f9", cursor: "not-allowed" }}
                                  placeholder="ĐVT"
                                />
                              </td>
                              <td style={{ padding: "5px 6px" }}>
                                <input
                                  type="text"
                                  className="input-sm"
                                  style={{ textAlign: "right" }}
                                  value={item.quantityInput ?? ""}
                                  onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                  onBlur={() => handleQuantityBlur(idx)}
                                  disabled={isViewMode}
                                  required
                                  placeholder="0"
                                />
                              </td>
                              <td style={{ padding: "5px 6px" }}>
                                <input
                                  type="text"
                                  className="input-sm"
                                  style={{ textAlign: "right" }}
                                  value={item.priceInput ?? ""}
                                  onChange={(e) => handlePriceChange(idx, e.target.value)}
                                  onBlur={() => handlePriceBlur(idx)}
                                  disabled={isViewMode}
                                  required
                                  placeholder="$ 0"
                                />
                              </td>
                              <td style={{ padding: "5px 6px" }}>
                                <input
                                  type="text"
                                  className="input-sm"
                                  style={{ textAlign: "right", background: "#f1f5f9", cursor: "not-allowed", fontWeight: 600, color: "#2563eb" }}
                                  value={`$ ${formatLocaleNumber2Dec(item.amount || 0)}`}
                                  disabled={true}
                                />
                              </td>
                               <td style={{ padding: "5px 6px" }}>
                                <textarea
                                  className="input-sm auto-resize-textarea"
                                  value={item.note || ""}
                                  onChange={(e) => updateItem(idx, "note", e.target.value)}
                                  ref={(el) => {
                                    if (el) {
                                      el.style.height = "auto";
                                      el.style.height = `${el.scrollHeight}px`;
                                    }
                                  }}
                                  disabled={isViewMode}
                                  placeholder={isViewMode ? "" : "Ghi chú sản phẩm..."}
                                  rows={1}
                                  style={{
                                    width: "100%",
                                    minHeight: "26px",
                                    resize: "vertical",
                                    padding: "5px 10px",
                                    lineHeight: "1.4",
                                    fontFamily: "inherit",
                                    overflow: "auto"
                                  }}
                                />
                              </td>
                              {!isViewMode && (
                                <td style={{ textAlign: "center", padding: "5px 6px" }}>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(idx)}
                                    style={{
                                      color: "#ef4444",
                                      border: "none",
                                      background: "none",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                    {!isViewMode ? (
                      <button
                        type="button"
                        onClick={addItem}
                        className="sapo-btn"
                        style={{ fontSize: "12px" }}
                      >
                        Thêm dòng hàng
                      </button>
                    ) : (
                      <div />
                    )}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#003466" }}>
                        Tổng giá trị hợp đồng: <span style={{ color: "#2563eb", marginLeft: "5px" }}>$ {formatLocaleNumber2Dec(items.reduce((sum, item) => sum + (item.amount || 0), 0))}</span>
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#003466" }}>
                        Tổng số sản phẩm: <span style={{ color: "#2563eb", marginLeft: "5px" }}>{items.length}</span>
                      </div>
                    </div>
                  </div>
                </div>



                {/* Tab 4: Accompanying Documents Checklist */}
                <div style={{ display: activeTab === 4 ? "block" : "none", fontSize: "12px" }} className="tab5-container">
                  <input type="hidden" name="accompanyingDocuments" value={JSON.stringify(docList)} />
                  
                  {!isViewMode && (
                    <div style={{ display: "flex", gap: "10px", marginBottom: "12px", alignItems: "center" }}>
                      <input
                        type="text"
                        placeholder="Nhập tên chứng từ thêm tạm thời..."
                        className="input"
                        id="tempDocInput"
                        style={{ flex: 1, maxWidth: "400px" }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const btn = document.getElementById("addTempDocBtn");
                            if (btn) btn.click();
                          }
                        }}
                      />
                      <button
                        type="button"
                        id="addTempDocBtn"
                        className="btn"
                        style={{ background: "#f1f5f9", fontWeight: 600, color: "#000000", padding: "8px 16px" }}
                        onClick={() => {
                          const input = document.getElementById("tempDocInput") as HTMLInputElement;
                          if (input && input.value.trim()) {
                            const name = input.value.trim();
                            const key = `custom_${Date.now()}`;
                            setDocList([...docList, { key, label: name, original: 0, copy: 0 }]);
                            input.value = "";
                          }
                        }}
                      >
                        + Thêm chứng từ
                      </button>
                    </div>
                  )}
                  
                  <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                    <table className="table tab5-docs-table" style={{ fontSize: "12px", width: "100%", borderCollapse: "collapse" }}>
                      <thead style={{ background: "#f8fafc" }}>
                        <tr>
                          <th style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Tên chứng từ</th>
                          <th style={{ width: "180px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Bản gốc (Original)</th>
                          <th style={{ width: "180px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Bản sao (Copy)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docList.map((doc, idx) => (
                          <tr key={doc.key} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ fontWeight: 600, padding: "12px 14px", color: "#334155" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                <span>{doc.label}</span>
                                {doc.key.startsWith("custom_") && !isViewMode && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDocList(docList.filter(d => d.key !== doc.key));
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#ef4444",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                      fontSize: "13px",
                                      padding: "2px 6px",
                                      borderRadius: "4px"
                                    }}
                                    className="action-btn"
                                  >
                                    Xóa
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: "center", padding: "8px 14px" }}>
                              <div className={`doc-counter-wrapper ${isViewMode ? "view-mode" : ""}`}>
                                {!isViewMode && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = [...docList];
                                      const val = Math.max(0, (newList[idx].original || 0) - 1);
                                      newList[idx] = { ...newList[idx], original: val };
                                      setDocList(newList);
                                    }}
                                    className="doc-counter-btn"
                                  >
                                    -
                                  </button>
                                )}
                                <input
                                  type="number"
                                  min="0"
                                  value={doc.original ?? 0}
                                  disabled={isViewMode}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    const newList = [...docList];
                                    newList[idx] = { ...newList[idx], original: isNaN(val) ? 0 : Math.max(0, val) };
                                    setDocList(newList);
                                  }}
                                  className={`doc-counter-input ${!isViewMode ? "edit-mode" : ""}`}
                                />
                                {!isViewMode && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = [...docList];
                                      const val = (newList[idx].original || 0) + 1;
                                      newList[idx] = { ...newList[idx], original: val };
                                      setDocList(newList);
                                    }}
                                    className="doc-counter-btn"
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: "center", padding: "8px 14px" }}>
                              <div className={`doc-counter-wrapper ${isViewMode ? "view-mode" : ""}`}>
                                {!isViewMode && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = [...docList];
                                      const val = Math.max(0, (newList[idx].copy || 0) - 1);
                                      newList[idx] = { ...newList[idx], copy: val };
                                      setDocList(newList);
                                    }}
                                    className="doc-counter-btn"
                                  >
                                    -
                                  </button>
                                )}
                                <input
                                  type="number"
                                  min="0"
                                  value={doc.copy ?? 0}
                                  disabled={isViewMode}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    const newList = [...docList];
                                    newList[idx] = { ...newList[idx], copy: isNaN(val) ? 0 : Math.max(0, val) };
                                    setDocList(newList);
                                  }}
                                  className={`doc-counter-input ${!isViewMode ? "edit-mode" : ""}`}
                                />
                                {!isViewMode && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newList = [...docList];
                                      const val = (newList[idx].copy || 0) + 1;
                                      newList[idx] = { ...newList[idx], copy: val };
                                      setDocList(newList);
                                    }}
                                    className="doc-counter-btn"
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tab 5: Tệp đính kèm */}
                <div style={{ display: activeTab === 5 ? "block" : "none", fontSize: "12px" }} className="tab6-container">
                  <input type="hidden" name="attachments" value={JSON.stringify(attachmentList)} />
                  
                  {!isViewMode && (
                    <button
                      type="button"
                      className="sapo-btn"
                      style={{ fontSize: "12px", marginBottom: "12px" }}
                      onClick={() => {
                        setAttachmentList([...attachmentList, { name: "", fileName: "", fileContent: "" }]);
                      }}
                    >
                      Thêm tệp đính kèm
                    </button>
                  )}
                  
                  <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                    <table className="table" style={{ fontSize: "12px", width: "100%", borderCollapse: "collapse" }}>
                      <thead style={{ background: "#f8fafc" }}>
                        <tr>
                          <th style={{ width: "40px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>STT</th>
                          <th style={{ textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Tên tài liệu / mô tả <span style={{ color: "red" }}>(*)</span></th>
                          <th style={{ width: "300px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Tệp PDF đính kèm</th>
                          {!isViewMode && <th style={{ width: "80px", textAlign: "center", color: "#003466", textTransform: "uppercase", fontWeight: 700 }}>Thao tác</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {attachmentList.length === 0 ? (
                          <tr>
                            <td colSpan={isViewMode ? 3 : 4} style={{ textAlign: "center", color: "#334155", padding: "12px" }}>
                              Không có tệp đính kèm nào.
                            </td>
                          </tr>
                        ) : (
                          attachmentList.map((att, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ textAlign: "center", fontWeight: 500 }}>{idx + 1}</td>
                              <td style={{ padding: "8px" }}>
                                <input
                                  type="text"
                                  className="input"
                                  placeholder="Nhập tên/mô tả tài liệu..."
                                  value={att.name}
                                  disabled={isViewMode}
                                  onChange={(e) => {
                                    const newList = [...attachmentList];
                                    newList[idx].name = e.target.value;
                                    setAttachmentList(newList);
                                  }}
                                  required
                                  style={{ width: "100%" }}
                                />
                              </td>
                              <td style={{ padding: "8px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  {!isViewMode && (
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          if (file.type !== "application/pdf") {
                                            alert("Vui lòng chỉ chọn tệp tin định dạng PDF.");
                                            e.target.value = "";
                                            return;
                                          }
                                          

                                          const reader = new FileReader();
                                          reader.onload = (evt) => {
                                             const content = evt.target?.result as string;
                                             const newList = [...attachmentList];
                                             newList[idx].fileName = file.name;
                                             newList[idx].fileContent = content;
                                             setAttachmentList(newList);
                                           };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                      style={{ fontSize: "12px", width: "100%" }}
                                    />
                                  )}
                                  {att.fileName ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                                      <span style={{ fontSize: "12px", color: "#1e293b", fontWeight: 500 }}>📄 {att.fileName}</span>
                                      <a
                                        href={att.fileContent}
                                        download={att.fileName}
                                        style={{ fontSize: "11px", color: "#2563eb", textDecoration: "underline" }}
                                      >
                                        Tải xuống
                                      </a>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>Chưa đính kèm tệp PDF</span>
                                  )}
                                </div>
                              </td>
                              {!isViewMode && (
                                <td style={{ textAlign: "center", padding: "8px" }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAttachmentList(attachmentList.filter((_, i) => i !== idx));
                                    }}
                                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 600 }}
                                  >
                                    Xóa
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                  borderTop: "1px solid #eee",
                  padding: "12px 24px",
                  background: "#fff",
                  borderBottomLeftRadius: "16px",
                  borderBottomRightRadius: "16px",
                }}
              >
                <button type="button" className="modal-footer-btn-secondary" onClick={handleClose}>
                  {isViewMode ? "Đóng" : "Thoát"}
                </button>
                {!isViewMode && (
                  <button type="submit" className="modal-footer-btn-success" disabled={isPending}>
                    {isPending ? "Đang lưu..." : "Lưu hợp đồng"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .column-resize-handle {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 8px;
          cursor: col-resize;
          z-index: 10;
          background: transparent;
          transition: background-color 0.2s;
        }
        .column-resize-handle:hover,
        .column-resize-handle:active {
          background-color: #ff5c00;
          width: 8px;
        }
        .custom-modal-overlay {
          position: fixed;
          background: rgba(15, 23, 42, 0.6) !important;
          backdrop-filter: blur(4px) !important;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999 !important;
          left: 0 !important;
          top: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
        }
        .filter-label { display: block; margin-bottom: 0.4rem; font-size: 0.85rem; font-weight: 700; color: #003466; text-transform: uppercase; }
        .custom-modal-overlay .filter-label {
          text-transform: uppercase !important;
          color: #003466 !important;
          font-weight: 700 !important;
          margin-bottom: 5px !important;
          font-size: 12px !important;
        }
        .custom-modal-overlay .scrollable-body::-webkit-scrollbar {
          display: none !important;
        }
        .custom-modal-overlay .scrollable-body {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .custom-modal-overlay .modal-footer-btn-secondary {
          background-color: #334155 !important;
          color: white !important;
          font-weight: 500 !important;
          border-radius: 6px !important;
          padding: 6px 15px !important;
          font-size: 12px !important;
          border: none !important;
          cursor: pointer !important;
          transition: background-color 0.2s, transform 0.1s !important;
        }
        .custom-modal-overlay .modal-footer-btn-secondary:hover {
          background-color: #1e293b !important;
        }
        .custom-modal-overlay .modal-footer-btn-success {
          background-color: #003466 !important;
          color: white !important;
          font-weight: 500 !important;
          border-radius: 6px !important;
          padding: 6px 15px !important;
          font-size: 12px !important;
          border: none !important;
          cursor: pointer !important;
          transition: background-color 0.2s, transform 0.1s !important;
        }
        .custom-modal-overlay .modal-footer-btn-success:hover {
          background-color: #002244 !important;
        }
        
        /* Modal elements rounded corners styling */
        .custom-modal-overlay .input {
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 2px 10px !important;
          font-size: 12px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        .custom-modal-overlay input.input {
          height: 26px !important;
        }
        .custom-modal-overlay textarea.input {
          padding: 8px 12px !important;
        }
        .custom-modal-overlay .input:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }
        .custom-modal-overlay select.input {
          border-radius: 8px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 2px 10px !important;
          height: 26px !important;
          font-size: 12px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        .custom-modal-overlay select.input:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }
        .custom-modal-overlay .input-sm {
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 5px 10px !important;
          font-size: 12px !important;
          transition: border-color 0.2s, box-shadow 0.2s !important;
        }
        .custom-modal-overlay .input-sm:focus {
          border-color: #ff5c00 !important;
          box-shadow: 0 0 0 2px rgba(255, 92, 0, 0.1) !important;
        }
        .custom-modal-overlay textarea.input-sm {
          border-radius: 6px !important;
          border: 1px solid #cbd5e1 !important;
        }
        .input-sm { width: 100%; padding: 5px 10px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 13px; outline: none; }
        .input-sm:focus { border-color: #3498db; }
        .input-sm:disabled { background: #f8fafc; cursor: not-allowed; border: none; }
        .action-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
        .action-btn:hover { background: #f1f5f9; }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
        .search-item-hover:hover {
          background-color: #f1f5f9 !important;
        }
        .search-item-hover {
          font-size: 12px !important;
        }
        .search-item-hover div {
          font-size: 12px !important;
        }
        .custom-modal-overlay select.input option,
        .custom-modal-overlay select option {
          font-size: 12px !important;
        }

        /* Overrides to remove status backgrounds as requested (bỏ nền trạng thái) */
        .base-table .status-pill {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          border-radius: 0 !important;
        }
        .base-table .status-pill.status-active {
          color: #166534 !important;
        }
        .base-table .status-pill.status-new {
          color: #4f46e5 !important;
        }
        .base-table .status-pill.status-pending {
          color: #d97706 !important;
        }
        .base-table .status-pill.status-inactive {
          color: #dc2626 !important;
        }

        /* Tab 3 table header styling to match label styling (uppercase, #003466 text color, font-weight 700) */
        .tab3-goods-table th {
          text-transform: uppercase !important;
          color: #003466 !important;
          font-weight: 700 !important;
          text-align: center !important;
        }

        /* Tab 5 table headers and row cell padding (6px spacing between rows content = 3px top/bottom padding) */
        .tab5-docs-table th {
          text-transform: uppercase !important;
          color: #003466 !important;
          font-weight: 700 !important;
          text-align: center !important;
          font-size: 13px !important;
          padding: 6px 12px !important;
        }
        .tab5-docs-table td {
          padding: 3px 14px !important;
          font-size: 13px !important;
        }
        .tab5-container input,
        .tab5-container button {
          font-size: 12px !important;
        }
        .doc-counter-btn,
        .doc-counter-input {
          font-size: 12px !important;
        }

        /* Optimized Counter styles for Tab 5 */
        .doc-counter-wrapper {
          display: inline-flex;
          align-items: center;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          overflow: hidden;
          background: #fff;
          height: 26px;
        }
        .doc-counter-wrapper.view-mode {
          background: #f1f5f9;
        }
        .doc-counter-btn {
          border: none;
          background: none;
          width: 26px;
          height: 100%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #64748b;
          user-select: none;
        }
        .doc-counter-btn:hover {
          background: #f1f5f9;
        }
        .doc-counter-input {
          width: 36px;
          height: 100%;
          border: none;
          text-align: center;
          font-weight: bold;
          color: #334155;
          background: none;
          outline: none;
          /* Hide number spinners */
          -moz-appearance: textfield;
        }
        .doc-counter-input::-webkit-outer-spin-button,
        .doc-counter-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .doc-counter-input.edit-mode {
          border-left: 1px solid #cbd5e1;
          border-right: 1px solid #cbd5e1;
        }
      `}</style>

      {/* Confirmation Dialog */}
      {confirmUpdate && (
        <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
          <div className="modal-content-base" style={{ maxWidth: "450px", textAlign: "center", padding: "2rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "#fff7ed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
                color: "#f97316",
              }}
            >
              <Clock size={32} />
            </div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "700",
                margin: "0 auto 0.75rem",
                color: "#1e293b",
                textAlign: "center",
                fontFamily: "'Segoe UI', sans-serif",
              }}
            >
              {confirmUpdate.status === "Đã phê duyệt"
                ? "Phê duyệt hợp đồng"
                : confirmUpdate.status === "Tạo mới"
                ? "Thu hồi hợp đồng"
                : confirmUpdate.status === "Chờ phê duyệt"
                ? "Gửi phê duyệt"
                : confirmUpdate.status === "Từ chối"
                ? "Từ chối hợp đồng"
                : confirmUpdate.status === "Đã hủy"
                ? "Hủy hợp đồng"
                : "Xác nhận chuyển đổi"}
            </h3>
            <div
              style={{
                color: "#475569",
                margin: "0 auto 1.75rem",
                lineHeight: "1.6",
                textAlign: "center",
                padding: "0 0.5rem",
                fontFamily: "'Segoe UI', sans-serif",
              }}
            >
              {confirmUpdate.status === "Đã phê duyệt" ? (
                <>
                  <p style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
                    Bạn có chắc chắn đồng ý phê duyệt {confirmUpdate.info} không?
                  </p>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#10b981",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "#f0fdf4",
                      padding: "8px",
                      borderRadius: "6px",
                    }}
                  >
                    <Check size={16} /> Hợp đồng sẽ chính thức có giá trị pháp lý.
                  </p>
                </>
              ) : confirmUpdate.status === "Tạo mới" ? (
                <>
                  <p style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
                    Bạn có chắc chắn muốn thu hồi hợp đồng này về trạng thái soạn thảo không?
                  </p>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#f59e0b",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "#fffbeb",
                      padding: "8px",
                      borderRadius: "6px",
                    }}
                  >
                    <RotateCcw size={16} /> Hợp đồng sẽ chuyển về trạng thái Tạo mới.
                  </p>
                </>
              ) : confirmUpdate.status === "Chờ phê duyệt" ? (
                <>
                  <p style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
                    Bạn có chắc muốn gửi phê duyệt {confirmUpdate.info} không?
                  </p>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#ef4444",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "#fef2f2",
                      padding: "8px",
                      borderRadius: "6px",
                    }}
                  >
                    <Clock size={16} /> Hợp đồng sẽ không được chỉnh sửa trong thời gian chờ phê duyệt.
                  </p>
                </>
              ) : confirmUpdate.status === "Từ chối" ? (
                <>
                  <p style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
                    Bạn có chắc chắn muốn từ chối {confirmUpdate.info} không?
                  </p>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#ef4444",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "#fef2f2",
                      padding: "8px",
                      borderRadius: "6px",
                    }}
                  >
                    <Check size={16} /> Trạng thái hợp đồng sẽ chuyển thành Từ chối.
                  </p>
                </>
              ) : confirmUpdate.status === "Đã hủy" ? (
                <>
                  <p style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
                    Bạn có chắc chắn muốn hủy {confirmUpdate.info} không?
                  </p>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#ef4444",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "#fef2f2",
                      padding: "8px",
                      borderRadius: "6px",
                    }}
                  >
                    <Check size={16} /> Trạng thái hợp đồng sẽ chuyển thành Đã hủy.
                  </p>
                </>
              ) : (
                <p style={{ fontWeight: 600 }}>
                  Bạn có chắc chắn muốn chuyển trạng thái hợp đồng sang <strong>"{confirmUpdate.status}"</strong>?
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button 
                type="button"
                className="sapo-btn sapo-btn-secondary" 
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  justifyContent: "center",
                  height: "40px"
                }} 
                onClick={() => setConfirmUpdate(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="sapo-btn"
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  backgroundColor: (confirmUpdate.status === "Từ chối" || confirmUpdate.status === "Đã hủy") ? "#ef4444" : "#003466",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  justifyContent: "center",
                  height: "40px"
                }}
                onClick={executeStatusChange}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Warning Dialog */}
      {printWarningContract && (
        <div className="modal-overlay-base" style={{ zIndex: 9999 }}>
          <div className="modal-content-base" style={{ maxWidth: "450px", textAlign: "center", padding: "2rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "#fffbeb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
                color: "#ea580c",
              }}
            >
              <Printer size={32} />
            </div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: "700",
                margin: "0 auto 0.75rem",
                color: "#1e293b",
                textAlign: "center",
                fontFamily: "'Segoe UI', sans-serif",
              }}
            >
              In bản nháp hợp đồng
            </h3>
            <div
              style={{
                color: "#475569",
                margin: "0 auto 1.75rem",
                lineHeight: "1.6",
                textAlign: "center",
                padding: "0 0.5rem",
                fontFamily: "'Segoe UI', sans-serif",
              }}
            >
              <p style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
                Bạn có chắc chắn muốn in hợp đồng {printWarningContract.number} không?
              </p>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#ea580c",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "#fffbeb",
                  padding: "8px",
                  borderRadius: "6px",
                }}
              >
                <Printer size={16} /> Hồ sơ chưa được phê duyệt, chỉ có thể in bản nháp.
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button 
                type="button"
                className="sapo-btn sapo-btn-secondary" 
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  justifyContent: "center",
                  height: "40px"
                }} 
                onClick={() => setPrintWarningContract(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="sapo-btn"
                style={{
                  flex: 1,
                  padding: "10px 20px",
                  backgroundColor: "#003466",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                  justifyContent: "center",
                  height: "40px"
                }}
                onClick={() => {
                  window.open(`/sales/hop-dong/in/${printWarningContract.id}`, "_blank");
                  setPrintWarningContract(null);
                }}
              >
                In bản nháp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
