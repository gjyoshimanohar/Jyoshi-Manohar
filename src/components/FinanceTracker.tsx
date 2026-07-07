import React, { useState, useEffect, useMemo } from "react";
import { db, auth } from "../lib/firebase";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { FinanceRecord, PaymentAccount } from "../types";
import { financeService } from "../services/financeService";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
  Trash2,
  Edit3,
  Plus,
  Search,
  Filter,
  Sparkles,
  Download,
  RefreshCw,
  PlusCircle,
  User,
  X,
  PieChart as PieIcon,
  BarChart3,
  Check,
  Building,
  CreditCard,
  Wallet,
  LayoutDashboard,
  Menu,
  Settings
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

const DEFAULT_CATEGORIES = {
  businessIncome: [
    "Auditing Fees",
    "Tax Consulting",
    "GST Filing",
    "Corporate Advisory",
    "Incorporate Services",
    "Other Services"
  ],
  businessExpense: [
    "Office Rent",
    "Salaries",
    "Software Licensing",
    "Utilities",
    "Marketing & Website",
    "Office Supplies",
    "Travel & Conveyance",
    "Miscellaneous"
  ],
  personalIncome: [
    "Salary / Drawings",
    "Dividends & Investments",
    "Cashback & Rewards",
    "Gifts & Allowances",
    "Other Income"
  ],
  personalExpense: [
    "Groceries & Food",
    "Rent & Housing",
    "Fuel & Transport",
    "Utilities & Bills",
    "Insurance & SIP",
    "Shopping & Leisure",
    "Health & Wellness",
    "Miscellaneous Personal"
  ]
};

const COLORS = [
  "#1a2b58", // Navy
  "#AD8D3E", // Gold
  "#0ea5e9", // Sky Blue
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
];

interface ClientUser {
  uid: string;
  email: string;
  displayName?: string;
}

