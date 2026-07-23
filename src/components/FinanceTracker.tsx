import toast from 'react-hot-toast';
import React, { useState, useEffect, useMemo, useRef } from "react";
import CustomSelect from "./CustomSelect";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import {  db, auth } from "../lib/firebase";
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
import {  FinanceRecord, PaymentAccount } from "../types";
import {  financeService } from "../services/financeService";
import { DayPicker, DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  FileSpreadsheet,
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
  SlidersHorizontal,
  X,
  PieChart as PieIcon,
  BarChart3,
  Check,
  Building,
  CreditCard,
  Wallet,
  LayoutDashboard,
  Menu,
  Settings,
  Printer
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
    "Advance Received",
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
    "Miscellaneous",
    "Payment from Advance"
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
      return window.innerWidth >= 768;
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "incomes" | "expenses" | "account" | "settings" | "receivables" | "payables" | "ai_insights">("dashboard");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<string>("All");
  const [selectedScope, setSelectedScope] = useState<"all" | "business" | "personal">("all");
  const [selectedType, setSelectedType] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // AI Insights State
  const [aiInsights, setAiInsights] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("finance_ai_insights");
      return saved || "";
    }
    return "";
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);

  // Budget Limits / Targets State
  const [budgetTargets, setBudgetTargets] = useState<{ [category: string]: number }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("finance_budget_targets");
      if (saved) return JSON.parse(saved);
    }
    return {
      "Rent & Property": 25000,
      "Salaries & Draws": 50000,
      "Software & IT Services": 5000,
      "Utilities & Comm.": 8000,
      "Office Supplies": 4000,
      "Marketing & Growth": 10000,
      "Taxes & Filings": 15000,
      "Groceries & Food": 15000,
      "Shopping & Leisure": 12000,
      "Travel & Transport": 6000,
      "Utilities": 5000
    };
  });

  const [budgetCategorySelect, setBudgetCategorySelect] = useState<string>("");
  const [budgetAmountInput, setBudgetAmountInput] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("finance_budget_targets", JSON.stringify(budgetTargets));
    }
  }, [budgetTargets]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("finance_ai_insights", aiInsights);
    }
  }, [aiInsights]);

  const fetchAiInsights = async (customQ?: string) => {
    setAiLoading(true);
    setAiError(null);
    try {
      const q = customQ || aiQuestion || "";
      const response = await fetch("/api/finance/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records,
          accounts: paymentAccounts,
          customQuestion: q
        })
      });
      const data = await response.json();
      if (response.ok) {
        if (q) {
          const responseText = data.insights;
          setAiInsights((prev) => {
            const heading = `### 💬 Question: ${q}`;
            return `${prev ? prev + "\n\n" : ""}${heading}\n\n${responseText}`;
          });
          setAiQuestion("");
        } else {
          setAiInsights(data.insights);
        }
      } else {
        setAiError(data.error || "Failed to retrieve AI financial insights.");
      }
    } catch (err: any) {
      console.error("Failed to query AI advisor:", err);
      setAiError("A network error occurred while connecting to the AI Financial Advisor. Make sure the backend is active.");
    } finally {
      setAiLoading(false);
    }
  };

  const [customCategories, setCustomCategories] = useState<{ [key: string]: string[] }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("finance_custom_categories");
      if (saved) {
        let parsed = JSON.parse(saved);
        if (parsed.businessIncome && !parsed.businessIncome.includes("Advance Received")) {
            parsed.businessIncome.push("Advance Received");
        }
        if (parsed.businessExpense && !parsed.businessExpense.includes("Payment from Advance")) {
            parsed.businessExpense.push("Payment from Advance");
        }
        return parsed;
      }
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
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "category" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

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
  const [formIsReceivableFromClient, setFormIsReceivableFromClient] = useState(false);
  const [formTitheApplicable, setFormTitheApplicable] = useState(false);
  const [formTitheAmount, setFormTitheAmount] = useState("");

  // Confirmation Dialogue
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<(() => void) | null>(null);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveModalRecords, setReceiveModalRecords] = useState<FinanceRecord[]>([]);
  const [receiveModalAccountId, setReceiveModalAccountId] = useState("");
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [recordsToDelete, setRecordsToDelete] = useState<FinanceRecord[]>([]);

  const [payCcModalOpen, setPayCcModalOpen] = useState(false);
  const [payCcAccount, setPayCcAccount] = useState<PaymentAccount | null>(null);
  const [payCcOutstanding, setPayCcOutstanding] = useState(0);
  const [payCcAmountType, setPayCcAmountType] = useState<"full" | "minimum" | "custom">("full");
  const [payCcCustomAmount, setPayCcCustomAmount] = useState("");
  const [payCcSourceAccountId, setPayCcSourceAccountId] = useState("");

  // Add CC Bill States
  const [payCcMinAmount, setPayCcMinAmount] = useState(0);

  // Export Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportReportType, setExportReportType] = useState<"expenses" | "income" | "payable" | "receivables">("expenses");
  const [exportPeriod, setExportPeriod] = useState<"all" | "this_month" | "last_month" | "custom">("this_month");
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(true);
  
  const [payCcPendingBillId, setPayCcPendingBillId] = useState<string | null>(null);
  const [addCcBillModalOpen, setAddCcBillModalOpen] = useState(false);
  const [addCcBillAccountId, setAddCcBillAccountId] = useState("");

  
  const [addCcBillFullAmount, setAddCcBillFullAmount] = useState("");
  const [addCcBillMinAmount, setAddCcBillMinAmount] = useState("");
  const [addCcBillDueDate, setAddCcBillDueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [addCcBillAdjustLedger, setAddCcBillAdjustLedger] = useState(false);

  // Adjust CC Balance States
  const [adjustCcBalanceModalOpen, setAdjustCcBalanceModalOpen] = useState(false);
  const [adjustCcAccount, setAdjustCcAccount] = useState<PaymentAccount | null>(null);
  const [adjustCcCurrentBalance, setAdjustCcCurrentBalance] = useState(0);
  const [adjustCcNewBalance, setAdjustCcNewBalance] = useState("");
  const [adjustCcReason, setAdjustCcReason] = useState("");

  const handleAdjustCcBalance = (acc: PaymentAccount, currentDebt: number) => {
    setAdjustCcAccount(acc);
    setAdjustCcCurrentBalance(currentDebt);
    setAdjustCcNewBalance(currentDebt.toString());
    setAdjustCcReason("Interest / EMI / Fee Adjustment");
    setAdjustCcBalanceModalOpen(true);
  };

  const confirmAdjustCcBalance = async () => {
    if (!adjustCcAccount) return;
    const newDebt = Math.abs(parseFloat(adjustCcNewBalance));
    if (isNaN(newDebt)) {
      toast.error("Please enter a valid amount.");
      return;
    }
    const diff = newDebt - adjustCcCurrentBalance;
    if (diff === 0) {
      toast.error("New balance is same as current balance.");
      return;
    }

    try {
      setSyncing(true);
      await financeService.createRecord({
        type: diff > 0 ? 'expense' : 'income',
        amount: Math.abs(diff),
        category: 'Balance Adjustment',
        description: adjustCcReason || `Manual Balance Adjustment`,
        date: new Date().toISOString().split("T")[0],
        status: 'paid',
        scope: selectedScope === "all" ? "business" : selectedScope,
        paymentAccountId: adjustCcAccount.id
      });
      
      const _records = await financeService.getAllRecords();
      setRecords(_records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      toast.success("Balance adjusted successfully");
      setAdjustCcBalanceModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to adjust balance");
    } finally {
      setSyncing(false);
    }
  };

  const confirmAddCcBill = async () => {
    if (!addCcBillAccountId) {
      toast.error("Please select a credit card.");
      return;
    }
    const fullAmt = parseFloat(addCcBillFullAmount);
    const minAmt = parseFloat(addCcBillMinAmount);
    if (isNaN(fullAmt) || isNaN(minAmt)) {
      toast.error("Please enter valid amounts.");
      return;
    }

    try {
      setSyncing(true);
      const ccAcc = paymentAccounts.find(a => a.id === addCcBillAccountId);
      
      const newRec = await financeService.createRecord({
        type: 'expense',
        amount: fullAmt,
        category: 'Credit Card Bill',
        description: `Statement Bill for ${ccAcc?.name || 'Credit Card'}`,
        date: addCcBillDueDate,
        status: 'pending',
        scope: selectedScope === "all" ? "business" : selectedScope,
        paymentAccountId: addCcBillAccountId,
        ccBillDetails: {
          fullAmount: fullAmt,
          minAmount: minAmt,
          dueDate: addCcBillDueDate
        }
      });

      if (addCcBillAdjustLedger) {
        const diff = Math.abs(parseFloat(adjustCcNewBalance)) - adjustCcCurrentBalance;
        if (!isNaN(diff) && diff !== 0) {
          await financeService.createRecord({
            type: diff > 0 ? 'expense' : 'income',
            amount: Math.abs(diff),
            category: 'Balance Adjustment',
            description: adjustCcReason || `Auto-adjustment to match Statement Bill`,
            date: new Date().toISOString().split("T")[0],
            status: 'paid',
            scope: selectedScope === "all" ? "business" : selectedScope,
            paymentAccountId: addCcBillAccountId
          });
        }
      }

      const _records = await financeService.getAllRecords();
      setRecords(_records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      toast.success(`Successfully added bill for ${ccAcc?.name}`);
      setAddCcBillModalOpen(false);
      
      setAddCcBillAccountId("");
      setAddCcBillFullAmount("");
      setAddCcBillMinAmount("");
      setAddCcBillAdjustLedger(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to add bill.");
    } finally {
      setSyncing(false);
    }
  };

  const handlePayCreditCardBill = (acc: PaymentAccount, outstanding: number) => {
    setPayCcAccount(acc);
    setPayCcOutstanding(outstanding);
    setPayCcAmountType("full");
    setPayCcCustomAmount("");
    setPayCcSourceAccountId("");
    setPayCcModalOpen(true);
  };

  const confirmPayCreditCardBill = async () => {
    if (!payCcSourceAccountId) {
      toast.error("Please select an asset account to pay from.");
      return;
    }
    if (!payCcAccount) return;

    const amountToPay = payCcAmountType === "full" ? payCcOutstanding : payCcAmountType === "minimum" ? (payCcOutstanding * 0.05) : parseFloat(payCcCustomAmount) || 0;

    try {
      setSyncing(true);
      await financeService.createRecord({
        type: 'transfer',
        amount: amountToPay,
        category: 'Credit Card Bill Payment',
        description: `Paid ${payCcAmountType === 'full' ? 'Full' : payCcAmountType === 'minimum' ? 'Minimum' : 'Custom'} Amount for ${payCcAccount.name}`,
        date: new Date().toISOString().split("T")[0],
        status: 'paid',
        paymentAccountId: payCcSourceAccountId,
        transferToAccountId: payCcAccount.id,
        scope: selectedScope === "all" ? "business" : selectedScope,
      });
      const _records = await financeService.getAllRecords();
      setRecords(_records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      toast.success(`Successfully paid ₹${amountToPay.toLocaleString("en-IN")}`);
      setPayCcModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to process payment");
    } finally {
      setSyncing(false);
    }
  };


  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showUndoToast = (message: string, onUndo: () => void) => {
    setToastMessage(message);
    setUndoAction(() => {
      return () => {
        onUndo();
        setToastMessage(null);
        setUndoAction(null);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      };
    });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      setUndoAction(null);
    }, 5000);
  };



  // Payment Accounts State
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);

  // New Payment Account Form Fields
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<'bank_account' | 'credit_card' | 'investment' | 'loan' | 'other_asset' | 'other_liability'>("bank_account");
  const [accountOpeningBalance, setAccountOpeningBalance] = useState("");
  const [accountIsEmiPayable, setAccountIsEmiPayable] = useState(false);
  const [accountEmiAmount, setAccountEmiAmount] = useState("");
  const [accountEmiDueDate, setAccountEmiDueDate] = useState("1");

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
    setFormIsReceivableFromClient(false);
    setFormTitheApplicable(false);
    setFormTitheAmount("");
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
    setFormIsReceivableFromClient(rec.isReceivableFromClient || false);
    setFormTitheApplicable(false);
    setFormTitheAmount("");
    setFormPaymentMode(rec.paymentMode || "Cash");
    setFormPaymentAccountId(rec.paymentAccountId || "");
    setFormTransferToAccountId(rec.transferToAccountId || "");
    setIsModalOpen(true);
  };

  
  
  const handleBulkMarkAsPaid = () => {
    const recordsToMark = records.filter(r => selectedRecordIds.includes(r.id));
    setReceiveModalRecords(recordsToMark);
    setReceiveModalAccountId("");
    setReceiveModalOpen(true);
  };

  const handleMarkAsPaid = (rec: FinanceRecord) => {
    setReceiveModalRecords([rec]);
    setReceiveModalAccountId("");
    setReceiveModalOpen(true);
  };

  const confirmMarkAsReceived = async () => {
    if (!receiveModalAccountId) {
      toast.error("Please select the account where the funds were received.");
      return;
    }
    
    try {
      setSyncing(true);
      const recordsToProcess = receiveModalRecords.filter(rec => 
        (rec.type === 'expense' && rec.isReceivableFromClient) || 
        rec.status === 'pending' || 
        rec.status === 'overdue'
      );
      
      const prevStatuses = recordsToProcess.map(r => ({ 
        id: r.id, 
        status: r.status, 
        isReceivableFromClient: r.isReceivableFromClient,
        paymentAccountId: r.paymentAccountId
      }));
      
      let createdRecordIds: string[] = [];
      
      for (const rec of recordsToProcess) {
        if (rec.type === 'expense' && rec.isReceivableFromClient) {
          await financeService.updateRecord(rec.id, { isReceivableFromClient: false, isReimbursed: true });
          const newRec = await financeService.createRecord({
            type: 'income',
            amount: rec.amount,
            category: 'Reimbursement',
            description: `Reimbursement for: ${rec.description || 'Expense'}`,
            date: new Date().toISOString().split("T")[0],
            status: 'paid',
            clientId: rec.clientId || "",
            clientName: rec.clientName || "",
            scope: rec.scope || "business",
            paymentAccountId: receiveModalAccountId,
            paymentMode: "Transfer"
          });
          createdRecordIds.push(newRec.id);
        } else {
          await financeService.updateRecord(rec.id, { status: "paid", paymentAccountId: receiveModalAccountId });
        }
      }
      
      const _records = await financeService.getAllRecords();
      setRecords(_records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      
      const count = recordsToProcess.length;
      showUndoToast(`Marked ${count} record(s) as Received`, async () => {
        try {
          setSyncing(true);
          await Promise.all(prevStatuses.map(ps => financeService.updateRecord(ps.id, { 
            status: ps.status,
            isReceivableFromClient: ps.isReceivableFromClient,
            paymentAccountId: ps.paymentAccountId
          })));
          
          if (createdRecordIds.length > 0) {
            await Promise.all(createdRecordIds.map(id => financeService.deleteRecord(id)));
          }
          
          const _revRecords = await financeService.getAllRecords();
          setRecords(_revRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (e) {
          console.error(e);
          toast.error("Failed to undo.");
        } finally {
          setSyncing(false);
        }
      });
      
      setSelectedRecordIds([]);
      setReceiveModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to process.");
    } finally {
      setSyncing(false);
    }
  };

  // Handle Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || isNaN(parseFloat(formAmount))) {
      toast.error("Please enter a valid amount.");
      return;
    }

    if (formType === "transfer") {
      if (!formPaymentAccountId) {
        toast.error("Please select the Source Account (From) for the transfer.");
        return;
      }
      if (!formTransferToAccountId) {
        toast.error("Please select the Destination Account (To) for the transfer.");
        return;
      }
      if (formPaymentAccountId === formTransferToAccountId) {
        toast("Source Account (From) and Destination Account (To) cannot be the same.");
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
      paymentMode: (formStatus === "paid" || formType === "transfer") ? formPaymentMode : "",
      paymentAccountId: (formStatus === "paid" || formType === "transfer") ? formPaymentAccountId : "",
      transferToAccountId: formType === "transfer" ? formTransferToAccountId : "",
      isReceivableFromClient: formIsReceivableFromClient
    };

    try {
      setSyncing(true);
      if (editingRecord) {
        await financeService.updateRecord(editingRecord.id, transactionPayload);
      } else {
        await financeService.createRecord(transactionPayload);
        
        if (formTitheApplicable && formType === "income" && formScope === "business" && formTitheAmount) {
           const titheAmt = parseFloat(formTitheAmount);
           if (!isNaN(titheAmt) && titheAmt > 0) {
             let tithesAcc = paymentAccounts.find(a => a.name === "Tithes and Offerings" && a.type === "other_liability");
             if (!tithesAcc) {
               tithesAcc = await financeService.createPaymentAccount({
                 name: "Tithes and Offerings",
                 type: "other_liability",
                 openingBalance: 0,
                 isEmiPayable: false,
                 emiAmount: 0,
                 emiDueDate: "1"
               });
             }
             
             await financeService.createRecord({
               type: "expense",
               category: "Tithes and Offerings",
               amount: titheAmt,
               description: `Tithe Provision for: ${formDescription || "Inflow"}`,
               date: formDate,
               status: "paid",
               clientName: "",
               clientId: "",
               scope: "business",
               paymentMode: "Transfer",
               paymentAccountId: tithesAcc.id,
               transferToAccountId: "",
               isReceivableFromClient: false
             });
           }
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to save finance transaction", err);
      toast.error("Failed to save transaction. Please verify you are logged in as admin.");
    } finally {
      setSyncing(false);
    }
  };

  // Open Delete Confirmation Modal for single transaction
  const handleDeleteTransaction = (id: string) => {
    const rec = records.find(r => r.id === id);
    if (rec) {
      setRecordsToDelete([rec]);
      setDeleteConfirmModalOpen(true);
    }
  };

  // Bulk Delete Transactions
  const handleBulkDeleteTransactions = async () => {
    try {
      setSyncing(true);
      await Promise.all(recordsToDelete.map(r => financeService.deleteRecord(r.id)));
      
      const deletedIds = new Set(recordsToDelete.map(r => r.id));
      setSelectedRecordIds(prev => prev.filter(id => !deletedIds.has(id)));
      toast.success(`${recordsToDelete.length} transaction(s) deleted successfully!`);
      setDeleteConfirmModalOpen(false);
      setRecordsToDelete([]);
    } catch (err) {
      console.error("Failed to delete transactions in bulk", err);
      toast.error("Failed to delete some transactions.");
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
      toast.success("Successfully seeded 3 payment accounts and 6 months of financial transaction logs!");
    } catch (err) {
      console.error("Failed seeding demo finances: ", err);
      toast.error("Failed to seed. Please make sure database is online and rules are deployed.");
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
    setAccountIsEmiPayable(false);
    setAccountEmiAmount("");
    setAccountEmiDueDate("1");
    setIsAccountModalOpen(true);
  };

  // Open Modal to edit existing Payment Account
  const handleOpenEditAccountModal = (acc: PaymentAccount) => {
    setEditingAccount(acc);
    setAccountName(acc.name);
    setAccountType(acc.type);
    const info = getAccountTypeInfo(acc.type);
    setAccountOpeningBalance(info.isAsset ? acc.openingBalance.toString() : Math.abs(acc.openingBalance).toString());
    setAccountIsEmiPayable(acc.isEmiPayable || false);
    setAccountEmiAmount(acc.emiAmount?.toString() || "");
    setAccountEmiDueDate(acc.emiDueDate || "1");
    setIsAccountModalOpen(true);
  };

  // Create or Update Payment Account
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim() || !accountOpeningBalance || isNaN(parseFloat(accountOpeningBalance))) {
      toast.error("Please enter a valid name and opening balance.");
      return;
    }
    try {
      setSyncing(true);
      let parsedBal = parseFloat(accountOpeningBalance);
      const isAsset = getAccountTypeInfo(accountType).isAsset;
      if (!isAsset && parsedBal > 0) {
        parsedBal = -parsedBal; // liabilities are stored as negative
      }

      const payload: any = {
        name: accountName.trim(),
        type: accountType,
        openingBalance: parsedBal
      };
      
      if (accountType === 'loan' && accountIsEmiPayable) {
        payload.isEmiPayable = true;
        payload.emiAmount = parseFloat(accountEmiAmount) || 0;
        payload.emiDueDate = accountEmiDueDate;
      } else {
        payload.isEmiPayable = false;
        payload.emiAmount = 0;
        payload.emiDueDate = "1";
      }

      if (editingAccount) {
        await financeService.updatePaymentAccount(editingAccount.id, payload);
      } else {
        await financeService.createPaymentAccount(payload);
      }
      setAccountName("");
      setAccountOpeningBalance("");
      setEditingAccount(null);
      setIsAccountModalOpen(false);
    } catch (err) {
      console.error("Failed to save payment account", err);
      toast.error(`Error ${editingAccount ? "updating" : "creating"} payment account.`);
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
      toast.error("Failed to delete account.");
    } finally {
      setSyncing(false);
    }
  };

  // Filter Logic
  const filteredRecords = useMemo(() => {
    const filtered = records.filter(rec => {
      // Tab pre-filters
      if (activeTab === "incomes" && (rec.type !== "income" || rec.category === "Reimbursement")) return false;
      if (activeTab === "expenses" && rec.type !== "expense" && rec.type !== "transfer") return false;
            if (activeTab === "payables") {
        if (rec.type !== "expense" || (rec.status !== "pending" && rec.status !== "overdue")) return false;
      }
      if (activeTab === "receivables") {
        const isPendingInvoice = rec.type === "income" && rec.category !== "Reimbursement" && rec.category !== "Advance Received" && (rec.status === "pending" || rec.status === "overdue");
        const isPendingReimbursement = rec.type === "expense" && rec.isReceivableFromClient;
        if (!isPendingInvoice && !isPendingReimbursement) return false;
      }

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
        if (selectedType === "income" && (rec.category === "Reimbursement" || rec.category === "Advance Received")) return false;
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

      // Date Range Filter
      if (filterStartDate && rec.date < filterStartDate) return false;
      if (filterEndDate && rec.date > filterEndDate) return false;

      return true;
    });

    // Apply Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "amount":
          comparison = Number(a.amount) - Number(b.amount);
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "date":
        default:
          comparison = a.date.localeCompare(b.date);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [records, selectedYear, selectedMonth, selectedScope, selectedType, selectedCategory, searchQuery, activeTab, filterStartDate, filterEndDate, sortBy, sortOrder]);

  // Dynamic current balances for each account
  const accountBalances = useMemo(() => {
    const balances: Record<string, { income: number; expense: number; current: number }> = {};
    
    // Initialize with opening balances
    paymentAccounts.forEach(acc => {
      const isAsset = getAccountTypeInfo(acc.type).isAsset;
      let opening = acc.openingBalance;
      // If the user entered a positive opening balance for a liability, they mean debt.
      // In the ledger, debt is represented as a negative balance.
      if (!isAsset && opening > 0) {
        opening = -opening;
      }
      balances[acc.id] = {
        income: 0,
        expense: 0,
        current: opening
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

  // Compute pending reimbursements from client
  const pendingReimbursementsBalance = useMemo(() => {
    let balance = 0;
    records.forEach(rec => {
      if (rec.isReceivableFromClient) {
        if (rec.type === 'expense') balance += rec.amount;
        else if (rec.type === 'income') balance -= rec.amount;
      }
    });
    return balance;
  }, [records]);

  const pendingInvoicesBalance = useMemo(() => {
    let balance = 0;
    records.forEach(rec => {
      if (rec.type === 'income' && (rec.status === 'pending' || rec.status === 'overdue')) {
        balance += rec.amount;
      }
    });
    return balance;
  }, [records]);

  const totalReceivables = pendingReimbursementsBalance + pendingInvoicesBalance;

  const pendingPayablesBalance = useMemo(() => {
    let balance = 0;
    records.forEach(rec => {
      if (rec.type === 'expense' && (rec.status === 'pending' || rec.status === 'overdue')) {
        balance += rec.amount;
      }
    });
    return balance;
  }, [records]);

  const totalPayables = pendingPayablesBalance;

  // Compute Client Advances
  const { totalAdvancesReceived, totalPaymentsFromAdvances, pendingAdvancesBalance } = useMemo(() => {
    let advances = 0;
    let payments = 0;
    records.forEach(rec => {
      if (rec.type === 'income' && rec.category === 'Advance Received') {
        advances += rec.amount;
      } else if (rec.type === 'expense' && rec.category === 'Payment from Advance') {
        payments += rec.amount;
      }
    });
    return {
      totalAdvancesReceived: advances,
      totalPaymentsFromAdvances: payments,
      pendingAdvancesBalance: advances - payments
    };
  }, [records]);


  // Compute Assets, Liabilities, and Net Worth
  const balanceSheetMetrics = useMemo(() => {
    let assetsSum = pendingReimbursementsBalance;
    let liabilitiesSum = pendingAdvancesBalance > 0 ? pendingAdvancesBalance : 0;
    if (pendingAdvancesBalance < 0) assetsSum += Math.abs(pendingAdvancesBalance);

    paymentAccounts.forEach(acc => {
      const b = accountBalances[acc.id] || { income: 0, expense: 0, current: (!getAccountTypeInfo(acc.type).isAsset && acc.openingBalance > 0) ? -acc.openingBalance : acc.openingBalance };
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

    // Add virtual asset for Pending Reimbursements
    if (pendingReimbursementsBalance !== 0) {
      assList.push({
        id: 'virtual_pending_reimbursements',
        name: 'Pending Reimbursements (Client)',
        type: 'other_asset',
        openingBalance: pendingReimbursementsBalance,
        createdAt: 0
      });
    }


    // Add virtual liability for Pending Client Advances
    if (pendingAdvancesBalance > 0) {
      liabList.push({
        id: 'virtual_pending_advances',
        name: 'Client Advances (Unspent)',
        type: 'credit_card', // using credit_card just to put it in liabilities
        openingBalance: pendingAdvancesBalance,
        createdAt: 0
      });
    } else if (pendingAdvancesBalance < 0) {
       assList.push({
        id: 'virtual_overspent_advances',
        name: 'Overspent Client Advances',
        type: 'other_asset',
        openingBalance: Math.abs(pendingAdvancesBalance),
        createdAt: 0
      });
    }
    return { assets: assList, liabilities: liabList };
  }, [paymentAccounts, pendingReimbursementsBalance, pendingAdvancesBalance]);

  // Auto-generate EMI bills
  useEffect(() => {
    if (loading || !paymentAccounts.length) return;

    const generateEmis = async () => {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const currentDay = today.getDate();

      for (const acc of paymentAccounts) {
        if (acc.type === 'loan' && acc.isEmiPayable && acc.emiAmount) {
          const dueDay = acc.emiDueDate ? parseInt(acc.emiDueDate, 10) : 1;
          
          let targetMonth = currentMonth;
          let targetYear = currentYear;
          
          if (acc.createdAt) {
            const createdDate = new Date(acc.createdAt);
            const isCreatedThisMonth = createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
            
            // Start EMI from next month if due date is before the creation date in the current month
            if (isCreatedThisMonth && dueDay < createdDate.getDate()) {
              targetMonth = currentMonth + 1;
              if (targetMonth > 11) {
                targetMonth = 0;
                targetYear++;
              }
            }
          }

          const hasEmiTargetMonth = records.some(rec => 
            rec.paymentAccountId === acc.id && 
            rec.category === 'Loan EMI' && 
            new Date(rec.date).getMonth() === targetMonth &&
            new Date(rec.date).getFullYear() === targetYear
          );

          if (!hasEmiTargetMonth) {
            const dueDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

            try {
              await financeService.createRecord({
                type: 'expense',
                amount: acc.emiAmount,
                category: 'Loan EMI',
                description: `EMI for ${acc.name}`,
                date: dueDateStr,
                status: 'pending',
                scope: 'business',
                paymentAccountId: acc.id
              });
            } catch (err) {
              console.error("Failed to auto-generate EMI", err);
            }
          }
        }
      }
    };

    generateEmis();
  }, [loading, records.length, paymentAccounts.length]);

  const payablesChartData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();

    const result = [];
    for (let i = 0; i < 6; i++) {
      result.push({
        name: `${monthNames[currentMonth]} ${currentYear}`,
        amount: 0,
        monthStr: String(currentMonth + 1).padStart(2, '0'),
        yearStr: String(currentYear)
      });

      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }

    records.forEach(rec => {
      if (rec.type === 'expense' && (rec.status === 'pending' || rec.status === 'overdue') && !rec.isReimbursed && !rec.isReceivableFromClient) {
        const recScope = rec.scope || "business";
        if (selectedScope !== "all" && recScope !== selectedScope) return;
        
        const recYear = rec.date.split("-")[0];
        const recMonth = rec.date.split("-")[1];
        
        const targetObj = result.find(r => r.monthStr === recMonth && r.yearStr === recYear);
        if (targetObj) {
          targetObj.amount += rec.amount;
        }
      }
    });

    return result;
  }, [records, selectedScope]);

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
          if (rec.category !== "Reimbursement" && rec.category !== "Advance Received") {
            totalIncome += rec.amount;
            if (rec.status === "pending" || rec.status === "overdue") {
              pendingInvoicesVal += rec.amount;
            }
          }
        } else if (rec.type === "expense") {
          if (!rec.isReceivableFromClient && !rec.isReimbursed && rec.category !== "Payment from Advance") {
            totalExpense += rec.amount;
          }
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

  // Category-wise spending for the selected year & month (to compare with budgets)
  const categorySpending = useMemo(() => {
    const spending: { [category: string]: number } = {};
    records.forEach(rec => {
      if (rec.type !== "expense") return;
      if (rec.isReceivableFromClient || rec.isReimbursed) return;

      const recYear = rec.date.split("-")[0];
      const recMonth = rec.date.split("-")[1];

      // Year matching
      if (recYear !== selectedYear) return;

      // Month matching
      if (selectedMonth !== "All") {
        const monthNum = {
          "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
          "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
          "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
        }[selectedMonth];
        if (recMonth !== monthNum) return;
      }

      const cat = rec.category || "Miscellaneous";
      spending[cat] = (spending[cat] || 0) + rec.amount;
    });
    return spending;
  }, [records, selectedYear, selectedMonth]);

  // Generate data for Recharts Bar/Area Chart (Grouped by Month & Scope)
  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    return months.map((m, index) => {
      const monthStr = String(index + 1).padStart(2, "0");
      let income = 0;
      let expense = 0;
      let pendingInvoices = 0;
      let pendingReimbursements = 0;

      records.forEach(rec => {
        const recScope = rec.scope || "business";
        if (selectedScope !== "all" && recScope !== selectedScope) return;

        const recYear = rec.date.split("-")[0];
        const recMonth = rec.date.split("-")[1];
        if (recYear === selectedYear && recMonth === monthStr) {
          if (rec.type === "income") {
            if (rec.category !== "Reimbursement" && rec.category !== "Advance Received") {
              income += rec.amount;
              if (rec.status === "pending" || rec.status === "overdue") {
                pendingInvoices += rec.amount;
              }
            }
          }
          else if (rec.type === "expense") {
            if (!rec.isReceivableFromClient && !rec.isReimbursed && rec.category !== "Payment from Advance") {
              expense += rec.amount;
            }
            if (rec.isReceivableFromClient) {
              pendingReimbursements += rec.amount;
            }
          }
        }
      });

      return {
        month: m,
        Income: income,
        Expense: expense,
        Net: income - expense,
        PendingInvoices: pendingInvoices,
        PendingReimbursements: pendingReimbursements,
        TotalPending: pendingInvoices + pendingReimbursements
      };
    });
  }, [records, selectedYear, selectedScope]);

  // Category Breakdown for Pie Charts (Current Filters applied)
  const { incomeChartData, expenseChartData } = useMemo(() => {
    const incomeTotals: { [name: string]: number } = {};
    const expenseTotals: { [name: string]: number } = {};

    filteredRecords.forEach(rec => {
      if (rec.type === "transfer") return;
      if (rec.type === "income") {
        if (rec.category !== "Reimbursement" && rec.category !== "Advance Received") {
          incomeTotals[rec.category] = (incomeTotals[rec.category] || 0) + rec.amount;
        }
      } else if (rec.type === "expense") {
        if (!rec.isReceivableFromClient && !rec.isReimbursed && rec.category !== "Payment from Advance") {
          expenseTotals[rec.category] = (expenseTotals[rec.category] || 0) + rec.amount;
        }
      }
    });

    return {
      incomeChartData: Object.keys(incomeTotals).map(name => ({ name, value: incomeTotals[name] })),
      expenseChartData: Object.keys(expenseTotals).map(name => ({ name, value: expenseTotals[name] }))
    };
  }, [filteredRecords]);

  const executeExport = () => {
    let recordsToExport = records;

    // Filter by report type
    if (exportReportType === "expenses") {
      recordsToExport = recordsToExport.filter(r => r.type === "expense" && r.status === "paid");
    } else if (exportReportType === "income") {
      recordsToExport = recordsToExport.filter(r => r.type === "income" && r.status === "paid");
    } else if (exportReportType === "payable") {
      recordsToExport = recordsToExport.filter(r => r.type === "expense" && r.status !== "paid");
    } else if (exportReportType === "receivables") {
      recordsToExport = recordsToExport.filter(r => r.type === "income" && r.status !== "paid");
    }

    // Filter by period
    if (exportPeriod !== "all") {
      let sDate = new Date();
      let eDate = new Date();
      if (exportPeriod === "this_month") {
        sDate.setDate(1);
        eDate.setMonth(eDate.getMonth() + 1);
        eDate.setDate(0);
      } else if (exportPeriod === "last_month") {
        sDate.setMonth(sDate.getMonth() - 1);
        sDate.setDate(1);
        eDate.setDate(0);
      } else if (exportPeriod === "custom") {
        sDate = new Date(exportStartDate);
        eDate = new Date(exportEndDate);
      }
      
      const sDateStr = sDate.toISOString().split("T")[0];
      const eDateStr = eDate.toISOString().split("T")[0];

      recordsToExport = recordsToExport.filter(r => {
        return r.date >= sDateStr && r.date <= eDateStr;
      });
    }

    if (exportFormat === "excel") {
      handleExportExcel(recordsToExport);
    } else {
      handleExportPDF(recordsToExport);
    }
    setIsExportModalOpen(false);
  };

  // Export CSV of Filtered Records
  const handleExportCSV = (recordsToExport: FinanceRecord[] = filteredRecords) => {
    if (recordsToExport.length === 0) {
      toast.error("No transactions available to export.");
      return;
    }

    const headers = ["ID", "Type", "Category", "Amount", "Description", "Date", "Status", "Client Name", "Source Account", "Destination Account"];
    const rows = recordsToExport.map(rec => {
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

  // Export Excel of Filtered Records
  const handleExportExcel = (recordsToExport: FinanceRecord[] = filteredRecords) => {
    if (recordsToExport.length === 0) {
      toast.error("No transactions available to export.");
      return;
    }

    const headers = ["ID", "Type", "Category", "Amount (INR)", "Description", "Date", "Status", "Client Name", "Source Account", "Destination Account"];
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Finance Transactions</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->`;
    html += `<style>
      table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin-top: 20px; }
      th { background-color: #0f172a; color: #ffffff; font-weight: bold; padding: 12px 10px; border: 1px solid #e2e8f0; text-align: left; }
      td { padding: 10px 8px; border: 1px solid #e2e8f0; font-size: 13px; color: #334155; }
      .header-title { font-size: 20px; font-weight: bold; color: #0f172a; }
      .header-meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
      .number { text-align: right; mso-number-format:"\\#\\,\\#\\#0\\.00"; }
      .text { text-align: left; }
      .type-income { color: #059669; font-weight: bold; }
      .type-expense { color: #dc2626; font-weight: bold; }
      .type-transfer { color: #2563eb; font-weight: bold; }
    </style></head><body>`;

    html += `<div class="header-title">CA JYOSHI MANOHAR - FINANCIAL LEDGER REGISTER</div>`;
    html += `<div class="header-meta">Generated on ${new Date().toLocaleDateString()} | Filter: ${selectedMonth}/${selectedYear} | Total Records: ${filteredRecords.length}</div>`;
    html += `<table><thead><tr>`;
    headers.forEach(h => {
      html += `<th>${h}</th>`;
    });
    html += `</tr></thead><tbody>`;

    filteredRecords.forEach(rec => {
      const sourceAcc = paymentAccounts.find(a => a.id === rec.paymentAccountId)?.name || "";
      const destAcc = paymentAccounts.find(a => a.id === rec.transferToAccountId)?.name || "";
      const typeStyle = rec.type === "income" ? "type-income" : rec.type === "expense" ? "type-expense" : "type-transfer";

      html += `<tr>`;
      html += `<td class="text" style="font-family: monospace;">${rec.id}</td>`;
      html += `<td class="${typeStyle}">${rec.type.toUpperCase()}</td>`;
      html += `<td class="text">${rec.category}</td>`;
      html += `<td class="number">${Number(rec.amount).toFixed(2)}</td>`;
      html += `<td class="text">${rec.description || ""}</td>`;
      html += `<td class="text">${rec.date}</td>`;
      html += `<td class="text" style="text-align: center;">${rec.status.toUpperCase()}</td>`;
      html += `<td class="text">${rec.clientName || "-"}</td>`;
      html += `<td class="text">${sourceAcc}</td>`;
      html += `<td class="text">${destAcc}</td>`;
      html += `</tr>`;
    });

    html += `</tbody></table></body></html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CA_Manohar_Finances_${selectedMonth}_${selectedYear}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel spreadsheet exported successfully!");
  };

  // Export PDF of Filtered Records
  const handleExportPDF = (recordsToExport: FinanceRecord[] = filteredRecords) => {
    if (recordsToExport.length === 0) {
      toast.error("No transactions available to export.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented PDF generation. Please allow popups for this portal.");
      return;
    }

    const symbol = "₹";
    let rowsHtml = "";
    let totalIncome = 0;
    let totalExpense = 0;

    filteredRecords.forEach(rec => {
      if (rec.type === "income") totalIncome += Number(rec.amount);
      if (rec.type === "expense") totalExpense += Number(rec.amount);

      const sourceAcc = paymentAccounts.find(a => a.id === rec.paymentAccountId)?.name || "-";
      const typeColor = rec.type === "income" ? "#10b981" : rec.type === "expense" ? "#ef4444" : "#3b82f6";

      rowsHtml += `
        <tr>
          <td><strong style="font-family: monospace; font-size: 11px;">${rec.id.substring(0, 8)}</strong></td>
          <td><span style="color: ${typeColor}; font-weight: 700; text-transform: uppercase; font-size: 10px;">${rec.type}</span></td>
          <td>${rec.category}</td>
          <td>${rec.description || "-"}</td>
          <td>${rec.date}</td>
          <td style="text-align: right; font-weight: bold; color: ${typeColor};">${symbol}${Number(rec.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td><span style="font-size: 10px; font-weight: 600; text-transform: uppercase;">${rec.status}</span></td>
          <td>${sourceAcc}</td>
        </tr>
      `;
    });

    const netCashflow = totalIncome - totalExpense;

    const htmlContent = `
      <html>
        <head>
          <title>Financial Ledger Summary - CA Jyoshi Manohar</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; background: white; }
            .header-container { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-title { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
            .subtitle { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
            .meta-details { text-align: right; font-size: 12px; color: #475569; line-height: 1.5; }
            .title-section { margin-bottom: 25px; }
            .title-section h1 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; }
            .title-section p { font-size: 12px; color: #64748b; margin: 4px 0 0 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 10px; text-align: left; }
            td { border-bottom: 1px solid #f1f5f9; padding: 12px 10px; font-size: 12px; color: #334155; }
            .totals-container { float: right; width: 320px; margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
            .total-row-grand { font-weight: bold; font-size: 14px; border-bottom: 2px solid #0f172a; padding-top: 12px; color: #0f172a; }
            .footer { position: fixed; bottom: 20px; left: 40px; right: 40px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <div class="logo-title">CA JYOSHI MANOHAR</div>
              <div class="subtitle">Chartered Accountant & Business Advisors</div>
            </div>
            <div class="meta-details">
              <strong>OFFICIAL FINANCIAL STATEMENT</strong><br/>
              Date: ${new Date().toLocaleDateString()}<br/>
              Scope: Real-time Transaction Ledger
            </div>
          </div>

          <div class="title-section">
            <h1>Ledger Balance Sheets</h1>
            <p>Financial ledger statements containing income & expense records corresponding to active accounting clients.</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Date</th>
                <th style="text-align: right;">Amount</th>
                <th>Status</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="total-row">
              <span style="color: #64748b;">Cumulative Inflows (Income):</span>
              <strong style="color: #10b981;">+ ${symbol}${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="total-row">
              <span style="color: #64748b;">Cumulative Outflows (Expenses):</span>
              <strong style="color: #ef4444;">- ${symbol}${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="total-row total-row-grand">
              <span>Net Cash Flow (In-hand):</span>
              <span style="color: ${netCashflow >= 0 ? '#15803d' : '#b91c1c'}">${symbol}${netCashflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="footer">
            CA Jyoshi Manohar Offices • Confidential Statement Report • Page 1 of 1
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 700);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    toast.success("PDF transaction statement generated successfully!");
  };

  // Generate and Print Invoice Summary of selected payables
  const handlePrintInvoice = (recordsToPrint: FinanceRecord[]) => {
    if (recordsToPrint.length === 0) {
      toast.error("No transactions selected for invoice printing.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented invoice generation. Please allow popups for this portal.");
      return;
    }

    const symbol = "₹";
    let rowsHtml = "";
    let grandTotal = 0;

    recordsToPrint.forEach((rec, idx) => {
      grandTotal += Number(rec.amount);
      const sourceAcc = paymentAccounts.find(a => a.id === rec.paymentAccountId)?.name || "Not Specified";
      const statusColor = rec.status === 'paid' ? '#10b981' : rec.status === 'pending' ? '#f59e0b' : '#ef4444';
      
      rowsHtml += `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong>${rec.description || rec.clientName || "General Payable"}</strong>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">ID: ${rec.id}</div>
          </td>
          <td>${rec.category}</td>
          <td>${new Date(rec.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          <td><span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; background-color: ${statusColor}15; color: ${statusColor};">${rec.status}</span></td>
          <td>${sourceAcc}</td>
          <td style="text-align: right; font-weight: 700; color: #1e293b;">${symbol}${Number(rec.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    });

    const isMultiple = recordsToPrint.length > 1;
    const documentTitle = isMultiple ? "CONSOLIDATED PAYMENT SUMMARY" : "PAYMENT INVOICE & ADVICE";
    const documentNo = isMultiple ? `CS-${Date.now().toString().substring(6)}` : `INV-${recordsToPrint[0].id.substring(0, 8).toUpperCase()}`;
    const invoiceDate = isMultiple ? new Date().toLocaleDateString('en-IN') : new Date(recordsToPrint[0].date).toLocaleDateString('en-IN');
    
    // Vendor/Payee details
    const payeeName = isMultiple ? "Various Vendors / Creditors" : (recordsToPrint[0].clientName || "External Service Provider");
    const payeeCategory = isMultiple ? "Multiple Categories" : recordsToPrint[0].category;
    
    const htmlContent = `
      <html>
        <head>
          <title>${documentTitle} - ${documentNo}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { 
              font-family: 'Inter', system-ui, -apple-system, sans-serif; 
              padding: 50px; 
              color: #1e293b; 
              background: white; 
              line-height: 1.5;
            }
            .invoice-card {
              max-width: 850px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02);
            }
            .header-container { 
              display: flex; 
              justify-content: space-between; 
              border-bottom: 2px solid #1a2b58; 
              padding-bottom: 25px; 
              margin-bottom: 30px; 
            }
            .company-details h1 { 
              font-size: 24px; 
              font-weight: 800; 
              color: #1a2b58; 
              margin: 0;
              letter-spacing: -0.5px; 
            }
            .company-details p { 
              font-size: 12px; 
              color: #64748b; 
              margin: 4px 0 0 0;
              font-weight: 500;
            }
            .doc-meta { 
              text-align: right; 
            }
            .doc-meta h2 {
              font-size: 18px;
              font-weight: 800;
              color: #AD8D3E;
              margin: 0 0 8px 0;
              letter-spacing: -0.3px;
            }
            .doc-meta p {
              font-size: 12px;
              color: #475569;
              margin: 2px 0;
            }
            .billing-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .info-block h3 {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #94a3b8;
              margin-top: 0;
              margin-bottom: 10px;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 6px;
            }
            .info-block p {
              font-size: 13px;
              color: #334155;
              margin: 4px 0;
            }
            .info-block .name {
              font-size: 15px;
              font-weight: 700;
              color: #1a2b58;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 40px; 
            }
            th { 
              background-color: #f8fafc; 
              border-bottom: 2px solid #e2e8f0; 
              color: #475569; 
              font-weight: 700; 
              font-size: 10px; 
              text-transform: uppercase; 
              letter-spacing: 0.5px; 
              padding: 14px 12px; 
              text-align: left; 
            }
            td { 
              border-bottom: 1px solid #f1f5f9; 
              padding: 14px 12px; 
              font-size: 12px; 
              color: #334155; 
              vertical-align: middle;
            }
            .totals-container { 
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              margin-top: 20px; 
            }
            .total-table {
              width: 320px;
              margin-bottom: 0;
            }
            .total-table td {
              padding: 8px 12px;
              border: none;
            }
            .grand-total-row {
              font-size: 16px;
              font-weight: 800;
              background-color: #1a2b58;
              color: white !important;
              border-radius: 8px;
            }
            .grand-total-row td {
              color: white !important;
              padding: 12px !important;
            }
            .terms-block {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px dashed #cbd5e1;
            }
            .terms-block h4 {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #475569;
              margin: 0 0 8px 0;
            }
            .terms-block p {
              font-size: 11px;
              color: #64748b;
              margin: 0;
              line-height: 1.6;
            }
            .footer { 
              margin-top: 50px;
              font-size: 10px; 
              color: #94a3b8; 
              text-align: center; 
              border-top: 1px solid #f1f5f9; 
              padding-top: 15px; 
            }
            @media print {
              body { padding: 0; }
              .invoice-card {
                border: none;
                box-shadow: none;
                padding: 0;
              }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-card">
            <div class="header-container">
              <div class="company-details">
                <h1>CA JYOSHI MANOHAR & CO.</h1>
                <p>Chartered Accountants & Business Tax Advisors</p>
                <p style="font-size: 11px; color: #94a3b8; font-weight: normal; margin-top: 2px;">
                  102, Premium Chambers, ICAI Lane, Mumbai - 400001
                </p>
              </div>
              <div class="doc-meta">
                <h2>${documentTitle}</h2>
                <p><strong>Doc Ref:</strong> ${documentNo}</p>
                <p><strong>Date:</strong> ${invoiceDate}</p>
                <p><strong>Currency:</strong> INR (₹)</p>
              </div>
            </div>

            <div class="billing-info">
              <div class="info-block">
                <h3>Issued To (Filer / Client)</h3>
                <p class="name">CA Jyoshi Manohar Offices</p>
                <p>Corporate Finance & Operations Division</p>
                <p>Email: gjyoshimanohar@gmail.com</p>
              </div>
              <div class="info-block">
                <h3>Creditor / Payee Details</h3>
                <p class="name">${payeeName}</p>
                <p>Category: <strong>${payeeCategory}</strong></p>
                <p>Payment Reference: Expense Log Summary</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th>Item / Description</th>
                  <th>Category</th>
                  <th>Due/Tx Date</th>
                  <th>Status</th>
                  <th>Paid Account</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="totals-container">
              <table class="total-table">
                <tr>
                  <td style="color: #64748b; font-weight: 500;">Subtotal:</td>
                  <td style="text-align: right; font-weight: 600;">${symbol}${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 500;">Taxes / Fees:</td>
                  <td style="text-align: right; font-weight: 600;">${symbol}0.00</td>
                </tr>
                <tr class="grand-total-row">
                  <td>Total Payable:</td>
                  <td style="text-align: right;">${symbol}${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </table>
            </div>

            <div class="terms-block">
              <h4>Authorized Signatory & Stamp</h4>
              <p>This is a computer-generated billing statement and payment advice record compiled directly from the office finance book of CA Jyoshi Manohar. It serves as an official proof of payable liabilities or expense drawdowns.</p>
            </div>

            <div class="footer">
              CA Jyoshi Manohar Offices • Confidential Billing Document • Generated on ${new Date().toLocaleString()}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 700);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    toast.success("Payment Invoice PDF generated successfully!");
  };

  const renderLedgerLogsTable = (title: string, subtitle: string, defaultFormTypeToAdd?: "income" | "expense" | "transfer") => {
    const selectedInTable = filteredRecords.filter(rec => selectedRecordIds.includes(rec.id));
    const allSelected = filteredRecords.length > 0 && filteredRecords.every(r => selectedRecordIds.includes(r.id));

    return (
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm mt-6 mb-6">
        {selectedInTable.length > 0 ? (
          <div className="px-6 py-4 border-b border-border bg-indigo-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <span className="text-indigo-700 font-bold text-sm">{selectedInTable.length} record(s) selected</span>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => {
                  setReceiveModalRecords(selectedInTable);
                  setReceiveModalAccountId("");
                  setReceiveModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                Mark as Paid / Received
              </button>
              {activeTab === "payables" && (
                <button 
                  onClick={() => handlePrintInvoice(selectedInTable)}
                  className="bg-primary hover:bg-primary/95 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Invoice
                </button>
              )}
              <button
                onClick={() => {
                  setRecordsToDelete(selectedInTable);
                  setDeleteConfirmModalOpen(true);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
              <button
                onClick={() => setSelectedRecordIds(prev => prev.filter(id => !filteredRecords.some(r => r.id === id)))}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-xs font-semibold transition"
              >
                Clear Selection
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 border-b border-border bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-primary">{title}</h3>
              <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">{filteredRecords.length} records</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer"
                title="Export Reports"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Export</span>
              </button>
              <button
                onClick={() => handleOpenAddModal(defaultFormTypeToAdd)}
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Transaction</span>
              </button>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    checked={allSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newIds = new Set(selectedRecordIds);
                        filteredRecords.forEach(r => newIds.add(r.id));
                        setSelectedRecordIds(Array.from(newIds));
                      } else {
                        const idsToRemove = new Set(filteredRecords.map(r => r.id));
                        setSelectedRecordIds(prev => prev.filter(id => !idsToRemove.has(id)));
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Description</th>
                <th className="px-6 py-3 font-semibold">Category</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold text-right">Amount</th>
                <th className="px-6 py-3 font-semibold text-center">Status</th>
                <th className="px-6 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map(record => (
                <tr key={record.id} className={`hover:bg-slate-50/50 transition ${selectedRecordIds.includes(record.id) ? 'bg-indigo-50/30' : ''}`}>
                  <td className="py-4 px-4 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      checked={selectedRecordIds.includes(record.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRecordIds(prev => [...prev, record.id]);
                        } else {
                          setSelectedRecordIds(prev => prev.filter(id => id !== record.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4">{new Date(record.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{record.description || record.clientName || "-"}</td>
                  <td className="px-6 py-4">{record.category}</td>
                  <td className="px-6 py-4 uppercase text-xs font-bold tracking-wider">{record.type}</td>
                  <td className="px-6 py-4 text-right font-semibold">₹{record.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : record.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center gap-2">
                      {activeTab === "payables" && (
                        <button
                          onClick={() => handlePrintInvoice([record])}
                          className="p-1 text-slate-500 hover:text-primary rounded hover:bg-slate-100 transition"
                          title="Print Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                      {((record.status === "pending" || record.status === "overdue") || (record.type === "expense" && record.isReceivableFromClient)) && (
                        <button
                          onClick={() => handleMarkAsPaid(record)}
                          className="p-1 text-emerald-600 hover:text-emerald-700 rounded hover:bg-slate-100 transition"
                          title={record.type === "expense" && !record.isReceivableFromClient ? "Mark as Paid" : "Mark as Received"}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(record)}
                        className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(record.id)}
                        className="p-1 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

    { /* Pending Receivables Summary Bar */ }
      {totalReceivables > 0 && (
        <div 
          onClick={() => {
            setActiveTab("receivables");
            if (window.innerWidth < 768) setIsSidebarOpen(false);
          }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-fade-in cursor-pointer hover:bg-amber-100 transition-colors group"
        >
           <div className="flex items-center gap-3">
             <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
               <AlertCircle className="w-5 h-5 text-amber-700" />
             </div>
             <div>
               <h3 className="text-amber-900 font-bold tracking-tight">Total Pending Receivables</h3>
               <p className="text-amber-700/80 text-sm font-medium">₹{pendingInvoicesBalance.toLocaleString("en-IN")} Invoices + ₹{pendingReimbursementsBalance.toLocaleString("en-IN")} Reimbursements</p>
             </div>
           </div>
           <div className="flex items-center gap-2">
             <div className="text-2xl font-extrabold text-amber-900 tracking-tight group-hover:scale-105 transition-transform">
               ₹{totalReceivables.toLocaleString("en-IN")}
             </div>
             <ArrowLeftRight className="w-5 h-5 text-amber-600 opacity-50 group-hover:opacity-100 group-hover:-rotate-12 transition-all" />
           </div>
        </div>
      )}

            {/* Pending Payables Summary Bar */}
      {totalPayables > 0 && (
        <div 
          onClick={() => {
            setActiveTab("payables");
            if (window.innerWidth < 768) setIsSidebarOpen(false);
          }}
          className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-fade-in cursor-pointer hover:bg-rose-100 transition-colors group mt-4"
        >
           <div className="flex items-center gap-3">
             <div className="p-2 bg-rose-100 rounded-lg group-hover:bg-rose-200 transition-colors">
               <AlertCircle className="w-5 h-5 text-rose-700" />
             </div>
             <div>
               <h3 className="text-rose-900 font-bold tracking-tight">Total Pending Payables</h3>
               <p className="text-rose-700/80 text-sm font-medium">₹{pendingPayablesBalance.toLocaleString("en-IN")} Expenses</p>
             </div>
           </div>
           <div className="flex items-center gap-2">
             <div className="text-2xl font-extrabold text-rose-900 tracking-tight group-hover:scale-105 transition-transform">
               ₹{totalPayables.toLocaleString("en-IN")}
             </div>
             <ArrowLeftRight className="w-5 h-5 text-rose-600 opacity-50 group-hover:opacity-100 group-hover:-rotate-12 transition-all" />
           </div>
        </div>
      )}

      {/* Client Advances Summary Bar */}
      {(totalAdvancesReceived > 0 || totalPaymentsFromAdvances > 0) && (
        <div 
          onClick={() => {
            setActiveTab("dashboard");
          }}
          className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-fade-in cursor-default hover:bg-indigo-100 transition-colors group mt-4"
        >
           <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
               <AlertCircle className="w-5 h-5 text-indigo-700" />
             </div>
             <div>
               <h3 className="text-indigo-900 font-bold tracking-tight">Client Advances & Deposits</h3>
               <p className="text-indigo-700/80 text-sm font-medium">₹{totalAdvancesReceived.toLocaleString("en-IN")} Received - ₹{totalPaymentsFromAdvances.toLocaleString("en-IN")} Spent</p>
             </div>
           </div>
           <div className="flex flex-col items-end">
             <div className="text-2xl font-extrabold text-indigo-900 tracking-tight group-hover:scale-105 transition-transform flex items-center gap-2">
               ₹{Math.abs(pendingAdvancesBalance).toLocaleString("en-IN")}
               <ArrowLeftRight className="w-5 h-5 text-indigo-600 opacity-50 group-hover:opacity-100 group-hover:-rotate-12 transition-all" />
             </div>
             <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{pendingAdvancesBalance >= 0 ? "Unspent Liability" : "Overspent (Receivable)"}</span>
           </div>
        </div>
      )}

      {/* Mobile/Tablet Header Bar Toggle (screens < md) */}
      <div className="flex md:hidden items-center justify-between w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 mb-3 shadow-sm">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-white transition shadow-xs active:scale-95"
        >
          <Menu className="w-4 h-4 text-amber-400" />
          <span>Open Menu & Filters</span>
        </button>
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          <span>Tab: {activeTab}</span>
        </div>
      </div>

      {/* Responsive Sidebar Layout */}
      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start relative">
        
        {/* Mobile Backdrop Overlay (only < md) */}
        <div 
          className={`fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity md:hidden ${
            isSidebarOpen ? "opacity-100 block" : "opacity-0 hidden"
          }`}
          onClick={() => setIsSidebarOpen(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />

        {/* Side Navigation Bar */}
        <aside 
          className={`
            fixed top-16 bottom-0 left-0 z-50 bg-white border-r border-slate-200 shadow-2xl transition-all duration-300 ease-in-out flex flex-col gap-4 overflow-y-auto md:sticky md:top-6 md:border md:rounded-2xl md:shadow-xs md:z-auto md:bottom-auto shrink-0
            ${isSidebarOpen ? "translate-x-0 w-72 md:w-64 lg:w-60 p-4" : "-translate-x-full md:translate-x-0 w-72 md:w-[80px] lg:w-[84px] p-4"}
          `}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="border-b border-slate-100 flex items-center justify-between transition-all duration-300 pb-3 w-full">
            <span className={`text-xs font-bold uppercase tracking-wider text-slate-800 ${!isSidebarOpen ? "md:hidden" : "block"}`}>
              Menu & Navigation
            </span>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              title="Toggle Sidebar"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto scrollbar-none pb-4 md:pb-0">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Overview & Analytics" },
              { id: "receivables", label: "Receivables", icon: AlertCircle, desc: "Pending Payments" },
              { id: "payables", label: "Payables", icon: AlertCircle, desc: "Pending Outlays" },
              { id: "incomes", label: "Incomes", icon: TrendingUp, desc: "Professional Inflows" },
              { id: "expenses", label: "Expenses", icon: TrendingDown, desc: "Firm Outlays" },
              { id: "account", label: "Account", icon: Wallet, desc: "Assets & Liabilities" },
              { id: "ai_insights", label: "AI Insights", icon: Sparkles, desc: "Smart Advisor & Forecasting" },
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
                    if (window.innerWidth < 768) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className={`group relative flex items-center gap-3 w-full text-left px-3.5 py-3 rounded-xl transition-all font-semibold text-sm whitespace-nowrap shrink-0 border ${
                    isActive
                      ? "bg-slate-900 border-slate-900 text-white shadow-md"
                      : "bg-transparent border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  } ${!isSidebarOpen ? "md:justify-center md:px-0 md:gap-0" : ""}`}
                >
                  <IconComp className={`w-5 h-5 shrink-0 ${isActive ? "text-amber-400" : "text-slate-500 group-hover:text-slate-800"}`} />
                  <div className={`flex flex-col text-left transition-all duration-300 ${isSidebarOpen ? "opacity-100" : "md:opacity-0 md:w-0 overflow-hidden"}`}>
                    <span className="leading-tight font-bold text-sm">{tab.label}</span>
                    <span className={`text-[11px] font-medium mt-0.5 ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                      {tab.desc}
                    </span>
                  </div>
                  {!isSidebarOpen && (
                    <div className="hidden md:block absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-[12px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg border border-slate-700 pointer-events-none">
                      {tab.label}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Dynamic Content Area */}
        <div className="flex-grow w-full min-w-0 space-y-6 relative">
          <div className="absolute -top-1 right-0 flex items-center gap-2 z-10 bg-white/80 backdrop-blur-sm pl-2 pb-1 rounded-bl-lg">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 shadow-sm"
              title="Export Reports"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center justify-center space-x-1.5 bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
      {/* Finance Dimension Selector Tabs */}
      <div className="border-b border-slate-100 pb-px flex overflow-x-auto scrollbar-none pr-[100px] sm:pr-[180px]">
        <div className="flex space-x-6 min-w-max">
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
            <CustomSelect
              value={selectedYear}
              onChange={(val) => setSelectedYear(val)}
              className="bg-accent border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary hover:border-slate-300 hover:shadow-sm cursor-pointer"
              options={yearsList.map(yr => ({ value: yr, label: yr }))}
            />
          </div>

          {/* Month select */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Audit Month</span>
            <CustomSelect
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="bg-accent border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={[
                { value: "All", label: "All Months" },
                ...["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => ({ value: m, label: m }))
              ]}
            />
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
            <CustomSelect
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              className="bg-accent border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary min-w-[120px] hover:border-slate-300 hover:shadow-sm cursor-pointer"
              options={[
                { value: "All", label: "All Categories" },
                ...(selectedScope === "all" || selectedScope === "business" ? [
                  { label: "💼 Corporate Revenue", options: customCategories.businessIncome.map(c => ({ value: c, label: c })) },
                  { label: "💼 Operating Expense", options: customCategories.businessExpense.map(c => ({ value: c, label: c })) }
                ] : []),
                ...(selectedScope === "all" || selectedScope === "personal" ? [
                  { label: "🌸 Personal Inflow", options: customCategories.personalIncome.map(c => ({ value: c, label: c })) },
                  { label: "🌸 Personal Expenses", options: customCategories.personalExpense.map(c => ({ value: c, label: c })) }
                ] : [])
              ]}
            />
          </div>
        </div>

        {/* Right side: Search and Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
          <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
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
          </div>        </div>
      </div>

      {/* Bento Grid Stats Panel */}
      {activeTab === "dashboard" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Metric 1: Income */}
          {(activeTab === "dashboard" || activeTab === "incomes") && (
            <div 
              onClick={() => {
                setActiveTab("incomes");
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className="bg-white border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group col-span-1 sm:col-span-2 lg:col-span-1 cursor-pointer hover:bg-green-50/30 transition-colors"
            >
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
            <div 
              onClick={() => {
                setActiveTab("expenses");
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className="bg-white border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group col-span-1 sm:col-span-2 lg:col-span-1 cursor-pointer hover:bg-red-50/30 transition-colors"
            >
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
            <div 
              onClick={() => {
                setActiveTab("account");
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className="bg-white border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group col-span-1 sm:col-span-2 lg:col-span-1 cursor-pointer hover:bg-amber-50/30 transition-colors"
            >
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
            <div 
              onClick={() => {
                setActiveTab("receivables");
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className="bg-white border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group col-span-1 sm:col-span-2 lg:col-span-1 cursor-pointer hover:bg-blue-50/30 transition-colors"
            >
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
                      const b = accountBalances[acc.id] || { income: 0, expense: 0, current: (!getAccountTypeInfo(acc.type).isAsset && acc.openingBalance > 0) ? -acc.openingBalance : acc.openingBalance };
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
                            
                            <div className="flex items-center gap-1.5 opacity-100 transition-all">
                              {acc.id !== 'virtual_pending_reimbursements' && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditAccountModal(acc)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all shadow-2xs hover:scale-105 active:scale-95"
                                    title="Edit asset account"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAccount(acc.id, acc.name)}
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all shadow-2xs hover:scale-105 active:scale-95"
                                    title="Delete asset account"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
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
                      const b = accountBalances[acc.id] || { income: 0, expense: 0, current: (!getAccountTypeInfo(acc.type).isAsset && acc.openingBalance > 0) ? -acc.openingBalance : acc.openingBalance };
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
                            
                            <div className="flex items-center gap-1.5 opacity-100 transition-all">
                              <button
                                onClick={() => handleOpenEditAccountModal(acc)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all shadow-2xs hover:scale-105 active:scale-95"
                                title="Edit liability account"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAccount(acc.id, acc.name)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all shadow-2xs hover:scale-105 active:scale-95"
                                title="Delete liability"
                              >
                                <Trash2 className="w-4 h-4" />
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
                            
                            {acc.type === 'credit_card' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAdjustCcBalance(acc, outstandingDebt)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors shadow-sm"
                                  title="Adjust Balance"
                                >
                                  <SlidersHorizontal className="w-4 h-4" />
                                  <span className="text-xs font-bold hidden sm:inline">Adjust</span>
                                </button>
                                {outstandingDebt > 0 && (
                                  <button
                                    onClick={() => handlePayCreditCardBill(acc, outstandingDebt)}
                                    className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors shadow-sm"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-xs font-bold">Pay Bill</span>
                                  </button>
                                )}
                              </div>
                            )}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          
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

          <div className="bg-white border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-primary tracking-tight mb-1">Income Distribution</h3>
              <p className="text-xs text-gray-400 mb-4">Sources of professional inflow.</p>
              
              {incomeChartData.length === 0 ? (
                <div className="py-12 text-center text-gray-400 italic text-xs border border-dashed rounded-xl mt-4">
                  No income data matches active filters.
                </div>
              ) : (
                <div className="h-44 w-full relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Income</span>
                    <span className="text-sm font-bold text-primary">{incomeChartData.length} Keys</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                    <PieChart>
                      <Pie
                        data={incomeChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {incomeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {incomeChartData.slice(0, 5).map((entry, index) => {
                const totalVal = incomeChartData.reduce((acc, curr) => acc + curr.value, 0);
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

          <div className="bg-white border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-primary tracking-tight mb-1">Expense Distribution</h3>
              <p className="text-xs text-gray-400 mb-4">Sources of operating outflow.</p>
              
              {expenseChartData.length === 0 ? (
                <div className="py-12 text-center text-gray-400 italic text-xs border border-dashed rounded-xl mt-4">
                  No expense data matches active filters.
                </div>
              ) : (
                <div className="h-44 w-full relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Expenses</span>
                    <span className="text-sm font-bold text-primary">{expenseChartData.length} Keys</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {expenseChartData.slice(0, 5).map((entry, index) => {
                const totalVal = expenseChartData.reduce((acc, curr) => acc + curr.value, 0);
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

      {/* Monthly Budget Targets Alert Panel */}
      {activeTab === "dashboard" && (
        <div className="mt-6 bg-white border border-border p-6 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-primary tracking-tight flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#AD8D3E]" />
                🎯 Monthly Expense Budgets & Alerts
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Real-time tracking of operating outlays against monthly target thresholds for {selectedMonth === "All" ? "Current Month" : selectedMonth} {selectedYear}.
              </p>
            </div>
            <button
              onClick={() => setActiveTab("settings")}
              className="text-xs font-bold text-primary hover:text-[#AD8D3E] flex items-center gap-1 transition px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"
            >
              Configure Budgets
            </button>
          </div>

          {/* Budget Limits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.entries(budgetTargets).map(([cat, limit]) => {
              const spent = categorySpending[cat] || 0;
              const pct = limit > 0 ? Math.min((spent / limit) * 100, 150) : 0;
              const formattedPct = limit > 0 ? Math.round((spent / limit) * 100) : 0;

              let barColor = "bg-emerald-500";
              let textColor = "text-emerald-600";
              let cardBg = "bg-emerald-50/10 border-emerald-100";
              let iconAlert = "✅ Within Limit";

              if (formattedPct >= 100) {
                barColor = "bg-rose-500";
                textColor = "text-rose-600";
                cardBg = "bg-rose-50/20 border-rose-100";
                iconAlert = "⚠️ Overbudget!";
              } else if (formattedPct >= 80) {
                barColor = "bg-amber-500";
                textColor = "text-amber-600";
                cardBg = "bg-amber-50/20 border-amber-100";
                iconAlert = "⚠️ Nearing Limit";
              }

              return (
                <div key={cat} className={`p-4 rounded-xl border transition-all ${cardBg}`}>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-xs font-bold text-primary truncate max-w-[150px]">{cat}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${textColor} bg-white border border-current`}>
                      {iconAlert}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline gap-2 mb-2">
                    <span className="text-lg font-extrabold text-primary">₹{spent.toLocaleString("en-IN")}</span>
                    <span className="text-xs text-gray-500">of ₹{limit.toLocaleString("en-IN")} ({formattedPct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Receivables Analytics Row */}
      {activeTab === "dashboard" && (
        <div className="mt-6 bg-white border border-border p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-primary tracking-tight">Pending Receivables Trend</h3>
              <p className="text-xs text-gray-400">Monthly breakdown of pending invoices and reimbursements for {selectedYear}.</p>
            </div>
            <div className="flex space-x-3 text-xs">
              <span className="flex items-center gap-1 font-semibold text-primary">
                <span className="w-3 h-3 bg-blue-500 rounded" /> Invoices
              </span>
              <span className="flex items-center gap-1 font-semibold text-primary">
                <span className="w-3 h-3 bg-amber-500 rounded" /> Reimbursements
              </span>
            </div>
          </div>

          <div className="h-72 w-full text-xs font-medium">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b" }} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const total = payload.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-lg">
                          <p className="text-white font-bold text-sm mb-2">{label} {selectedYear}</p>
                          {payload.map((entry, index) => (
                            <div key={index} className="flex justify-between items-center gap-4 mb-1 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                {entry.name === "PendingInvoices" ? "Pending Invoices" : "Reimbursements"}
                              </div>
                              <span className="font-semibold text-white">
                                ₹{Number(entry.value).toLocaleString("en-IN")}
                              </span>
                            </div>
                          ))}
                          <div className="border-t border-slate-700 mt-2 pt-2 flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Total Pending</span>
                            <span className="text-white font-bold">₹{total.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="PendingInvoices" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey="PendingReimbursements" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab-Specific Ledger Content */}
      {activeTab === "payables" && (
        <div className="flex flex-col gap-6">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-100/80 rounded-xl">
                 <AlertCircle className="w-7 h-7 text-rose-700" />
              </div>
              <div>
                <h3 className="text-rose-900 font-bold tracking-tight text-lg">Total Outstanding Payables</h3>
                <p className="text-rose-700/80 text-sm font-medium mt-0.5">Sum of all pending and overdue active payables</p>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-center gap-4">
              <button 
                onClick={() => setAddCcBillModalOpen(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" /> Add CC Bill
              </button>
              <div className="px-5 py-3 bg-white rounded-xl shadow-sm border border-rose-100 flex items-center justify-center min-w-[200px]">
               <AnimatePresence mode="popLayout">
                 <motion.div 
                   key={pendingPayablesBalance}
                   initial={{ scale: 0.8, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   exit={{ scale: 1.1, opacity: 0, position: 'absolute' }}
                   transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                   className="text-3xl font-extrabold text-rose-900 tracking-tight"
                 >
                   ₹{pendingPayablesBalance.toLocaleString("en-IN")}
                 </motion.div>
               </AnimatePresence>
            </div>
            </div>
          </div>
          
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-500" />
              Payables Cash Flow Projection (Next 6 Months)
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payablesChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, 'Amount']}
                  />
                  <Bar dataKey="amount" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {renderLedgerLogsTable("Pending Payables", "All outstanding expenses and outlays")}
        </div>
      )}
      {activeTab === "receivables" && renderLedgerLogsTable("Pending Receivables", "All outstanding invoices and reimbursements")}
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
              <div className="overflow-x-auto"><table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-border text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    <th className="py-4 px-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        checked={records.slice(-5).length > 0 && selectedRecordIds.length === records.slice(-5).length && records.slice(-5).every(r => selectedRecordIds.includes(r.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const newIds = new Set(selectedRecordIds);
                            records.slice(-5).forEach(r => newIds.add(r.id));
                            setSelectedRecordIds(Array.from(newIds));
                          } else {
                            const idsToRemove = new Set(records.slice(-5).map(r => r.id));
                            setSelectedRecordIds(prev => prev.filter(id => !idsToRemove.has(id)));
                          }
                        }}
                      />
                    </th>
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
                      <tr key={rec.id} className={`transition-colors ${selectedRecordIds.includes(rec.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'}`}>
                        <td className="py-4 px-4 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            checked={selectedRecordIds.includes(rec.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRecordIds(prev => [...prev, rec.id]);
                              } else {
                                setSelectedRecordIds(prev => prev.filter(id => id !== rec.id));
                              }
                            }}
                          />
                        </td>
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
                          <div className="flex items-center justify-center gap-1.5">
                            <AnimatePresence mode="popLayout">
                              <motion.span
                                key={rec.status}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8, position: 'absolute' }}
                                transition={{ duration: 0.2 }}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  rec.status === "paid" 
                                    ? "bg-green-50 text-green-700 border border-green-200" 
                                    : rec.status === "overdue"
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-yellow-50 text-yellow-800 border border-yellow-200"
                                }`}
                              >
                                {rec.status === "paid" && <Check className="w-2.5 h-2.5" />}
                                {rec.status === "pending" && <AlertCircle className="w-2.5 h-2.5" />}
                                {rec.status === "overdue" && <AlertCircle className="w-2.5 h-2.5" />}
                                {rec.status}
                              </motion.span>
                            </AnimatePresence>
                            {((rec.status === "pending" || rec.status === "overdue") || (rec.type === "expense" && rec.isReceivableFromClient)) && (
                              <button
                                onClick={() => handleMarkAsPaid(rec)}
                                title={rec.type === "expense" && !rec.isReceivableFromClient ? "Mark as Paid" : "Mark as Received"} className="p-1 rounded-full text-green-600 hover:bg-green-100 hover:text-green-700 transition"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
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
              </table></div>
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
                  <CustomSelect
                    value={categoryManageType}
                    onChange={(val) => setCategoryManageType(val as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm transition"
                    options={[
                      { value: "businessIncome", label: "Office / Corporate - Income" },
                      { value: "businessExpense", label: "Office / Corporate - Expense" },
                      { value: "personalIncome", label: "Personal - Income" },
                      { value: "personalExpense", label: "Personal - Expense" }
                    ]}
                  />
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
                      className="bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-4 rounded-xl text-sm font-semibold transition shadow-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Manage Expense Budgets & Target Limits */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h4 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#AD8D3E]" />
                🎯 Monthly Expense Budgets
              </h4>

              <div className="space-y-4">
                {/* Category Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Select Expense Category
                  </label>
                  <CustomSelect
                    value={budgetCategorySelect}
                    onChange={(val) => setBudgetCategorySelect(val)}
                    placeholder="Choose category..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary transition hover:border-slate-300 hover:shadow-sm"
                    options={[
                      ...customCategories.businessExpense,
                      ...customCategories.personalExpense
                    ].map(cat => ({ value: cat, label: cat }))}
                  />
                </div>

                {/* Amount input */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Monthly Target Threshold (INR)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 15000"
                      value={budgetAmountInput}
                      onChange={(e) => setBudgetAmountInput(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-8 pr-4 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary transition"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (!budgetCategorySelect || !budgetAmountInput) {
                      toast.error("Please select a category and specify a valid budget amount.");
                      return;
                    }
                    const amt = parseFloat(budgetAmountInput);
                    if (isNaN(amt) || amt <= 0) {
                      toast.error("Please enter a valid positive numerical amount.");
                      return;
                    }
                    setBudgetTargets(prev => ({
                      ...prev,
                      [budgetCategorySelect]: amt
                    }));
                    setBudgetCategorySelect("");
                    setBudgetAmountInput("");
                    toast.success(`Successfully set ₹${amt.toLocaleString("en-IN")} monthly budget for "${budgetCategorySelect}"`);
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Save Budget Limit
                </button>

                {/* Active Budgets List */}
                <div className="pt-4 border-t border-slate-200 mt-4">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                    Configured Budget Limits
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {Object.entries(budgetTargets).map(([cat, limit]) => (
                      <div key={cat} className="flex justify-between items-center bg-white border border-slate-150 px-3 py-2 rounded-lg text-xs">
                        <div className="truncate pr-2">
                          <span className="font-semibold text-primary block truncate">{cat}</span>
                          <span className="text-[10px] text-gray-400 font-medium">Limit: ₹{limit.toLocaleString("en-IN")}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setBudgetTargets(prev => {
                              const updated = { ...prev };
                              delete updated[cat];
                              return updated;
                            });
                            toast.success(`Removed budget limit for "${cat}"`);
                          }}
                          className="text-slate-400 hover:text-rose-500 transition p-1"
                          title="Remove Budget Target"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {Object.keys(budgetTargets).length === 0 && (
                      <p className="text-xs text-slate-400 italic text-center py-2">No budget targets active.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Tab Content */}
      {activeTab === "ai_insights" && (
        <div className="bg-white border border-border p-6 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-primary tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                🧠 AI Financial Advisor & Fractional CFO
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Advanced AI diagnostics, automated category analysis, and collection optimization strategies for your firm.
              </p>
            </div>
            {aiInsights && (
              <button
                onClick={() => {
                  setAiInsights("");
                  toast.success("Cleared AI advisory history.");
                }}
                className="text-xs font-semibold text-slate-500 hover:text-rose-500 transition px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                Clear Insights History
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Quick Questions & Custom Chat Panel */}
            <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-5 h-fit">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Quick Diagnostics
              </h4>
              
              <div className="space-y-2 mb-5">
                <button
                  onClick={() => fetchAiInsights("")}
                  disabled={aiLoading}
                  className="w-full text-left bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-xs font-semibold text-primary transition-all flex items-center justify-between group shadow-xs"
                >
                  <span>✨ Full CFO Financial Review</span>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => fetchAiInsights("Analyze our highest expense categories and list exactly 3 concrete, realistic strategies to reduce or optimize our overhead.")}
                  disabled={aiLoading}
                  className="w-full text-left bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-xs font-semibold text-primary transition-all flex items-center justify-between group shadow-xs"
                >
                  <span>📉 Analyze & Optimize Expenses</span>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => fetchAiInsights("Based on our current pending receivables, what specific collections/invoicing strategy can we use to accelerate payment recovery?")}
                  disabled={aiLoading}
                  className="w-full text-left bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-xs font-semibold text-primary transition-all flex items-center justify-between group shadow-xs"
                >
                  <span>📈 Accelerate Invoice Recovery</span>
                  <FileText className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => fetchAiInsights("Based on our current pending payables, what strategy can we use to optimize our cash flow and manage these expenses?")}
                  disabled={aiLoading}
                  className="w-full text-left bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-xs font-semibold text-primary transition-all flex items-center justify-between group shadow-xs"
                >
                  <span>💸 Manage Payables & Cash Flow</span>
                  <FileText className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => fetchAiInsights("Estimate our financial trajectory/forecast for the next 3 months based on current spending and earning patterns.")}
                  disabled={aiLoading}
                  className="w-full text-left bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl p-3 text-xs font-semibold text-primary transition-all flex items-center justify-between group shadow-xs"
                >
                  <span>🔮 Three-Month Cash Flow Projection</span>
                  <Calendar className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Ask Your Custom CFO Question
                </label>
                <textarea
                  rows={4}
                  placeholder="Ask any financial question, e.g. 'Can we afford hiring another staff member next month?' or 'How does my net cash flow compare with last year?'"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-primary outline-none focus:ring-1 focus:ring-primary resize-none transition"
                />
                <button
                  onClick={() => fetchAiInsights()}
                  disabled={aiLoading || !aiQuestion.trim()}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm mt-3 flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-[#AD8D3E]" />
                  )}
                  <span>{aiLoading ? "AI is Calculating..." : "Ask AI Advisor"}</span>
                </button>
              </div>
            </div>

            {/* Generated Advisory Report Panel */}
            <div className="lg:col-span-8 border border-slate-200 rounded-xl p-6 min-h-[450px] flex flex-col justify-between bg-white shadow-xs">
              {aiLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-indigo-500 animate-pulse" />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm mb-1">Synthesizing Ledger Intelligence</h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Our AI model is cross-referencing professional receipts, client outlays, and pending account reserves...
                  </p>
                </div>
              ) : aiError ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-rose-500">
                  <AlertCircle className="w-12 h-12 mb-3" />
                  <h4 className="font-bold text-sm mb-1">Diagnostics Interrupted</h4>
                  <p className="text-xs text-rose-400 max-w-sm">{aiError}</p>
                </div>
              ) : aiInsights ? (
                <div className="flex-grow overflow-y-auto max-h-[600px] pr-2 scrollbar-thin">
                  <div className="markdown-body prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed space-y-4">
                    <Markdown>{aiInsights}</Markdown>
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 bg-indigo-50 rounded-full text-indigo-500 mb-4 animate-bounce">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-700 text-sm mb-1">Financial Intelligence Center</h4>
                  <p className="text-xs text-slate-400 max-w-sm mb-6">
                    Connect transaction ledgers and category structures with custom diagnostics to explore performance, tax optimizations, and advisory strategies.
                  </p>
                  <button
                    onClick={() => fetchAiInsights("")}
                    className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-[#AD8D3E]" /> Run Initial Diagnostic Review
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl"
          >
            <span className="text-sm font-medium">{toastMessage}</span>
            <div className="h-4 w-px bg-gray-700 mx-1"></div>
            {undoAction && (
              <button
                onClick={undoAction}
                className="text-indigo-300 hover:text-indigo-200 text-sm font-bold tracking-wide uppercase px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
              >
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

            {/* Export Options Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center">
                  <Download className="w-4 h-4 mr-2 text-primary" />
                  Export Reports
                </h3>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5 overflow-y-auto">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Select Report
                  </label>
                  <CustomSelect
                    value={exportReportType}
                    onChange={(val) => setExportReportType(val as any)}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 transition"
                    options={[
                      { value: "expenses", label: "Expenses" },
                      { value: "income", label: "Income" },
                      { value: "payable", label: "Payables" },
                      { value: "receivables", label: "Receivables" },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Period
                  </label>
                  <CustomSelect
                    value={exportPeriod}
                    onChange={(val) => { setExportPeriod(val as any); if (val === "custom") setShowDatePicker(true); }}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 transition"
                    options={[
                      { value: "all", label: "All Time" },
                      { value: "this_month", label: "This Month" },
                      { value: "last_month", label: "Last Month" },
                      { value: "custom", label: "Custom Date Range" },
                    ]}
                  />
                </div>

                {exportPeriod === "custom" && (
                  <div className="flex flex-col bg-slate-50/50 border border-slate-200 rounded-xl p-4 overflow-y-auto max-h-[320px] custom-scrollbar">
                    {exportStartDate && exportEndDate && !showDatePicker ? (
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-700">
                          {exportStartDate} to {exportEndDate}
                        </div>
                        <button 
                          type="button"
                          onClick={() => setShowDatePicker(true)}
                          className="text-xs text-primary font-bold uppercase tracking-wider hover:underline"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <>
                        <style>{`
                          .rdp {
                            --rdp-cell-size: 32px;
                            --rdp-accent-color: #0f172a;
                            --rdp-background-color: #f1f5f9;
                            margin: 0;
                          }
                          .rdp-day_selected {
                            font-weight: bold;
                          }
                        `}</style>
                        <DayPicker
                          mode="range"
                          min={1}
                          selected={{
                            from: exportStartDate ? parseISO(exportStartDate) : undefined,
                            to: exportEndDate ? parseISO(exportEndDate) : undefined,
                          }}
                          onSelect={(range) => {
                            const fromStr = range?.from ? format(range.from, "yyyy-MM-dd") : "";
                            const toStr = range?.to ? format(range.to, "yyyy-MM-dd") : "";
                            setExportStartDate(fromStr);
                            setExportEndDate(toStr);
                            if (fromStr && toStr) {
                              setShowDatePicker(false);
                            }
                          }}
                          className="p-0 border-0 self-center"
                        />
                      </>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Format
                  </label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="exportFormat"
                        value="excel"
                        checked={exportFormat === "excel"}
                        onChange={() => setExportFormat("excel")}
                        className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition flex items-center">
                        <FileSpreadsheet className="w-4 h-4 mr-1 text-emerald-650" /> Excel
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="exportFormat"
                        value="pdf"
                        checked={exportFormat === "pdf"}
                        onChange={() => setExportFormat("pdf")}
                        className="w-4 h-4 text-red-600 border-slate-300 focus:ring-red-500"
                      />
                      <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition flex items-center">
                        <FileText className="w-4 h-4 mr-1 text-red-600" /> PDF
                      </span>
                    </label>
                  </div>
                </div>

              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={executeExport}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-sm flex items-center"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Generate Export
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mark as Received Account Selection Modal */}
      <AnimatePresence>

      {receiveModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setReceiveModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-visible flex flex-col max-h-full"
            >
              
              {syncing && (
                <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                  <RefreshCw className="w-10 h-10 text-primary animate-spin mb-4" />
                  <p className="text-lg font-bold text-slate-800">Updating balances...</p>
                  <p className="text-sm text-slate-500 mt-1">Please wait a moment</p>
                </div>
              )}
              <div className="px-6 py-5 border-b border-border bg-slate-50 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
                {/* Dynamic modal content based on action type */}
                <h3 className="text-lg font-bold text-primary tracking-tight">
                  {receiveModalRecords.length > 0 && receiveModalRecords[0].type === "expense" && !receiveModalRecords[0].isReceivableFromClient 
                    ? "Mark as Paid" 
                    : "Mark as Received"}
                </h3>
                <button 
                  onClick={() => setReceiveModalOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-visible">
                <p className="text-sm text-slate-600 mb-4">
                  
                You are marking {receiveModalRecords.length} record(s) as {receiveModalRecords.length > 0 && receiveModalRecords[0].type === "expense" && !receiveModalRecords[0].isReceivableFromClient ? "paid" : "received"}. Please select the account {receiveModalRecords.length > 0 && receiveModalRecords[0].type === "expense" && !receiveModalRecords[0].isReceivableFromClient ? "from which the funds were paid" : "where the funds were credited"}.
                </p>
                <div>
                  
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {receiveModalRecords.length > 0 && receiveModalRecords[0].type === "expense" && !receiveModalRecords[0].isReceivableFromClient 
                    ? "Paid from Account" 
                    : "Credit to Account"}
                </label>
                  <CustomSelect
                    value={receiveModalAccountId}
                    onChange={(val) => setReceiveModalAccountId(val)}
                    placeholder="Select receiving account..."
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary transition hover:border-slate-300 hover:shadow-sm"
                    options={paymentAccounts.filter(a => a.id !== 'virtual_pending_reimbursements').map(acc => ({
                      value: acc.id,
                      label: `${acc.name} (₹${(accountBalances[acc.id]?.current ?? acc.openingBalance).toLocaleString("en-IN")})`
                    }))}
                  />
                </div>
              </div>
              <div className="p-4 border-t border-border bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                <button
                  onClick={() => setReceiveModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmMarkAsReceived}
                  disabled={syncing}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                >
                  {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {syncing ? "Updating..." : "Confirm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch / Single Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setDeleteConfirmModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-visible flex flex-col max-h-full border border-slate-100 text-left"
            >
              {syncing && (
                <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                  <RefreshCw className="w-10 h-10 text-rose-600 animate-spin mb-4" />
                  <p className="text-lg font-bold text-slate-800">Deleting transaction(s)...</p>
                  <p className="text-sm text-slate-500 mt-1">Please wait a moment</p>
                </div>
              )}
              <div className="px-6 py-5 border-b border-rose-100 bg-rose-50/50 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
                <h3 className="text-lg font-bold text-rose-950 tracking-tight flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                  Delete Transaction(s)
                </h3>
                <button 
                  onClick={() => setDeleteConfirmModalOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[300px] custom-scrollbar">
                <p className="text-sm text-slate-600 mb-4 font-medium">
                  Are you sure you want to permanently delete the following <span className="font-bold text-rose-700">{recordsToDelete.length} record(s)</span>? This action cannot be undone.
                </p>
                <div className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  {recordsToDelete.map((rec) => (
                    <div key={rec.id} className="flex justify-between items-center text-xs text-slate-700 font-semibold bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                      <div className="truncate max-w-[240px]">
                        <span className="font-bold text-[#1a2b58] mr-1.5 font-mono">
                          [{rec.type.toUpperCase()}]
                        </span>
                        <span>{rec.description || rec.clientName || "General Log"}</span>
                      </div>
                      <span className="font-extrabold text-rose-600 shrink-0">
                        ₹{rec.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-border bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                <button
                  onClick={() => setDeleteConfirmModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDeleteTransactions}
                  disabled={syncing}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                >
                  {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} {syncing ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

{/* Adjust Credit Card Balance Modal */}
      <AnimatePresence>
        {adjustCcBalanceModalOpen && adjustCcAccount && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div 
              onClick={() => setAdjustCcBalanceModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col overflow-hidden text-left"
            >
              <div className="flex justify-between items-center border-b border-border p-4 bg-slate-50/50">
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                  Adjust CC Balance
                </h3>
                <button 
                  onClick={() => setAdjustCcBalanceModalOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <p className="text-xs text-indigo-800 font-medium">
                    Manually adjust the ledger balance for <span className="font-bold">{adjustCcAccount.name}</span>. This creates a correction entry to account for missing interest charges, EMIs, or fees.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Current Debt
                    </label>
                    <div className="bg-slate-100 rounded-xl py-2.5 px-3 border border-slate-200">
                      <span className="text-sm font-semibold text-slate-500">₹{adjustCcCurrentBalance.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Actual Debt
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={adjustCcNewBalance}
                        onChange={(e) => setAdjustCcNewBalance(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-8 pr-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:border-primary transition shadow-sm"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Reason / Description
                  </label>
                  <input
                    type="text"
                    value={adjustCcReason}
                    onChange={(e) => setAdjustCcReason(e.target.value)}
                    placeholder="Interest / EMI / Fee Adjustment"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:border-primary transition shadow-sm"
                  />
                </div>
                
                {Math.abs(parseFloat(adjustCcNewBalance)) !== adjustCcCurrentBalance && !isNaN(parseFloat(adjustCcNewBalance)) && (
                  <div className="pt-2">
                    <p className="text-xs text-slate-500 font-medium">
                      A <span className="font-bold text-slate-700">{Math.abs(parseFloat(adjustCcNewBalance)) > adjustCcCurrentBalance ? "Debit (Expense)" : "Credit (Income)"}</span> entry of <span className="font-bold text-slate-700">₹{Math.abs(Math.abs(parseFloat(adjustCcNewBalance)) - adjustCcCurrentBalance).toLocaleString("en-IN")}</span> will be created.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-border bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                <button
                  onClick={() => setAdjustCcBalanceModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAdjustCcBalance}
                  disabled={syncing || isNaN(parseFloat(adjustCcNewBalance)) || Math.abs(parseFloat(adjustCcNewBalance)) === adjustCcCurrentBalance}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                >
                  {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {syncing ? "Saving..." : "Update Balance"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

{/* Add Credit Card Bill Modal */}
      <AnimatePresence>
        {addCcBillModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div 
              onClick={() => setAddCcBillModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col overflow-hidden text-left"
            >
              <div className="flex justify-between items-center border-b border-border p-4 bg-slate-50/50">
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-rose-600" />
                  Add Credit Card Bill
                </h3>
                <button 
                  onClick={() => setAddCcBillModalOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Credit Card
                  </label>
                  <CustomSelect
                    value={addCcBillAccountId}
                    onChange={(val) => setAddCcBillAccountId(val)}
                    placeholder="Select credit card..."
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary transition hover:border-slate-300"
                    options={paymentAccounts.filter(a => a.type === 'credit_card').map(acc => ({
                      value: acc.id,
                      label: `${acc.name}`
                    }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Full Amount Due
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={addCcBillFullAmount}
                        onChange={(e) => setAddCcBillFullAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-8 pr-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:border-primary transition shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Minimum Due
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={addCcBillMinAmount}
                        onChange={(e) => setAddCcBillMinAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-8 pr-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:border-primary transition shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={addCcBillDueDate}
                    onChange={(e) => setAddCcBillDueDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:border-primary transition shadow-sm"
                  />
                </div>
                
                <label className="flex items-start gap-3 p-3 mt-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="mt-0.5">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={addCcBillAdjustLedger}
                      onChange={(e) => {
                        setAddCcBillAdjustLedger(e.target.checked);
                        if (e.target.checked && addCcBillAccountId) {
                          const b = accountBalances[addCcBillAccountId] || { current: 0 };
                          setAdjustCcCurrentBalance(-b.current);
                          setAdjustCcNewBalance(addCcBillFullAmount || (-b.current).toString());
                          setAdjustCcReason("Auto-adjustment to match Statement Bill");
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">Adjust Ledger Balance</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-0.5 leading-relaxed">
                      Manually adjust the credit card's outstanding balance along with adding the bill.
                    </p>
                  </div>
                </label>

                {addCcBillAdjustLedger && !addCcBillAccountId && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl mt-3">
                    <p className="text-xs text-rose-700 font-medium">Please select a credit card first to adjust its balance.</p>
                  </div>
                )}
                {addCcBillAdjustLedger && addCcBillAccountId && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mt-3 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Current Debt
                        </label>
                        <div className="bg-slate-100 rounded-xl py-2.5 px-3 border border-slate-200">
                          <span className="text-sm font-semibold text-slate-500">₹{adjustCcCurrentBalance.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Actual Debt
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={adjustCcNewBalance}
                            onChange={(e) => setAdjustCcNewBalance(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-8 pr-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:border-primary transition shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Reason / Description
                      </label>
                      <input
                        type="text"
                        value={adjustCcReason}
                        onChange={(e) => setAdjustCcReason(e.target.value)}
                        placeholder="Interest / EMI / Fee Adjustment"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:border-primary transition shadow-sm"
                      />
                    </div>
                    
                    {Math.abs(parseFloat(adjustCcNewBalance)) !== adjustCcCurrentBalance && !isNaN(parseFloat(adjustCcNewBalance)) && (
                      <div className="pt-1">
                        <p className="text-xs text-slate-500 font-medium">
                          A <span className="font-bold text-slate-700">{Math.abs(parseFloat(adjustCcNewBalance)) > adjustCcCurrentBalance ? "Debit (Expense)" : "Credit (Income)"}</span> entry of <span className="font-bold text-slate-700">₹{Math.abs(Math.abs(parseFloat(adjustCcNewBalance)) - adjustCcCurrentBalance).toLocaleString("en-IN")}</span> will be created.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-border bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                <button
                  onClick={() => setAddCcBillModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAddCcBill}
                  disabled={syncing}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                >
                  {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {syncing ? "Adding..." : "Add Bill"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

{/* Pay Credit Card Bill Modal */}
      <AnimatePresence>
        {payCcModalOpen && payCcAccount && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div 
              onClick={() => setPayCcModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col overflow-hidden text-left"
            >
              <div className="flex justify-between items-center border-b border-border p-4 bg-slate-50/50">
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  Pay Credit Card Bill
                </h3>
                <button 
                  onClick={() => setPayCcModalOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Card / Account
                  </p>
                  <p className="text-sm font-bold text-slate-800">{payCcAccount.name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Payment Amount Option
                  </p>
                  <div className="space-y-2">
                    <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${payCcAmountType === 'full' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${payCcAmountType === 'full' ? 'border-primary' : 'border-slate-300'}`}>
                          {payCcAmountType === 'full' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Full Amount</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900">₹{payCcOutstanding.toLocaleString("en-IN")}</span>
                      <input 
                        type="radio" 
                        name="ccAmount" 
                        className="hidden" 
                        checked={payCcAmountType === 'full'} 
                        onChange={() => setPayCcAmountType('full')} 
                      />
                    </label>
                    
                    <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${payCcAmountType === 'minimum' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${payCcAmountType === 'minimum' ? 'border-primary' : 'border-slate-300'}`}>
                          {payCcAmountType === 'minimum' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Minimum Amount <span className="text-[10px] text-slate-400 ml-1 font-normal">(5%)</span></span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900">₹{(payCcOutstanding * 0.05).toLocaleString("en-IN")}</span>
                      <input 
                        type="radio" 
                        name="ccAmount" 
                        className="hidden" 
                        checked={payCcAmountType === 'minimum'} 
                        onChange={() => setPayCcAmountType('minimum')} 
                      />
                    </label>
                    
                    <label className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors ${payCcAmountType === 'custom' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${payCcAmountType === 'custom' ? 'border-primary' : 'border-slate-300'}`}>
                          {payCcAmountType === 'custom' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Custom Statement Amount</span>
                      </div>
                      <input 
                        type="radio" 
                        name="ccAmount" 
                        className="hidden" 
                        checked={payCcAmountType === 'custom'} 
                        onChange={() => setPayCcAmountType('custom')} 
                      />
                    </label>
                    {payCcAmountType === 'custom' && (
                      <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={payCcCustomAmount}
                            onChange={(e) => setPayCcCustomAmount(e.target.value)}
                            placeholder="Enter exact bill amount..."
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-8 pr-4 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:border-primary transition shadow-sm"
                            autoFocus
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Pay From (Asset Account)
                  </label>
                  <CustomSelect
                    value={payCcSourceAccountId}
                    onChange={(val) => setPayCcSourceAccountId(val)}
                    placeholder="Select payment source..."
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary transition hover:border-slate-300"
                    options={paymentAccounts.filter(a => a.id !== 'virtual_pending_reimbursements' && a.type !== 'credit_card' && a.type !== 'loan').map(acc => ({
                      value: acc.id,
                      label: `${acc.name} (₹${(accountBalances[acc.id]?.current ?? acc.openingBalance).toLocaleString("en-IN")})`
                    }))}
                  />
                </div>
              </div>
              <div className="p-4 border-t border-border bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                <button
                  onClick={() => setPayCcModalOpen(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPayCreditCardBill}
                  disabled={syncing}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                >
                  {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {syncing ? "Processing..." : "Pay Bill"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
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
                    <CustomSelect value={formStatus} onChange={(val) => setFormStatus(val as any)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition hover:border-slate-300 hover:shadow-sm cursor-pointer" options={[{value: "paid", label: "Paid (Settled)"}, {value: "pending", label: "Pending"}]} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Account Category *
                    </label>
                    <CustomSelect
              value={formCategory}
              onChange={setFormCategory}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={formScope === "business"
                ? (formType === "income" ? customCategories.businessIncome : customCategories.businessExpense).map(c => ({value: c, label: c}))
                : (formType === "income" ? customCategories.personalIncome : customCategories.personalExpense).map(c => ({value: c, label: c}))
              }
            />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Invoice Status *
                    </label>
                    <CustomSelect
              value={formStatus}
              onChange={(val) => setFormStatus(val as any)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={formType === "income"
                ? [
                    {value: "paid", label: "Paid"},
                    {value: "pending", label: "Pending Receipt"},
                    {value: "overdue", label: "Overdue Invoicing"}
                  ]
                : [
                    {value: "paid", label: "Paid (Settled)"},
                    {value: "pending", label: "Pending"}
                  ]
              }
            />
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
                    <CustomSelect
              value={formClientId}
              onChange={setFormClientId}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={[
                { value: "", label: "No specific client" },
                ...clients.map(c => ({ value: c.uid, label: c.displayName || c.email }))
              ]}
            />
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

                  {/* Is it receivable from client */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      {formType === 'expense' ? 'Is it receivable from client?' : 'Is it a reimbursement from client?'}
                    </label>
                    <CustomSelect value={formIsReceivableFromClient ? "yes" : "no"} onChange={(val) => setFormIsReceivableFromClient(val === "yes")} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary" options={[{value: "no", label: "No"}, {value: "yes", label: "Yes"}]} />
                  </div>
                  
                  {/* Tithe Applicability */}
                  {formType === "income" && formScope === "business" && !editingRecord && (
                    <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="tithe-checkbox"
                          checked={formTitheApplicable}
                          onChange={(e) => setFormTitheApplicable(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                        />
                        <label htmlFor="tithe-checkbox" className="text-xs font-bold text-amber-900 uppercase tracking-widest">
                          Tithes Applicability
                        </label>
                      </div>
                      
                      {formTitheApplicable && (
                        <div>
                          <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5">
                            Tithe Amount (₹)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 5000"
                            value={formTitheAmount}
                            onChange={(e) => setFormTitheAmount(e.target.value)}
                            className="w-full bg-white border border-amber-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-amber-900 outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <p className="text-[10px] text-amber-600/80 mt-1.5 font-medium leading-relaxed">
                            This amount will be added to the "Tithes and Offerings" liability account automatically upon saving.
                          </p>
                        </div>
                      )}
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
                      <CustomSelect
              value={formPaymentAccountId}
              onChange={setFormPaymentAccountId}
              placeholder="Select account"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={paymentAccounts.filter(a => a.id !== 'virtual_pending_reimbursements').map(a => ({ value: a.id, label: `${a.name} (₹${(accountBalances[a.id]?.current ?? a.openingBalance).toLocaleString("en-IN")})` }))}
            />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                        Destination Account (To) *
                      </label>
                      <CustomSelect
              value={formTransferToAccountId}
              onChange={setFormTransferToAccountId}
              placeholder="Select destination account"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={paymentAccounts.filter(a => a.id !== 'virtual_pending_reimbursements' && a.id !== formPaymentAccountId).map(a => ({ value: a.id, label: `${a.name} (₹${(accountBalances[a.id]?.current ?? a.openingBalance).toLocaleString("en-IN")})` }))}
            />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Transfer Payment Mode *
                    </label>
                    <CustomSelect
              value={formPaymentMode}
              onChange={setFormPaymentMode}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={[
                { value: "Bank Transfer", label: "Bank Transfer" },
                { value: "UPI", label: "UPI" },
                { value: "Credit Card", label: "Credit Card" },
                { value: "Debit Card", label: "Debit Card" },
                { value: "Cash", label: "Cash" },
                { value: "Cheque", label: "Cheque" }
              ]}
            />
                  </div>
                </div>
              ) : formStatus === "paid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Payment Mode *
                    </label>
                    <CustomSelect
              value={formPaymentMode}
              onChange={setFormPaymentMode}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={[
                { value: "Bank Transfer", label: "Bank Transfer" },
                { value: "UPI", label: "UPI" },
                { value: "Credit Card", label: "Credit Card" },
                { value: "Debit Card", label: "Debit Card" },
                { value: "Cash", label: "Cash" },
                { value: "Cheque", label: "Cheque" }
              ]}
            />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Source / Payment Account
                    </label>
                    <CustomSelect
              value={formPaymentAccountId}
              onChange={setFormPaymentAccountId}
              placeholder="Select account"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={paymentAccounts
                .filter(a => a.id !== 'virtual_pending_reimbursements')
                .filter(a => formPaymentMode === 'Credit Card' ? a.type === 'credit_card' : a.type !== 'credit_card')
                .map(a => ({ value: a.id, label: `${a.name} (₹${(accountBalances[a.id]?.current ?? a.openingBalance).toLocaleString("en-IN")})` }))}
            />
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
                  className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
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
                  Account Type *
                </label>
                <CustomSelect
              value={accountType}
              onChange={(val) => setAccountType(val as any)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={[
                {
                  label: "Assets",
                  options: [
                    { value: "bank_account", label: "Bank Account" },
                    { value: "investment", label: "Investment" },
                    { value: "cash", label: "Cash on Hand" },
                    { value: "other_asset", label: "Other Asset" }
                  ]
                },
                {
                  label: "Liabilities",
                  options: [
                    { value: "credit_card", label: "Credit Card" },
                    { value: "loan", label: "Loan / Debt" },
                    { value: "other_liability", label: "Other Liability" }
                  ]
                }
              ]}
            />
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

              {/* EMI Section for Loans */}
              {accountType === 'loan' && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="mt-0.5">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                        checked={accountIsEmiPayable}
                        onChange={(e) => setAccountIsEmiPayable(e.target.checked)}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">EMI Payable</p>
                      <p className="text-[10px] font-medium text-slate-500 mt-0.5 leading-relaxed">
                        Track monthly EMI payments for this loan.
                      </p>
                    </div>
                  </label>

                  {accountIsEmiPayable && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          EMI Amount *
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none font-bold text-slate-400">
                            ₹
                          </span>
                          <input
                            type="number"
                            required
                            placeholder="0.00"
                            value={accountEmiAmount}
                            onChange={(e) => setAccountEmiAmount(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-8 pr-4 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary transition"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Due Date *
                        </label>
                        <CustomSelect
                          value={accountEmiDueDate}
                          onChange={(val) => setAccountEmiDueDate(val)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary transition"
                          options={Array.from({length: 28}, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
                >
                  {syncing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAccount ? "Save Changes" : "Configure Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Floating Action Button */}
      <button
        onClick={() => handleOpenAddModal()}
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[100] p-4 bg-[#AD8D3E] hover:bg-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        title="Add Transaction"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}