const getAccountTypeInfo = (type: string) => {
  switch (type) {
    case "bank_account":
      return { label: "Bank Account", icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", isAsset: true };
    case "investment":
      return { label: "Investment", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", isAsset: true };
    case "other_asset":
      return { label: "Other Asset", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100", isAsset: true };
    case "credit_card":
      return { label: "Credit Card", icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", isAsset: false };
    case "loan":
      return { label: "Loan / Debt", icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", border: "border-red-100", isAsset: false };
    case "other_liability":
      return { label: "Other Liability", icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", isAsset: false };
    default:
      return { label: "Unknown Asset", icon: Wallet, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100", isAsset: true };
  }
};

export default function FinanceTracker() {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Swipe to close functionality
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    if (isLeftSwipe) {
      setIsSidebarOpen(false);
    }
  };

  // Filters
  const [activeTab, setActiveTab] = useState<"dashboard" | "incomes" | "expenses" | "account" | "settings">("dashboard");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("All");
  const [selectedScope, setSelectedScope] = useState<"all" | "business" | "personal">("all");
  const [selectedType, setSelectedType] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [customCategories, setCustomCategories] = useState<{ [key: string]: string[] }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("finance_custom_categories");
      if (saved) return JSON.parse(saved);
    }
    return DEFAULT_CATEGORIES;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("finance_custom_categories", JSON.stringify(customCategories));
    }
  }, [customCategories]);

  const [categoryManageType, setCategoryManageType] = useState<"businessIncome" | "businessExpense" | "personalIncome" | "personalExpense">("businessIncome");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  
  // Transaction Form fields
  const [formScope, setFormScope] = useState<"business" | "personal">("business");
  const [formType, setFormType] = useState<"income" | "expense" | "transfer">("income");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [formStatus, setFormStatus] = useState<"paid" | "pending" | "overdue">("paid");
  const [formClientId, setFormClientId] = useState("");
  const [formCustomClientName, setFormCustomClientName] = useState("");

  // Confirmation Dialogue
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Payment Accounts State
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);

  // New Payment Account Form Fields
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<'bank_account' | 'credit_card' | 'investment' | 'loan' | 'other_asset' | 'other_liability'>("bank_account");
  const [accountOpeningBalance, setAccountOpeningBalance] = useState("");

  // Payment fields in the Transaction Form
  const [formPaymentMode, setFormPaymentMode] = useState<string>("Cash");
  const [formPaymentAccountId, setFormPaymentAccountId] = useState<string>("");
  const [formTransferToAccountId, setFormTransferToAccountId] = useState<string>("");

  // Fetch Finance Records, Clients, & Payment Accounts list
  useEffect(() => {
    setLoading(true);
    
    // Subscribe to finance records
    const qFinances = query(collection(db, "finances"), orderBy("date", "desc"));
    const unsubscribeFinances = onSnapshot(qFinances, (snapshot) => {
      const recordsList: FinanceRecord[] = [];
      snapshot.forEach((docRef) => {
        recordsList.push({ id: docRef.id, ...docRef.data() } as FinanceRecord);
      });
      setRecords(recordsList);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to finances: ", error);
      setLoading(false);
    });

    // Subscribe to client list (users collection)
    const qClients = collection(db, "users");
    const unsubscribeClients = onSnapshot(qClients, (snapshot) => {
      const clientList: ClientUser[] = [];
      snapshot.forEach((docRef) => {
        const data = docRef.data();
        if (data.email !== "gjyoshimanohar@gmail.com") {
          clientList.push({
            uid: docRef.id,
            email: data.email || "",
            displayName: data.displayName || ""
          });
        }
      });
      setClients(clientList);
    }, (error) => {
      console.error("Error listening to clients list: ", error);
    });

    // Subscribe to payment accounts list
    const qAccounts = query(collection(db, "payment_accounts"), orderBy("createdAt", "asc"));
    const unsubscribeAccounts = onSnapshot(qAccounts, (snapshot) => {
      const accountsList: PaymentAccount[] = [];
      snapshot.forEach((docRef) => {
        accountsList.push({ id: docRef.id, ...docRef.data() } as PaymentAccount);
      });
      setPaymentAccounts(accountsList);
    }, (error) => {
      console.error("Error listening to payment accounts: ", error);
    });

    return () => {
      unsubscribeFinances();
      unsubscribeClients();
      unsubscribeAccounts();
    };
  }, []);

  // Autofill Category default when formType or formScope changes
  useEffect(() => {
    if (!editingRecord) {
      if (formType === "transfer") {
        setFormCategory("Internal Transfer");
      } else if (formScope === "business") {
        if (formType === "income") {
          setFormCategory(customCategories.businessIncome[0]);
        } else {
          setFormCategory(customCategories.businessExpense[0]);
        }
      } else {
        if (formType === "income") {
          setFormCategory(customCategories.personalIncome[0]);
        } else {
          setFormCategory(customCategories.personalExpense[0]);
        }
      }
    }
  }, [formType, formScope, editingRecord]);


  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    setCustomCategories(prev => ({
      ...prev,
      [categoryManageType]: [...prev[categoryManageType], newCategoryName.trim()]
    }));
    setNewCategoryName("");
  };

  const handleRemoveCategory = (catName: string) => {
    if (window.confirm(`Are you sure you want to remove "${catName}"?`)) {
      setCustomCategories(prev => ({
        ...prev,
        [categoryManageType]: prev[categoryManageType].filter(c => c !== catName)
      }));
    }
  };

  const handleSaveEditCategory = (index: number) => {
    if (!editingCategoryName.trim()) {
      setEditingCategoryIndex(null);
      return;
    }
    setCustomCategories(prev => {
      const updatedList = [...prev[categoryManageType]];
      updatedList[index] = editingCategoryName.trim();
      return {
        ...prev,
        [categoryManageType]: updatedList
      };
    });
    setEditingCategoryIndex(null);
    setEditingCategoryName("");
  };

  // Handle open modal for new transaction
  const handleOpenAddModal = (defaultType?: "income" | "expense" | "transfer") => {
    setEditingRecord(null);
    const initialScope = selectedScope === "all" ? "business" : selectedScope;
    setFormScope(initialScope);
    
    const initialType = defaultType || (activeTab === "incomes" ? "income" : "expense");
    setFormType(initialType);
    
    if (initialType === "transfer") {
      setFormCategory("Internal Transfer");
    } else if (initialScope === "business") {
      setFormCategory(initialType === "income" ? customCategories.businessIncome[0] : customCategories.businessExpense[0]);
    } else {
      setFormCategory(initialType === "income" ? customCategories.personalIncome[0] : customCategories.personalExpense[0]);
    }
    
    setFormAmount("");
    setFormDescription("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormStatus("paid");
    setFormClientId("");
    setFormCustomClientName("");
    setFormPaymentMode("Cash");
    setFormPaymentAccountId("");
    setFormTransferToAccountId("");
    setIsModalOpen(true);
  };

  // Handle open modal for edit
  const handleOpenEditModal = (rec: FinanceRecord) => {
    setEditingRecord(rec);
    const recScope = rec.scope || "business";
    setFormScope(recScope);
    setFormType(rec.type);
    setFormCategory(rec.category);
    setFormAmount(rec.amount.toString());
    setFormDescription(rec.description || "");
    setFormDate(rec.date);
    setFormStatus(rec.status);
    setFormClientId(rec.clientId || "");
    setFormCustomClientName(rec.clientName || "");
    setFormPaymentMode(rec.paymentMode || "Cash");
    setFormPaymentAccountId(rec.paymentAccountId || "");
    setFormTransferToAccountId(rec.transferToAccountId || "");
    setIsModalOpen(true);
  };

  // Handle Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || isNaN(parseFloat(formAmount))) {
      alert("Please enter a valid amount.");
      return;
    }

    if (formType === "transfer") {
      if (!formPaymentAccountId) {
        alert("Please select the Source Account (From) for the transfer.");
        return;
      }
      if (!formTransferToAccountId) {
        alert("Please select the Destination Account (To) for the transfer.");
        return;
      }
      if (formPaymentAccountId === formTransferToAccountId) {
        alert("Source Account (From) and Destination Account (To) cannot be the same.");
        return;
      }
    }

    const linkedClient = clients.find(c => c.uid === formClientId);
    const clientName = linkedClient 
      ? (linkedClient.displayName || linkedClient.email)
      : formCustomClientName || "";

    const transactionPayload = {
      type: formType,
      category: formType === "transfer" ? "Internal Transfer" : formCategory,
      amount: parseFloat(formAmount),
      description: formDescription,
      date: formDate,
      status: formStatus,
      clientName: formType === "transfer" ? "" : clientName,
      clientId: formType === "transfer" ? "" : (formClientId || ""),
      scope: formScope,
      paymentMode: formPaymentMode,
      paymentAccountId: formPaymentAccountId,
      transferToAccountId: formType === "transfer" ? formTransferToAccountId : ""
    };

    try {
      setSyncing(true);
      if (editingRecord) {
        await financeService.updateRecord(editingRecord.id, transactionPayload);
      } else {
        await financeService.createRecord(transactionPayload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save finance transaction", err);
      alert("Failed to save transaction. Please verify you are logged in as admin.");
    } finally {
      setSyncing(false);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    try {
      setSyncing(true);
      await financeService.deleteRecord(id);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Failed to delete transaction", err);
      alert("Failed to delete. Access restricted.");
    } finally {
      setSyncing(false);
    }
  };

  // Extract years and months dynamically for filters
  const yearsList = useMemo(() => {
    const yearsSet = new Set<string>(["2026"]);
    records.forEach(rec => {
      const yr = rec.date.split("-")[0];
      if (yr && yr.length === 4) yearsSet.add(yr);
    });
    return Array.from(yearsSet).sort();
  }, [records]);

  // Demo Data Seeding Engine for Admins
  const handleSeedDemoFinances = async () => {
    const confirmSeed = window.confirm(
      "Would you like to seed 6 months of realistic transaction data for CA Jyoshi Manohar office, along with 3 configured payment sources (Bank Accounts & Credit Cards) to populate the stats?"
    );
    if (!confirmSeed) return;

    try {
      setSyncing(true);

      // Create payment accounts first
      const sbiAcc = await financeService.createPaymentAccount({
        name: "SBI Current Account (Office)",
        type: "bank_account",
        openingBalance: 250000
      });
      const hdfcAcc = await financeService.createPaymentAccount({
        name: "HDFC Savings Account (Private)",
        type: "bank_account",
        openingBalance: 85000
      });
      const iciciAcc = await financeService.createPaymentAccount({
        name: "ICICI Visa Credit Card",
        type: "credit_card",
        openingBalance: 0
      });

      const demoDataList: Omit<FinanceRecord, "id" | "createdAt">[] = [
        // January 2026
        { type: "income", category: "Auditing Fees", amount: 45000, description: "Annual Statutory Audit - Techcorp Private Ltd", date: "2026-01-15", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "income", category: "Tax Consulting", amount: 12000, description: "Personal Income Tax planning - High Net Worth Individual", date: "2026-01-20", status: "paid", scope: "business", paymentMode: "UPI", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Office Rent", amount: 25000, description: "January Office Rental - CBD Plaza", date: "2026-01-02", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Salaries", amount: 42000, description: "Stipends for 3 article assistants and office secretary", date: "2026-01-31", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Software Licensing", amount: 6500, description: "Computax and Tally quarterly subscription renewal", date: "2026-01-10", status: "paid", scope: "business", paymentMode: "Credit Card", paymentAccountId: iciciAcc.id },
        // January Personal
        { type: "income", category: "Salary / Drawings", amount: 50000, description: "Monthly Drawings from CA Firm", date: "2026-01-01", status: "paid", scope: "personal", paymentMode: "Bank Transfer", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Rent & Housing", amount: 15000, description: "Personal Apartment Rent", date: "2026-01-02", status: "paid", scope: "personal", paymentMode: "Bank Transfer", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Groceries & Food", amount: 8500, description: "Monthly groceries - Nature's Basket", date: "2026-01-05", status: "paid", scope: "personal", paymentMode: "UPI", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Insurance & SIP", amount: 10000, description: "Mutual Fund SIP Auto-debit", date: "2026-01-10", status: "paid", scope: "personal", paymentMode: "Bank Transfer", paymentAccountId: hdfcAcc.id },
  
        // February 2026
        { type: "income", category: "GST Filing", amount: 18500, description: "Monthly GSTR-1 and GSTR-3B filings for 5 retail clients", date: "2026-02-10", status: "paid", scope: "business", paymentMode: "UPI", paymentAccountId: sbiAcc.id },
        { type: "income", category: "Corporate Advisory", amount: 35000, description: "Due Diligence Consulting for Mergers", date: "2026-02-18", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Office Rent", amount: 25000, description: "February Office Rental - CBD Plaza", date: "2026-02-02", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Salaries", amount: 42000, description: "Stipends for staff", date: "2026-02-28", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Utilities", amount: 4200, description: "Office high-speed fiber internet and electricity invoice", date: "2026-02-12", status: "paid", scope: "business", paymentMode: "UPI", paymentAccountId: sbiAcc.id },
        // February Personal
        { type: "income", category: "Salary / Drawings", amount: 50000, description: "Monthly Drawings from CA Firm", date: "2026-02-01", status: "paid", scope: "personal", paymentMode: "Bank Transfer", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Groceries & Food", amount: 7200, description: "Supermarket items & pantry stock", date: "2026-02-05", status: "paid", scope: "personal", paymentMode: "UPI", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Shopping & Leisure", amount: 6000, description: "Aesthetic home decor & books shopping", date: "2026-02-14", status: "paid", scope: "personal", paymentMode: "Credit Card", paymentAccountId: iciciAcc.id },
        { type: "expense", category: "Fuel & Transport", amount: 3500, description: "Personal Sedan petrol fill-ups", date: "2026-02-18", status: "paid", scope: "personal", paymentMode: "UPI", paymentAccountId: hdfcAcc.id },
  
        // March 2026
        { type: "income", category: "Auditing Fees", amount: 62000, description: "Internal Audits for Zenith Retail Chains", date: "2026-03-12", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "income", category: "Incorporate Services", amount: 15000, description: "Company Registration & LLP Incorporation - Spark Bio Ltd", date: "2026-03-24", status: "paid", scope: "business", paymentMode: "UPI", paymentAccountId: sbiAcc.id },
        { type: "income", category: "Tax Consulting", amount: 8500, description: "TDS Returns filings quarter 4", date: "2026-03-30", status: "paid", scope: "business", paymentMode: "UPI", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Office Rent", amount: 25000, description: "March Office Rental - CBD Plaza", date: "2026-03-02", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Salaries", amount: 42000, description: "March Office Salaries & Stipends", date: "2026-03-31", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Miscellaneous", amount: 3500, description: "CA Firm registration renewal dues with ICAI board", date: "2026-03-15", status: "paid", scope: "business", paymentMode: "Credit Card", paymentAccountId: iciciAcc.id },
        // March Personal
        { type: "income", category: "Salary / Drawings", amount: 55000, description: "Drawings - Client Project Increment", date: "2026-03-01", status: "paid", scope: "personal", paymentMode: "Bank Transfer", paymentAccountId: hdfcAcc.id },
        { type: "income", category: "Dividends & Investments", amount: 4800, description: "Quarterly Index Fund Dividends", date: "2026-03-15", status: "paid", scope: "personal", paymentMode: "Bank Transfer", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Groceries & Food", amount: 9200, description: "Monthly grocery basket restock", date: "2026-03-05", status: "paid", scope: "personal", paymentMode: "UPI", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Utilities & Bills", amount: 4500, description: "Home high-speed Wi-Fi & electricity bills", date: "2026-03-08", status: "paid", scope: "personal", paymentMode: "UPI", paymentAccountId: hdfcAcc.id },
  
        // April 2026
        { type: "income", category: "GST Filing", amount: 22000, description: "GST compliance retainer retainer services", date: "2026-04-10", status: "paid", scope: "business", paymentMode: "UPI", paymentAccountId: sbiAcc.id },
        { type: "income", category: "Corporate Advisory", amount: 50000, description: "Transfer Pricing study & documentation project", date: "2026-04-20", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "income", category: "Tax Consulting", amount: 15000, description: "Advance Tax calculation advisory - Zenith Retail", date: "2026-04-25", status: "pending", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Office Rent", amount: 25000, description: "April Office Rental - CBD Plaza", date: "2026-04-02", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Salaries", amount: 42000, description: "April salaries", date: "2026-04-30", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Office Supplies", amount: 2800, description: "Cartridges, audit file folders, printing paper supplies", date: "2026-04-05", status: "paid", scope: "business", paymentMode: "Cash", paymentAccountId: "" },
        // April Personal
        { type: "income", category: "Salary / Drawings", amount: 55000, description: "Monthly Drawings", date: "2026-04-01", status: "paid", scope: "personal", paymentMode: "Bank Transfer", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Rent & Housing", amount: 15000, description: "Personal Apartment Rent", date: "2026-04-02", status: "paid", scope: "personal", paymentMode: "Bank Transfer", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Health & Wellness", amount: 4800, description: "Premium dental checkup & vitamins", date: "2026-04-12", status: "paid", scope: "personal", paymentMode: "Credit Card", paymentAccountId: iciciAcc.id },
  
        // May 2026
        { type: "income", category: "Auditing Fees", amount: 75000, description: "Statutory Tax Audit - Apex Logistics Pvt Ltd", date: "2026-05-15", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "income", category: "GST Filing", amount: 19800, description: "GST Annual Return GSTR-9 filings", date: "2026-05-22", status: "paid", scope: "business", paymentMode: "UPI", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Office Rent", amount: 25000, description: "May Office Rental - CBD Plaza", date: "2026-05-02", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Salaries", amount: 45000, description: "May Salaries (including bonus)", date: "2026-05-31", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Marketing & Website", amount: 8000, description: "Domain, business hosting, professional SEO marketing", date: "2026-05-10", status: "paid", scope: "business", paymentMode: "Credit Card", paymentAccountId: iciciAcc.id },
        { type: "expense", category: "Travel & Conveyance", amount: 5600, description: "Client site audits taxi reimbursement", date: "2026-05-25", status: "paid", scope: "business", paymentMode: "Cash", paymentAccountId: "" },
        // May Personal
        { type: "income", category: "Salary / Drawings", amount: 60000, description: "Monthly drawings - bonus increment", date: "2026-05-01", status: "paid", scope: "personal", paymentMode: "Bank Transfer", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Groceries & Food", amount: 8100, description: "Artisanal food and grocery purchases", date: "2026-05-05", status: "paid", scope: "personal", paymentMode: "UPI", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Shopping & Leisure", amount: 12000, description: "Premium weekend apparel & luggage shopping", date: "2026-05-18", status: "paid", scope: "personal", paymentMode: "Credit Card", paymentAccountId: iciciAcc.id },
  
        // June 2026
        { type: "income", category: "Tax Consulting", amount: 45000, description: "NRI Income Tax structuring consultancy retainer", date: "2026-06-08", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "income", category: "GST Filing", amount: 24000, description: "GST advisory and appeal representation service", date: "2026-06-14", status: "paid", scope: "business", paymentMode: "UPI", paymentAccountId: sbiAcc.id },
        { type: "income", category: "Incorporate Services", amount: 18000, description: "Startup incubation corporate setup advisory", date: "2026-06-25", status: "pending", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Office Rent", amount: 25000, description: "June Office Rental - CBD Plaza", date: "2026-06-02", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Salaries", amount: 45000, description: "June Staff salaries", date: "2026-06-30", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "expense", category: "Utilities", amount: 4900, description: "Office AC electricity bill and phone charges", date: "2026-06-18", status: "paid", scope: "business", paymentMode: "UPI", paymentAccountId: sbiAcc.id },
        // June Personal
        { type: "income", category: "Salary / Drawings", amount: 60000, description: "Monthly Drawings from CA Firm", date: "2026-06-01", status: "paid", scope: "personal", paymentMode: "Bank Transfer", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Utilities & Bills", amount: 5200, description: "Home high-speed Wi-Fi, postpaid and water bills", date: "2026-06-08", status: "paid", scope: "personal", paymentMode: "UPI", paymentAccountId: hdfcAcc.id },
        { type: "expense", category: "Insurance & SIP", amount: 12000, description: "Mutual Fund SIP automatic transfer", date: "2026-06-10", status: "paid", scope: "personal", paymentMode: "Bank Transfer", paymentAccountId: hdfcAcc.id },
  
        // July 2026
        { type: "income", category: "Tax Consulting", amount: 95000, description: "FY 2025-26 Comprehensive Income Tax audit & filings", date: "2026-07-01", status: "paid", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id },
        { type: "income", category: "Auditing Fees", amount: 55000, description: "Bank Concurrent Audit retainer - TrustBank Branch", date: "2026-07-04", status: "pending", scope: "business", paymentMode: "Bank Transfer", paymentAccountId: sbiAcc.id }
      ];

      for (const item of demoDataList) {
        await financeService.createRecord(item);
      }
      alert("Successfully seeded 3 payment accounts and 6 months of financial transaction logs!");
    } catch (err) {
      console.error("Failed seeding demo finances: ", err);
      alert("Failed to seed. Please make sure database is online and rules are deployed.");
    } finally {
      setSyncing(false);
    }
  };

  // Open Modal to create new Payment Account
  const handleOpenNewAccountModal = () => {
    setEditingAccount(null);
    setAccountName("");
    setAccountType("bank_account");
    setAccountOpeningBalance("");
    setIsAccountModalOpen(true);
  };

  // Open Modal to edit existing Payment Account
  const handleOpenEditAccountModal = (acc: PaymentAccount) => {
    setEditingAccount(acc);
    setAccountName(acc.name);
    setAccountType(acc.type);
    setAccountOpeningBalance(acc.openingBalance.toString());
    setIsAccountModalOpen(true);
  };

  // Create or Update Payment Account
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim() || !accountOpeningBalance || isNaN(parseFloat(accountOpeningBalance))) {
      alert("Please enter a valid name and opening balance.");
      return;
    }
    try {
      setSyncing(true);
      if (editingAccount) {
        await financeService.updatePaymentAccount(editingAccount.id, {
          name: accountName.trim(),
          type: accountType,
          openingBalance: parseFloat(accountOpeningBalance)
        });
      } else {
        await financeService.createPaymentAccount({
          name: accountName.trim(),
          type: accountType,
          openingBalance: parseFloat(accountOpeningBalance)
        });
      }
      setAccountName("");
      setAccountOpeningBalance("");
      setEditingAccount(null);
      setIsAccountModalOpen(false);
    } catch (err) {
      console.error("Failed to save payment account", err);
      alert(`Error ${editingAccount ? "updating" : "creating"} payment account.`);
    } finally {
      setSyncing(false);
    }
  };

  // Delete Payment Account
  const handleDeleteAccount = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}"? Transactions linked to this account will remain, but will lose their account link.`);
    if (!confirmDelete) return;
    try {
      setSyncing(true);
      await financeService.deletePaymentAccount(id);
    } catch (err) {
      console.error("Failed to delete account", err);
      alert("Failed to delete account.");
    } finally {
      setSyncing(false);
    }
  };

  // Filter Logic
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // Tab pre-filters
      if (activeTab === "incomes" && rec.type !== "income") return false;
      if (activeTab === "expenses" && rec.type !== "expense" && rec.type !== "transfer") return false;

      // Scope Filter (default legacy records to 'business')
      const recScope = rec.scope || "business";
      if (selectedScope !== "all" && recScope !== selectedScope) return false;

      const recYear = rec.date.split("-")[0];
      const recMonth = rec.date.split("-")[1]; // '01', '02', etc.

      // Year Filter
      if (recYear !== selectedYear) return false;

      // Month Filter
      if (selectedMonth !== "All") {
        const monthNum = {
          "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
          "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
          "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
        }[selectedMonth];
        if (recMonth !== monthNum) return false;
      }

      // Type Filter (only relevant if we are on dashboard tab)
      if (activeTab === "dashboard") {
        if (selectedType !== "all" && rec.type !== selectedType) return false;
      }

      // Category Filter
      if (selectedCategory !== "All" && rec.category !== selectedCategory) return false;

      // Search Query
      if (searchQuery.trim() !== "") {
        const queryLower = searchQuery.toLowerCase();
        const descMatch = rec.description?.toLowerCase().includes(queryLower);
        const catMatch = rec.category.toLowerCase().includes(queryLower);
        const clientMatch = rec.clientName?.toLowerCase().includes(queryLower);
        if (!descMatch && !catMatch && !clientMatch) return false;
      }

      return true;
    });
  }, [records, selectedYear, selectedMonth, selectedScope, selectedType, selectedCategory, searchQuery, activeTab]);

  // Dynamic current balances for each account
  const accountBalances = useMemo(() => {
    const balances: Record<string, { income: number; expense: number; current: number }> = {};
    
    // Initialize with opening balances
    paymentAccounts.forEach(acc => {
      balances[acc.id] = {
        income: 0,
        expense: 0,
        current: acc.openingBalance
      };
    });

    // Accumulate transactions
    records.forEach(rec => {
      if (rec.status !== "paid") return;

      if (rec.paymentAccountId && balances[rec.paymentAccountId]) {
        if (rec.type === "income") {
          balances[rec.paymentAccountId].income += rec.amount;
          balances[rec.paymentAccountId].current += rec.amount;
        } else if (rec.type === "expense") {
          balances[rec.paymentAccountId].expense += rec.amount;
          balances[rec.paymentAccountId].current -= rec.amount;
        } else if (rec.type === "transfer") {
          // Transfer acts as an outflow from source account
          balances[rec.paymentAccountId].expense += rec.amount;
          balances[rec.paymentAccountId].current -= rec.amount;
        }
      }

      if (rec.type === "transfer" && rec.transferToAccountId && balances[rec.transferToAccountId]) {
        // Transfer acts as an inflow to destination account
        balances[rec.transferToAccountId].income += rec.amount;
        balances[rec.transferToAccountId].current += rec.amount;
      }
    });

    return balances;
  }, [paymentAccounts, records]);

  // Compute Assets, Liabilities, and Net Worth
  const balanceSheetMetrics = useMemo(() => {
    let assetsSum = 0;
    let liabilitiesSum = 0;

    paymentAccounts.forEach(acc => {
      const b = accountBalances[acc.id] || { income: 0, expense: 0, current: acc.openingBalance };
      const info = getAccountTypeInfo(acc.type);
      if (info.isAsset) {
        assetsSum += b.current;
      } else {
        liabilitiesSum += -b.current;
      }
    });

    return {
      totalAssets: assetsSum,
      totalLiabilities: liabilitiesSum,
      netWorth: assetsSum - liabilitiesSum
    };
  }, [paymentAccounts, accountBalances]);

  const { assets, liabilities } = useMemo(() => {
    const assList: PaymentAccount[] = [];
    const liabList: PaymentAccount[] = [];

    paymentAccounts.forEach(acc => {
      const info = getAccountTypeInfo(acc.type);
      if (info.isAsset) {
        assList.push(acc);
      } else {
        liabList.push(acc);
      }
    });

    return { assets: assList, liabilities: liabList };
  }, [paymentAccounts]);

  // Aggregate Metrics based on ALL records for selected month, year, and scope (ignores type/category filters for context)
  const metrics = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let pendingInvoicesVal = 0;

    records.forEach(rec => {
      // Scope filter matching
      const recScope = rec.scope || "business";
      if (selectedScope !== "all" && recScope !== selectedScope) return;

      const recYear = rec.date.split("-")[0];
      const recMonth = rec.date.split("-")[1];

      // Check month matches if selected
      let monthMatch = true;
      if (selectedMonth !== "All") {
        const monthNum = {
          "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
          "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
          "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
        }[selectedMonth];
        monthMatch = recMonth === monthNum;
      }

      if (recYear === selectedYear && monthMatch) {
        if (rec.type === "income") {
          totalIncome += rec.amount;
          if (rec.status === "pending" || rec.status === "overdue") {
            pendingInvoicesVal += rec.amount;
          }
        } else if (rec.type === "expense") {
          totalExpense += rec.amount;
        }
      }
    });

    const balance = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      balance,
      pendingInvoicesVal
    };
  }, [records, selectedYear, selectedMonth, selectedScope]);

  // Generate data for Recharts Bar/Area Chart (Grouped by Month & Scope)
  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    return months.map((m, index) => {
      const monthStr = String(index + 1).padStart(2, "0");
      let income = 0;
      let expense = 0;

      records.forEach(rec => {
        const recScope = rec.scope || "business";
        if (selectedScope !== "all" && recScope !== selectedScope) return;

        const recYear = rec.date.split("-")[0];
        const recMonth = rec.date.split("-")[1];
        if (recYear === selectedYear && recMonth === monthStr) {
          if (rec.type === "income") income += rec.amount;
          else if (rec.type === "expense") expense += rec.amount;
        }
      });

      return {
        month: m,
        Income: income,
        Expense: expense,
        Net: income - expense
      };
    });
  }, [records, selectedYear, selectedScope]);

  // Category Breakdown for Pie Charts (Current Filters applied)
  const categoryChartData = useMemo(() => {
    const categoryTotals: { [name: string]: number } = {};
    filteredRecords.forEach(rec => {
      if (rec.type === "transfer") return;
      categoryTotals[rec.category] = (categoryTotals[rec.category] || 0) + rec.amount;
    });

    return Object.keys(categoryTotals).map(catName => ({
      name: catName,
      value: categoryTotals[catName]
    }));
  }, [filteredRecords]);

  // Export CSV of Filtered Records
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert("No transactions available to export.");
      return;
    }

    const headers = ["ID", "Type", "Category", "Amount", "Description", "Date", "Status", "Client Name", "Source Account", "Destination Account"];
    const rows = filteredRecords.map(rec => {
      const sourceAcc = paymentAccounts.find(a => a.id === rec.paymentAccountId)?.name || "";
      const destAcc = paymentAccounts.find(a => a.id === rec.transferToAccountId)?.name || "";
      return [
        rec.id,
        rec.type,
        rec.category,
        rec.amount,
        `"${(rec.description || "").replace(/"/g, '""')}"`,
        rec.date,
        rec.status,
        `"${(rec.clientName || "").replace(/"/g, '""')}"`,
        `"${sourceAcc.replace(/"/g, '""')}"`,
        `"${destAcc.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CA_Manohar_Finances_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderLedgerLogsTable = (title: string, subtitle: string, defaultFormTypeToAdd?: "income" | "expense" | "transfer") => {
    return (
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        
        {/* Table Header toolbar */}
        <div className="px-6 py-5 border-b border-border bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-base font-bold text-primary tracking-tight">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Showing {filteredRecords.length} of {records.length} total logged transactions.</p>
          </div>
        </div>

        {/* Real Table */}
        <div className="overflow-x-auto">
          {filteredRecords.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center">
              <Building className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-slate-600 font-semibold italic text-sm">No transaction records match active filters.</p>
              <button
                onClick={() => handleOpenAddModal(defaultFormTypeToAdd)}
                className="mt-4 flex items-center space-x-1.5 bg-primary hover:bg-primary-hover text-white text-xs px-4 py-2 rounded-lg font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log first transaction</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-border text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6 text-center">Book</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Description / Client</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Source</th>
                  <th className="py-4 px-6 text-right">Amount</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-border font-medium">
                {filteredRecords.map((rec) => {
                  const isIncome = rec.type === "income";
                  const isTransfer = rec.type === "transfer";
                  const sourceAcc = paymentAccounts.find(a => a.id === rec.paymentAccountId)?.name || "--";
                  const destAcc = paymentAccounts.find(a => a.id === rec.transferToAccountId)?.name || "--";

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date */}
                      <td className="py-4 px-6 text-gray-600 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(rec.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </span>
                      </td>

                      {/* Scope */}
                      <td className="py-4 px-6 text-center font-bold">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wide ${
                          rec.scope === "personal" 
                            ? "bg-rose-50 text-rose-700 border border-rose-100" 
                            : "bg-[#1a2b58]/5 text-[#1a2b58] border border-[#1a2b58]/10"
                        }`}>
                          {rec.scope === "personal" ? "Private" : "Corporate"}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isTransfer
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : isIncome 
                              ? "bg-indigo-50/80 text-primary" 
                              : "bg-amber-50/80 text-amber-800"
                        }`}>
                          {isTransfer ? (
                            <ArrowLeftRight className="w-3 h-3 shrink-0 text-blue-500" />
                          ) : (
                            <Tag className="w-3 h-3 shrink-0" />
                          )}
                          {rec.category}
                        </span>
                      </td>

                      {/* Description & Client */}
                      <td className="py-4 px-6 font-semibold text-primary max-w-sm truncate" title={rec.description}>
                        {rec.description || "N/A"}
                        {rec.clientName && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-gray-600 font-normal">
                            <span className="p-1 bg-slate-100 rounded-full text-slate-500">
                              <User className="w-3 h-3" />
                            </span>
                            <span className="truncate text-[11px]">{rec.clientName}</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          rec.status === "paid" 
                            ? "bg-green-50 text-green-700 border border-green-200" 
                            : rec.status === "overdue"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-yellow-50 text-yellow-800 border border-yellow-200"
                        }`}>
                          {rec.status === "paid" && <Check className="w-2.5 h-2.5" />}
                          {rec.status === "pending" && <AlertCircle className="w-2.5 h-2.5" />}
                          {rec.status === "overdue" && <AlertCircle className="w-2.5 h-2.5" />}
                          {rec.status}
                        </span>
                      </td>

                      {/* Method / Source */}
                      <td className="py-4 px-6 text-center font-bold text-slate-600">
                        {isTransfer ? (
                          <div className="flex flex-col items-center text-[10px] text-blue-700 bg-blue-50/50 px-2 py-1 rounded-lg border border-blue-100">
                            <span className="flex items-center gap-1 font-semibold">
                              <ArrowLeftRight className="w-3 h-3 text-blue-500" /> Transfer
                            </span>
                            <span className="text-[9px] text-slate-500 mt-0.5">{sourceAcc} → {destAcc}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-slate-700 text-[11px]">{rec.paymentMode || "Cash"}</span>
                            {rec.paymentAccountId && (
                              <span className="text-[9px] text-gray-400 font-semibold mt-0.5">({sourceAcc})</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className={`py-4 px-6 text-right font-extrabold text-sm whitespace-nowrap ${
                        isTransfer 
                          ? "text-blue-600" 
                          : isIncome 
                            ? "text-green-600" 
                            : "text-primary"
                      }`}>
                        {isTransfer ? "⇆" : (isIncome ? "+" : "-")} ₹{rec.amount.toLocaleString("en-IN")}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(rec)}
                            className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          
                          {confirmDeleteId === rec.id ? (
                            <div className="flex items-center space-x-1.5 z-10 bg-slate-50 border p-1 rounded-md">
                              <span className="text-[10px] font-bold text-red-500">Confirm?</span>
                              <button 
                                onClick={() => handleDeleteTransaction(rec.id)} 
                                className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-bold"
                              >
                                Yes
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(null)} 
                                className="px-1.5 py-0.5 bg-slate-300 text-slate-800 rounded text-[9px] font-bold"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(rec.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 text-left font-sans animate-fade-in">
      
      {/* Upper Title and Seeder / Exporter Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div className="flex items-start sm:items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 mt-1 sm:mt-0 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors shrink-0 lg:hidden"
            title="Toggle Sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-primary tracking-tight">Monthly Finance Tracker</h2>
            <p className="text-gray-500 font-medium mt-1">
              Real-time corporate accounts audits, invoicing logs, income streams, and overhead trackers.
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center space-x-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Two-Column Sidebar Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start relative">
        
        {/* Mobile Backdrop */}
        <div 
          className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity lg:hidden ${
            isSidebarOpen ? "opacity-100 block" : "opacity-0 hidden"
          }`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Side Navigation Bar */}
        <aside 
          className={`
            fixed inset-y-0 left-0 z-50 bg-white border-r border-border shadow-2xl transition-all duration-300 ease-in-out flex flex-col gap-4 overflow-y-auto
            lg:sticky lg:top-6 lg:border lg:rounded-2xl lg:shadow-xs lg:z-auto
            ${isSidebarOpen ? "translate-x-0 w-72 lg:w-60 p-5 lg:p-4" : "-translate-x-full lg:translate-x-0 w-72 lg:w-[84px] p-5 lg:p-4"}
          `}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className={`border-b border-slate-100 flex items-center transition-all duration-300 pb-3 lg:justify-start`}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 -ml-1 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors shrink-0 hidden lg:block"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto scrollbar-none pb-4 lg:pb-0">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Overview & Analytics" },
              { id: "incomes", label: "Incomes", icon: TrendingUp, desc: "Professional Inflows" },
              { id: "expenses", label: "Expenses", icon: TrendingDown, desc: "Firm Outlays" },
              { id: "account", label: "Account", icon: Wallet, desc: "Assets & Liabilities" },
              { id: "settings", label: "Settings", icon: Settings, desc: "Configuration & Categories" },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSelectedCategory("All");
                    if (window.innerWidth < 1024) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`group relative flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl transition-all font-semibold text-xs whitespace-nowrap shrink-0 border ${
                    isActive
                      ? "bg-primary border-primary text-white shadow-sm"
                      : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-primary"
                  } ${!isSidebarOpen ? "lg:justify-center lg:px-0 lg:gap-0" : ""}`}
                >
                  <IconComp className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-[#AD8D3E]" : "text-slate-400"}`} />
                  <div className={`flex flex-col text-left transition-all duration-300 ${isSidebarOpen ? "opacity-100" : "lg:opacity-0 lg:w-0 overflow-hidden"}`}>
                    <span className="leading-tight">{tab.label}</span>
                    <span className={`text-[9px] hidden lg:block font-medium mt-0.5 ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                      {tab.desc}
                    </span>
                  </div>
                  {!isSidebarOpen && (
                    <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-md border border-slate-700 pointer-events-none">
                      {tab.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Dynamic Content Area */}
        <div className="flex-grow w-full min-w-0 space-y-6">

      {/* Finance Dimension Selector Tabs */}
      <div className="border-b border-slate-100 pb-px">
        <div className="flex space-x-6">
          <button
            onClick={() => {
              setSelectedScope("business");
              setSelectedCategory("All");
            }}
            className={`pb-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 relative ${
              selectedScope === "business"
                ? "border-[#AD8D3E] text-[#AD8D3E]"
                : "border-transparent text-slate-500 hover:text-primary"
            }`}
          >
            <Building className="w-4 h-4" />
            <span>💼 Professional Office Finances</span>
          </button>
          
          <button
            onClick={() => {
              setSelectedScope("personal");
              setSelectedCategory("All");
            }}
            className={`pb-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 relative ${
              selectedScope === "personal"
                ? "border-[#AD8D3E] text-[#AD8D3E]"
                : "border-transparent text-slate-500 hover:text-primary"
            }`}
          >
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span>🌸 Personal Expenses & Savings</span>
          </button>

          <button
            onClick={() => {
              setSelectedScope("all");
              setSelectedCategory("All");
            }}
            className={`pb-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 relative ${
              selectedScope === "all"
                ? "border-[#AD8D3E] text-[#AD8D3E]"
                : "border-transparent text-slate-500 hover:text-primary"
            }`}
          >
            <Check className="w-4 h-4 text-green-600" />
            <span>📊 Consolidated View</span>
          </button>
        </div>
      </div>

      {/* Global Filter Dashboard Banner */}
      <div className="bg-white border border-border p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Year select */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fiscal Year</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-accent border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary hover:border-slate-300 hover:shadow-sm cursor-pointer"
            >
              {yearsList.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Month select */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Audit Month</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-accent border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary hover:border-slate-300 hover:shadow-sm cursor-pointer"
            >
              <option value="All">All Months</option>
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Type filter buttons */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Transaction Category</span>
            <div className="bg-accent border border-slate-200 rounded-lg p-0.5 flex space-x-1">
              {(["all", "income", "expense", "transfer"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`px-3 py-1 text-xs rounded-md font-semibold capitalize transition-all ${
                    selectedType === t 
                      ? "bg-primary text-white shadow-sm" 
                      : "text-slate-600 hover:text-primary"
                  }`}
                >
                  {t === "all" ? "All Logs" : t === "transfer" ? "Transfers" : t}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Specific Stream</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-accent border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary min-w-[120px] hover:border-slate-300 hover:shadow-sm cursor-pointer"
            >
              <option value="All">All Categories</option>
              {(selectedScope === "all" || selectedScope === "business") && (
                <>
                  <optgroup label="💼 Corporate Revenue">
                    {customCategories.businessIncome.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                  <optgroup label="💼 Operating Expense">
                    {customCategories.businessExpense.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                </>
              )}
              {(selectedScope === "all" || selectedScope === "personal") && (
                <>
                  <optgroup label="🌸 Personal Inflow">
                    {customCategories.personalIncome.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🌸 Personal Expenses">
                    {customCategories.personalExpense.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-64 mt-2 sm:mt-0">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder="Search descriptions/clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-accent border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs font-medium text-primary outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              <X className="h-3 w-3 text-gray-400 hover:text-primary" />
            </button>
          )}
        </div>
      </div>

      {/* Bento Grid Stats Panel */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Metric 1: Income */}
          {(activeTab === "dashboard" || activeTab === "incomes") && (
            <div className="bg-white border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500" />
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold block">
                  {selectedScope === "business"
                    ? (selectedMonth !== "All" ? `${selectedMonth} Office Revenue` : "Annual Revenue")
                    : selectedScope === "personal"
                      ? (selectedMonth !== "All" ? `${selectedMonth} Private Inflow` : "Annual Private Inflow")
                      : (selectedMonth !== "All" ? `${selectedMonth} Income (Combined)` : "Combined Annual Income")
                  }
                </span>
                <span className="text-2xl font-bold text-primary block mt-1.5">
                  ₹{metrics.totalIncome.toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    {selectedScope === "business"
                      ? "Office client billings"
                      : selectedScope === "personal"
                        ? "Salary, SIP, drawings"
                        : "All combined inflows"
                    }
                  </span>
                </span>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-green-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          )}

          {/* Metric 2: Expenses */}
          {(activeTab === "dashboard" || activeTab === "expenses") && (
            <div className="bg-white border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-red-400" />
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold block">
                  {selectedScope === "business"
                    ? (selectedMonth !== "All" ? `${selectedMonth} Office Overheads` : "Annual Overheads")
                    : selectedScope === "personal"
                      ? (selectedMonth !== "All" ? `${selectedMonth} Personal Expenses` : "Annual Private Outlay")
                      : (selectedMonth !== "All" ? `${selectedMonth} Consolidated Outflows` : "Annual Outflows")
                  }
                </span>
                <span className="text-2xl font-bold text-primary block mt-1.5">
                  ₹{metrics.totalExpense.toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] text-red-500 font-semibold flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>
                    {selectedScope === "business"
                      ? "Operating overheads"
                      : selectedScope === "personal"
                        ? "Groceries, Rent, Leisure"
                        : "Total operating & private costs"
                    }
                  </span>
                </span>
              </div>
              <div className="p-3 bg-red-50 rounded-xl text-red-500">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
          )}

          {/* Metric 3: Profit / Net Margin */}
          {(activeTab === "dashboard" || activeTab === "expenses") && (
            <div className="bg-white border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group col-span-1 sm:col-span-2 lg:col-span-1">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${metrics.balance >= 0 ? "bg-[#AD8D3E]" : "bg-rose-500"}`} />
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold block">
                  {selectedScope === "business"
                    ? (selectedMonth !== "All" ? `${selectedMonth} Net Profit` : "Annual Profit Margin")
                    : selectedScope === "personal"
                      ? (selectedMonth !== "All" ? `${selectedMonth} Personal Savings` : "Net Annual Savings")
                      : (selectedMonth !== "All" ? `${selectedMonth} Combined Surplus` : "Consolidated Surplus")
                  }
                </span>
                <span className="text-2xl font-bold text-primary block mt-1.5">
                  ₹{metrics.balance.toLocaleString("en-IN")}
                </span>
                <span className={`text-[11px] font-semibold flex items-center gap-1 mt-1 ${
                  metrics.balance >= 0 ? "text-[#AD8D3E]" : "text-rose-500"
                }`}>
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>
                    {selectedScope === "business"
                      ? "Net Operating Margin"
                      : selectedScope === "personal"
                        ? "Private savings surplus"
                        : "Combined retained earnings"
                    }
                  </span>
                </span>
              </div>
              <div className={`p-3 rounded-xl ${metrics.balance >= 0 ? "bg-amber-50 text-[#AD8D3E]" : "bg-rose-50 text-rose-500"}`}>
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
          )}

          {/* Metric 4: Pending Invoices / Accounts Receivable */}
          {(activeTab === "dashboard" || activeTab === "incomes") && (
            <div className="bg-white border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group col-span-1 sm:col-span-2 lg:col-span-1">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold block">
                  {selectedScope === "business"
                    ? "Outstanding Receivables"
                    : selectedScope === "personal"
                      ? "Pending Outlays"
                      : "Consolidated Receivables"
                  }
                </span>
                <span className="text-2xl font-bold text-primary block mt-1.5">
                  ₹{metrics.pendingInvoicesVal.toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] text-blue-500 font-semibold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>
                    {selectedScope === "business"
                      ? "Pending Client Fees"
                      : selectedScope === "personal"
                        ? "Pending bills & SIPs"
                        : "Total Unresolved Outlays"
                    }
                  </span>
                </span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-blue-500">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          )}

        </div>
      )}

      {/* Assets & Liabilities / Balance Sheet & Live Ledgers */}
      {activeTab === "account" && (
        <div className="bg-white border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-primary tracking-tight">🏦 Balance Sheet &amp; Live Ledgers</h3>
              <p className="text-xs text-gray-500 mt-1">
                Consolidated Assets, Liabilities, and Net Worth computed in real-time from active ledger transactions.
              </p>
            </div>
            <button
              onClick={handleOpenNewAccountModal}
              className="flex items-center space-x-1.5 bg-[#1a2b58] hover:bg-[#121f42] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add Account / Asset / Liability</span>
            </button>
          </div>

          {paymentAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Wallet className="w-8 h-8 text-slate-400 mb-2" />
              <h4 className="text-xs font-bold text-slate-700">No Accounts Configured</h4>
              <p className="text-[11px] text-gray-400 max-w-sm mt-1">
                Add a bank account, investment, credit card, or loan to link transactions, track live assets and liabilities, and compute net worth.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* LEFT COLUMN: Assets */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    🟢 Assets &amp; Savings ({assets.length})
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    ₹{balanceSheetMetrics.totalAssets.toLocaleString("en-IN")}
                  </span>
                </div>

                {assets.length === 0 ? (
                  <div className="py-8 px-4 text-center border border-dashed border-slate-100 rounded-xl text-gray-400 text-xs bg-slate-50/30">
                    No active asset accounts configured.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assets.map((acc) => {
                      const b = accountBalances[acc.id] || { income: 0, expense: 0, current: acc.openingBalance };
                      const typeInfo = getAccountTypeInfo(acc.type);
                      const IconComp = typeInfo.icon;
                      return (
                        <div key={acc.id} className="border border-slate-100 p-4 rounded-xl hover:border-slate-300 transition-all group relative overflow-hidden bg-gradient-to-br from-white to-slate-50/30 shadow-xs">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <IconComp className={`w-4 h-4 ${typeInfo.color}`} />
                                <span className="font-semibold text-slate-800 text-sm">{acc.name}</span>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${typeInfo.bg} ${typeInfo.color} border ${typeInfo.border}`}>
                                {typeInfo.label}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => handleOpenEditAccountModal(acc)}
                                className="text-slate-400 hover:text-slate-700 transition p-1"
                                title="Edit asset account"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAccount(acc.id, acc.name)}
                                className="text-slate-400 hover:text-red-500 transition p-1"
                                title="Delete asset account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-end">
                            <div>
                              <span className="text-xs text-gray-400 block font-medium">Dynamic Ledger Balance</span>
                              <span className="text-lg font-extrabold text-emerald-700 tracking-tight block mt-0.5">
                                ₹{b.current.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[10px] text-gray-500 font-medium">
                            <div>
                              <span className="text-gray-400 block">Opening</span>
                              <span className="font-semibold text-slate-700">₹{acc.openingBalance.toLocaleString("en-IN")}</span>
                            </div>
                            <div>
                              <span className="text-green-500 block">Inflows</span>
                              <span className="font-semibold text-green-700">+{b.income.toLocaleString("en-IN")}</span>
                            </div>
                            <div>
                              <span className="text-red-400 block">Outflows</span>
                              <span className="font-semibold text-red-600">-{b.expense.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Liabilities */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    🔴 Liabilities &amp; Debts ({liabilities.length})
                  </span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                    ₹{balanceSheetMetrics.totalLiabilities.toLocaleString("en-IN")}
                  </span>
                </div>

                {liabilities.length === 0 ? (
                  <div className="py-8 px-4 text-center border border-dashed border-slate-100 rounded-xl text-gray-400 text-xs bg-slate-50/30">
                    No active liability accounts configured.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {liabilities.map((acc) => {
                      const b = accountBalances[acc.id] || { income: 0, expense: 0, current: acc.openingBalance };
                      const typeInfo = getAccountTypeInfo(acc.type);
                      const IconComp = typeInfo.icon;
                      // Outstanding debt is the positive presentation of negative ledger balance
                      const outstandingDebt = -b.current;

                      return (
                        <div key={acc.id} className="border border-slate-100 p-4 rounded-xl hover:border-slate-300 transition-all group relative overflow-hidden bg-gradient-to-br from-white to-slate-50/30 shadow-xs">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <IconComp className={`w-4 h-4 ${typeInfo.color}`} />
                                <span className="font-semibold text-slate-800 text-sm">{acc.name}</span>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${typeInfo.bg} ${typeInfo.color} border ${typeInfo.border}`}>
                                {typeInfo.label}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => handleOpenEditAccountModal(acc)}
                                className="text-slate-400 hover:text-slate-700 transition p-1"
                                title="Edit liability account"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAccount(acc.id, acc.name)}
                                className="text-slate-400 hover:text-red-500 transition p-1"
                                title="Delete liability"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-end">
                            <div>
                              <span className="text-xs text-gray-400 block font-medium">Outstanding Debt</span>
                              <span className={`text-lg font-extrabold tracking-tight block mt-0.5 ${outstandingDebt >= 0 ? "text-amber-700" : "text-emerald-700"}`}>
                                ₹{outstandingDebt.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[10px] text-gray-500 font-medium">
                            <div>
                              <span className="text-gray-400 block">Opening Debt</span>
                              <span className="font-semibold text-slate-700">₹{(-acc.openingBalance).toLocaleString("en-IN")}</span>
                            </div>
                            <div>
                              <span className="text-green-500 block">Payments</span>
                              <span className="font-semibold text-green-700">₹{b.income.toLocaleString("en-IN")}</span>
                            </div>
                            <div>
                              <span className="text-red-400 block">New Charges</span>
                              <span className="font-semibold text-red-600">₹{b.expense.toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {activeTab === "dashboard" && (
        <>
          {/* Real-time Net Worth & Liquidity Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
            {/* Net Worth */}
            <div className="bg-[#1a2b58] text-white p-5 rounded-xl relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Building className="w-16 h-16" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#AD8D3E]">Net Worth (Balance Sheet)</span>
              <span className="text-2xl font-extrabold tracking-tight block mt-1">
                ₹{balanceSheetMetrics.netWorth.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-slate-300 block mt-2 font-medium">
                Assets less outstanding liabilities
              </span>
            </div>

            {/* Total Assets */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <TrendingUp className="w-16 h-16 text-green-600" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Assets</span>
              <span className="text-2xl font-extrabold tracking-tight block mt-1 text-emerald-700">
                ₹{balanceSheetMetrics.totalAssets.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-green-600 block mt-2 font-medium flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {assets.length} Active asset sources
              </span>
            </div>

            {/* Total Liabilities */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <TrendingDown className="w-16 h-16 text-rose-600" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Liabilities</span>
              <span className="text-2xl font-extrabold tracking-tight block mt-1 text-amber-700">
                ₹{balanceSheetMetrics.totalLiabilities.toLocaleString("en-IN")}
              </span>
              <span className="text-[10px] text-amber-600 block mt-2 font-medium flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                {liabilities.length} Debt / credit streams
              </span>
            </div>
          </div>
        </>
      )}

      {/* Visual Analytics Row */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recharts Area Chart: Annual Inflow & Overhead trends */}
          <div className="lg:col-span-2 bg-white border border-border p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold text-primary tracking-tight">Income &amp; Expense Trends</h3>
                <p className="text-xs text-gray-400">Comparing professional fees vs operating expenses over year {selectedYear}.</p>
              </div>
              <div className="flex space-x-3 text-xs">
                <span className="flex items-center gap-1 font-semibold text-primary">
                  <span className="w-3 h-3 bg-[#1a2b58] rounded" /> Inflow
                </span>
                <span className="flex items-center gap-1 font-semibold text-primary">
                  <span className="w-3 h-3 bg-[#AD8D3E] rounded" /> Outflow
                </span>
              </div>
            </div>

            <div className="h-72 w-full text-xs font-medium">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a2b58" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#1a2b58" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#AD8D3E" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#AD8D3E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b" }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "10px", border: "none", color: "#fff" }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Area type="monotone" dataKey="Income" stroke="#1a2b58" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="Expense" stroke="#AD8D3E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category breakdown sidebar widget */}
          <div className="bg-white border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-primary tracking-tight mb-1">Specific Distribution</h3>
              <p className="text-xs text-gray-400 mb-4">Percentage allocation based on current filtered scopes.</p>
              
              {categoryChartData.length === 0 ? (
                <div className="py-12 text-center text-gray-400 italic text-xs border border-dashed rounded-xl mt-4">
                  No categorical data matches active filters.
                </div>
              ) : (
                <div className="h-44 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Filtered</span>
                    <span className="text-sm font-bold text-primary">{categoryChartData.length} Keys</span>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Category List legend */}
            <div className="mt-4 space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {categoryChartData.slice(0, 5).map((entry, index) => {
                const totalVal = categoryChartData.reduce((acc, curr) => acc + curr.value, 0);
                const percentage = totalVal > 0 ? Math.round((entry.value / totalVal) * 100) : 0;
                return (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-semibold text-primary truncate max-w-[120px]">{entry.name}</span>
                    </div>
                    <div className="text-gray-500 font-semibold">
                      ₹{entry.value.toLocaleString("en-IN")} <span className="text-[10px] font-bold text-[#AD8D3E]">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab-Specific Ledger Content */}
      {activeTab === "incomes" && renderLedgerLogsTable("Professional Income Streams", "Inflows of professional billings & fee drawings", "income")}
      {activeTab === "expenses" && renderLedgerLogsTable("Firm Operating Expenses", "Operating overheads, staff drawdowns, and equipment purchases", "expense")}

      {activeTab === "dashboard" && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Recent Table Toolbar */}
          <div className="px-6 py-5 border-b border-border bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-primary tracking-tight">Recent Ledger Activity</h3>
              <p className="text-xs text-gray-400 mt-0.5">Showing the latest 5 recorded transactions across all books.</p>
            </div>
            <button
              onClick={() => {
                setActiveTab("incomes");
              }}
              className="text-xs font-bold text-primary hover:text-[#AD8D3E] flex items-center gap-1 transition"
            >
              <span>View All Transactions</span>
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {records.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center">
                <Building className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-slate-600 font-semibold italic text-sm">No recent transactions recorded.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6 text-center">Book</th>
                    <th className="py-4 px-6">Category</th>
                    <th className="py-4 px-6">Description / Client</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-border font-medium">
                  {records.slice(-5).reverse().map((rec) => {
                    const isIncome = rec.type === "income";
                    const isTransfer = rec.type === "transfer";
                    
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 text-gray-600 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(rec.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center font-bold">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wide ${
                            rec.scope === "personal" 
                              ? "bg-rose-50 text-rose-700 border border-rose-100" 
                              : "bg-[#1a2b58]/5 text-[#1a2b58] border border-[#1a2b58]/10"
                          }`}>
                            {rec.scope === "personal" ? "Private" : "Corporate"}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isTransfer
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : isIncome 
                                ? "bg-indigo-50/80 text-primary" 
                                : "bg-amber-50/80 text-amber-800"
                          }`}>
                            {isTransfer ? (
                              <ArrowLeftRight className="w-3 h-3 shrink-0 text-blue-500" />
                            ) : (
                              <Tag className="w-3 h-3 shrink-0" />
                            )}
                            {rec.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-primary max-w-sm truncate" title={rec.description}>
                          {rec.description || "N/A"}
                          {rec.clientName && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-gray-600 font-normal">
                              <span className="p-1 bg-slate-100 rounded-full text-slate-500">
                                <User className="w-3 h-3" />
                              </span>
                              <span className="truncate text-[11px]">{rec.clientName}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            rec.status === "paid" 
                              ? "bg-green-50 text-green-700 border border-green-200" 
                              : rec.status === "overdue"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-yellow-50 text-yellow-800 border border-yellow-200"
                          }`}>
                            {rec.status === "paid" && <Check className="w-2.5 h-2.5" />}
                            {rec.status === "pending" && <AlertCircle className="w-2.5 h-2.5" />}
                            {rec.status === "overdue" && <AlertCircle className="w-2.5 h-2.5" />}
                            {rec.status}
                          </span>
                        </td>
                        <td className={`py-4 px-6 text-right font-extrabold text-sm whitespace-nowrap ${
                          isTransfer 
                            ? "text-blue-600" 
                            : isIncome 
                              ? "text-green-600" 
                              : "text-primary"
                        }`}>
                          {isTransfer ? "⇆" : (isIncome ? "+" : "-")} ₹{rec.amount.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab Content */}
      {activeTab === "settings" && (
        <div className="bg-white border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-primary tracking-tight">⚙️ Settings & Categories</h3>
              <p className="text-xs text-gray-500 mt-1">
                Configure your application preferences and manage custom ledger categories.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Category Management Block */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h4 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-500" />
                Manage Categories
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Select List to Edit
                  </label>
                  <select
                    value={categoryManageType}
                    onChange={(e) => setCategoryManageType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary hover:border-slate-300 hover:shadow-sm cursor-pointer transition"
                  >
                    <option value="businessIncome">Office / Corporate - Income</option>
                    <option value="businessExpense">Office / Corporate - Expense</option>
                    <option value="personalIncome">Personal - Income</option>
                    <option value="personalExpense">Personal - Expense</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Current Categories
                  </label>
                  <div className="h-48 overflow-y-auto space-y-2 pr-2 bg-white border border-slate-200 rounded-xl p-2">
                    {customCategories[categoryManageType].map((cat, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg">
                        {editingCategoryIndex === idx ? (
                          <div className="flex w-full items-center gap-2">
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEditCategory(idx);
                                }
                              }}
                              autoFocus
                              className="flex-1 bg-white border border-slate-200 rounded py-1 px-2 text-sm text-primary outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              onClick={(e) => { e.preventDefault(); handleSaveEditCategory(idx); }}
                              className="text-green-500 hover:text-green-600 p-1"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); setEditingCategoryIndex(null); }}
                              className="text-slate-400 hover:text-slate-600 p-1"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm font-medium text-slate-700">{cat}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => { 
                                  e.preventDefault(); 
                                  setEditingCategoryIndex(idx);
                                  setEditingCategoryName(cat);
                                }}
                                className="text-slate-400 hover:text-blue-500 transition p-1"
                                title="Edit category"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); handleRemoveCategory(cat); }}
                                className="text-red-400 hover:text-red-600 transition p-1"
                                title="Remove category"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {customCategories[categoryManageType].length === 0 && (
                      <p className="text-xs text-slate-500 italic text-center py-2">No categories found.</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Add New Category
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                      placeholder="E.g., Software Subscriptions"
                      className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-medium text-primary outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={(e) => { e.preventDefault(); handleAddCategory(); }}
                      disabled={!newCategoryName.trim()}
                      className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white px-4 rounded-xl text-sm font-semibold transition shadow-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Other Settings (Placeholder) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center text-center">
              <Settings className="w-12 h-12 text-slate-300 mb-3" />
              <h4 className="text-sm font-bold text-slate-500 mb-1">More Settings</h4>
              <p className="text-xs text-slate-400">Additional configuration options will appear here.</p>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      
      {/* Slide-over Form Drawer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          
          {/* Backdrop */}
          <div 
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" 
          />

          {/* Dialog Body */}
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-scale-up text-left flex flex-col max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
              <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#AD8D3E]" />
                {editingRecord ? "Edit Transaction" : "Log New Transaction"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-primary transition p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 flex-grow">
              
              {/* Scope Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Filing Scope / Book *
                </label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-slate-50 border border-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormScope("business")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                      formScope === "business"
                        ? "bg-white text-[#AD8D3E] shadow-sm border border-slate-100"
                        : "text-slate-500 hover:text-primary"
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Office / Corporate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormScope("personal")}
                    className={`py-2 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                      formScope === "personal"
                        ? "bg-white text-red-700 shadow-sm border border-slate-100"
                        : "text-slate-500 hover:text-primary"
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    <span>Personal Expense</span>
                  </button>
                </div>
              </div>

              {/* Type selector toggle */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 border border-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormType("income")}
                  className={`py-2.5 rounded-lg text-xs font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    formType === "income"
                      ? "bg-white text-green-700 shadow-sm border border-slate-100"
                      : "text-slate-600 hover:text-primary"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Inflow</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("expense")}
                  className={`py-2.5 rounded-lg text-xs font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    formType === "expense"
                      ? "bg-white text-amber-800 shadow-sm border border-slate-100"
                      : "text-slate-600 hover:text-primary"
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Outflow</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("transfer")}
                  className={`py-2.5 rounded-lg text-xs font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                    formType === "transfer"
                      ? "bg-white text-blue-700 shadow-sm border border-slate-100"
                      : "text-slate-600 hover:text-primary"
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
                  <span>Transfer</span>
                </button>
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Transaction Amount (INR) *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 pl-8 pr-4 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Filing / Invoicing Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Category and Status */}
              {formType === "transfer" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Account Category
                    </label>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-500 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                      <span>Internal Transfer</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Transfer Status *
                    </label>
                    <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as any)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition hover:border-slate-300 hover:shadow-sm cursor-pointer"
                    >
                      <option value="paid">Paid (Settled)</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Account Category *
                    </label>
                    <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition hover:border-slate-300 hover:shadow-sm cursor-pointer"
                    >
                      {formScope === "business"
                        ? (formType === "income" 
                            ? customCategories.businessIncome.map(cat => <option key={cat} value={cat}>{cat}</option>)
                            : customCategories.businessExpense.map(cat => <option key={cat} value={cat}>{cat}</option>)
                          )
                        : (formType === "income"
                            ? customCategories.personalIncome.map(cat => <option key={cat} value={cat}>{cat}</option>)
                            : customCategories.personalExpense.map(cat => <option key={cat} value={cat}>{cat}</option>)
                          )
                      }
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Invoice Status *
                    </label>
                    <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as any)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition hover:border-slate-300 hover:shadow-sm cursor-pointer"
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending Receipt</option>
                      <option value="overdue">Overdue Invoicing</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Client Linking (Only for Office/Business expenses & not transfers) */}
              {formScope === "business" && formType !== "transfer" && (
                <div className="bg-slate-50/60 border border-slate-100 p-4 rounded-xl space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Link Registered Client Account
                      </label>
                      <span className="text-[10px] text-gray-400 font-semibold italic">Optional</span>
                    </div>
                    <select
                      value={formClientId}
                      onChange={(e) => {
                        setFormClientId(e.target.value);
                        if (e.target.value !== "") {
                          setFormCustomClientName(""); // clear free-text
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- No Client Account Linked --</option>
                      {clients.map(c => (
                        <option key={c.uid} value={c.uid}>{c.displayName || c.email}</option>
                      ))}
                    </select>
                  </div>

                  {!formClientId && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Or Custom Client / Vendor Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Builders Co"
                        value={formCustomClientName}
                        onChange={(e) => setFormCustomClientName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Payment Mode and Source Account / Transfer Route */}
              {formType === "transfer" ? (
                <div className="bg-blue-50/40 border border-blue-100 p-4 rounded-xl space-y-4">
                  <div className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                    <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                    <span>Configure Transfer Route</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                        Source Account (From) *
                      </label>
                      <select
              value={formPaymentAccountId}
              onChange={(e) => setFormPaymentAccountId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary hover:border-slate-300 hover:shadow-sm cursor-pointer"
                        required
                      >
                        <option value="">-- Select Source --</option>
                        {paymentAccounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} (₹{(accountBalances[acc.id]?.current ?? acc.openingBalance).toLocaleString("en-IN")})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                        Destination Account (To) *
                      </label>
                      <select
              value={formTransferToAccountId}
              onChange={(e) => setFormTransferToAccountId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary hover:border-slate-300 hover:shadow-sm cursor-pointer"
                        required
                      >
                        <option value="">-- Select Destination --</option>
                        {paymentAccounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} (₹{(accountBalances[acc.id]?.current ?? acc.openingBalance).toLocaleString("en-IN")})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Transfer Payment Mode *
                    </label>
                    <select
              value={formPaymentMode}
              onChange={(e) => setFormPaymentMode(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary hover:border-slate-300 hover:shadow-sm cursor-pointer"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Payment Mode *
                    </label>
                    <select
              value={formPaymentMode}
              onChange={(e) => setFormPaymentMode(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition hover:border-slate-300 hover:shadow-sm cursor-pointer"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Source / Payment Account
                    </label>
                    <select
              value={formPaymentAccountId}
              onChange={(e) => setFormPaymentAccountId(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition hover:border-slate-300 hover:shadow-sm cursor-pointer"
                    >
                      <option value="">-- None (Hand Cash / Direct) --</option>
                      {paymentAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type === "bank_account" ? "Bank" : "Credit Card"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Narration / Notes
                </label>
                <textarea
                  placeholder="Provide transaction details or invoice reference number..."
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-medium text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
                >
                  {syncing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingRecord ? "Save Updates" : "Log Record"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setIsAccountModalOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" 
          />

          {/* Dialog Body */}
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up text-left flex flex-col max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#AD8D3E]" />
                <span>{editingAccount ? "Edit Payment Source" : "Configure Payment Source"}</span>
              </h3>
              <button 
                onClick={() => setIsAccountModalOpen(false)}
                className="text-slate-400 hover:text-primary transition p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAccount} className="space-y-4">
              {/* Account Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Account / Card Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SBI Current Account (Office)"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition"
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Payment Account Type *
                </label>
                <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as any)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition hover:border-slate-300 hover:shadow-sm cursor-pointer"
                >
                  <optgroup label="Assets (Positive Balance / Savings)">
                    <option value="bank_account">🏦 Bank Account</option>
                    <option value="investment">📈 Investment Account</option>
                    <option value="other_asset">💎 Other Asset</option>
                  </optgroup>
                  <optgroup label="Liabilities (Outstanding Debt / Outflow)">
                    <option value="credit_card">💳 Credit Card</option>
                    <option value="loan">🤝 Loan / Mortgage</option>
                    <option value="other_liability">⚠️ Other Liability</option>
                  </optgroup>
                </select>
              </div>

              {/* Opening Balance */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Opening Balance (INR) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={accountOpeningBalance}
                    onChange={(e) => setAccountOpeningBalance(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-4 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                  For Assets, enter a positive starting balance. For Liabilities (Credit Cards, Loans, etc.), enter a negative value for starting outstanding debt (or 0 if empty).
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border mt-5">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncing}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
                >
                  {syncing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAccount ? "Save Changes" : "Configure Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
