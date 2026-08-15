import React, { useState, useMemo, useRef } from "react";
import { format, isAfter, isBefore, parseISO, startOfYear, endOfMonth } from "date-fns";
import { Download, Calendar as CalendarIcon, Printer, FileText, ChevronRight, ChevronDown, IndianRupee, TrendingUp, TrendingDown, BookOpen, CheckCircle2 } from "lucide-react";
import { FinanceRecord, PaymentAccount } from "../types";
import { CategoryBadge } from "./FinanceTracker";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface FinancialReportsProps {
  records: FinanceRecord[];
  accounts: PaymentAccount[];
}

export default function FinancialReports({ records, accounts }: FinancialReportsProps) {
  const [reportType, setReportType] = useState<"pl" | "bs">("pl");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfYear(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    income: true,
    expenses: true,
    assets: true,
    liabilities: true,
    equity: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const filteredRecords = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return records;
    return records.filter(r => {
      const rd = parseISO(r.date);
      return (isAfter(rd, dateRange.from!) || rd.getTime() === dateRange.from!.getTime()) &&
             (isBefore(rd, dateRange.to!) || rd.getTime() === dateRange.to!.getTime());
    });
  }, [records, dateRange]);

  // Income Statement Calculations
  const incomeRecords = filteredRecords.filter(r => r.type === "income" && r.status === "paid");
  const expenseRecords = filteredRecords.filter(r => r.type === "expense" && r.status === "paid");

  const totalIncome = incomeRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = expenseRecords.reduce((sum, r) => sum + r.amount, 0);
  const netIncome = totalIncome - totalExpense;

  const incomeByCategory = incomeRecords.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + r.amount;
    return acc;
  }, {} as Record<string, number>);

  const expenseByCategory = expenseRecords.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + r.amount;
    return acc;
  }, {} as Record<string, number>);

  // Balance Sheet Calculations (As of end date)
  // For balance sheet, we consider records up to dateRange.to
  const bsRecords = useMemo(() => {
    if (!dateRange?.to) return records;
    return records.filter(r => {
      const rd = parseISO(r.date);
      return isBefore(rd, dateRange.to!) || rd.getTime() === dateRange.to!.getTime();
    });
  }, [records, dateRange]);

  const bankAccounts = accounts.filter(a => a.type === "bank_account" || a.type === "investment" || a.type === "other_asset");
  const liabilityAccounts = accounts.filter(a => a.type === "credit_card" || a.type === "loan" || a.type === "other_liability");

  // Current balance of each account
  const getAccountBalance = (account: PaymentAccount) => {
    let balance = Number(account.openingBalance) || 0;
    const isAsset = ['bank_account', 'investment', 'other_asset'].includes(account.type);
    if (!isAsset) {
      balance = -Math.abs(balance);
    }
    
    bsRecords.forEach(r => {
      if ((r.status || '').toLowerCase() !== 'paid') return;
      const amt = Number(r.amount) || 0;
      const matchesSource = r.paymentAccountId === account.id || (r.paymentAccountId && r.paymentAccountId.toLowerCase() === account.name.toLowerCase());
      const matchesDest = r.transferToAccountId === account.id || (r.transferToAccountId && r.transferToAccountId.toLowerCase() === account.name.toLowerCase());

      if (matchesSource) {
        if (r.type === 'income') {
          balance += amt;
        } else if (r.type === 'expense' || r.type === 'transfer' || r.type === 'journal') {
          balance -= amt;
        }
      }

      if (matchesDest && (r.type === 'transfer' || r.type === 'journal')) {
        balance += amt;
      }
    });
    return balance;
  };

  const assetBalances = bankAccounts.map(a => ({ ...a, currentBalance: getAccountBalance(a) }));
  const liabilityBalances = liabilityAccounts.map(a => ({ ...a, currentBalance: getAccountBalance(a) }));

  const totalAssets = assetBalances.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalLiabilities = liabilityBalances.reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);

  const resolvedLiabilityBalances = liabilityBalances.map(a => ({
    ...a,
    displayBalance: Math.abs(a.currentBalance) // Display as positive number in liabilities section
  }));
  const absoluteTotalLiabilities = resolvedLiabilityBalances.reduce((sum, a) => sum + a.displayBalance, 0);

  // Accounts Receivable (Income not paid yet up to date)
  const arRecords = bsRecords.filter(r => r.type === "income" && r.status !== "paid");
  const totalAR = arRecords.reduce((sum, r) => sum + r.amount, 0);

  // Accounts Payable (Expenses not paid yet up to date)
  const apRecords = bsRecords.filter(r => r.type === "expense" && r.status !== "paid");
  const totalAP = apRecords.reduce((sum, r) => sum + r.amount, 0);

  const finalTotalAssets = totalAssets + totalAR;
  const finalTotalLiabilities = absoluteTotalLiabilities + totalAP;
  const equity = finalTotalAssets - finalTotalLiabilities;

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${reportType === "pl" ? "Income_Statement" : "Balance_Sheet"}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center no-print">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setReportType("pl")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${reportType === "pl" ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              Income Statement
            </button>
            <button
              onClick={() => setReportType("bs")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${reportType === "bs" ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              Balance Sheet
            </button>
          </div>

          <div className="relative z-10">
            <button
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <CalendarIcon className="w-4 h-4 text-slate-500" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </button>
            
            {isDatePickerOpen && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-xl border border-slate-100 p-4 animate-in fade-in slide-in-from-top-2">
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range?.from && range?.to) {
                      setIsDatePickerOpen(false);
                    }
                  }}
                  className="border-0"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Report Document */}
      <div 
        ref={reportRef}
        className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0"
      >
        <div className="text-center mb-10 pb-10 border-b border-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {reportType === "pl" ? "Income Statement" : "Balance Sheet"}
          </h1>
          <p className="text-slate-500 font-medium">
            {reportType === "pl" 
              ? `For the period ${dateRange?.from ? format(dateRange.from, "MMMM d, yyyy") : ''} - ${dateRange?.to ? format(dateRange.to, "MMMM d, yyyy") : ''}`
              : `As of ${dateRange?.to ? format(dateRange.to, "MMMM d, yyyy") : 'Today'}`
            }
          </p>
        </div>

        {reportType === "pl" ? (
          <div className="space-y-8">
            {/* Income Section */}
            <div>
              <button 
                onClick={() => toggleSection('income')}
                className="flex items-center gap-2 w-full text-left mb-4 group"
              >
                {expandedSections['income'] ? 
                  <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" /> : 
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                }
                <h2 className="text-xl font-bold text-slate-800 border-b-2 border-emerald-500/20 pb-1">
                  Revenue
                </h2>
              </button>
              
              {expandedSections['income'] && (
                <div className="pl-7 space-y-3">
                  {Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center py-2 border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                      <CategoryBadge category={category} />
                      <span className="text-slate-900 font-mono tabular-nums font-bold">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                  {Object.keys(incomeByCategory).length === 0 && (
                    <div className="py-4 text-slate-400 italic text-sm">No revenue recorded in this period.</div>
                  )}
                  <div className="flex justify-between items-center pt-4 pb-2 px-2 font-bold bg-emerald-50/50 rounded-lg mt-2">
                    <span className="text-emerald-900">Total Revenue</span>
                    <span className="text-emerald-700 font-mono tabular-nums">{formatCurrency(totalIncome)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Expenses Section */}
            <div>
              <button 
                onClick={() => toggleSection('expenses')}
                className="flex items-center gap-2 w-full text-left mb-4 group"
              >
                {expandedSections['expenses'] ? 
                  <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" /> : 
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                }
                <h2 className="text-xl font-bold text-slate-800 border-b-2 border-rose-500/20 pb-1">
                  Operating Expenses
                </h2>
              </button>
              
              {expandedSections['expenses'] && (
                <div className="pl-7 space-y-3">
                  {Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center py-2 border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                      <CategoryBadge category={category} />
                      <span className="text-slate-900 font-mono tabular-nums font-bold">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                  {Object.keys(expenseByCategory).length === 0 && (
                    <div className="py-4 text-slate-400 italic text-sm">No expenses recorded in this period.</div>
                  )}
                  <div className="flex justify-between items-center pt-4 pb-2 px-2 font-bold bg-rose-50/50 rounded-lg mt-2">
                    <span className="text-rose-900">Total Expenses</span>
                    <span className="text-rose-700 font-mono tabular-nums">{formatCurrency(totalExpense)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Net Income Summary */}
            <div className={`mt-12 p-6 rounded-2xl ${netIncome >= 0 ? 'bg-primary/5 border border-primary/20' : 'bg-rose-50 border border-rose-200'}`}>
              <div className="flex justify-between items-center">
                <h2 className={`text-2xl font-black ${netIncome >= 0 ? 'text-primary' : 'text-rose-700'}`}>
                  Net Income
                </h2>
                <span className={`text-3xl font-black ${netIncome >= 0 ? 'text-primary' : 'text-rose-700'}`}>
                  {formatCurrency(netIncome)}
                </span>
              </div>
              <p className={`text-sm mt-2 font-medium ${netIncome >= 0 ? 'text-primary/70' : 'text-rose-600/70'}`}>
                {netIncome >= 0 ? 'Profit for the period' : 'Loss for the period'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Assets Section */}
            <div>
              <button 
                onClick={() => toggleSection('assets')}
                className="flex items-center gap-2 w-full text-left mb-4 group"
              >
                {expandedSections['assets'] ? 
                  <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" /> : 
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                }
                <h2 className="text-xl font-bold text-slate-800 border-b-2 border-emerald-500/20 pb-1">
                  Assets
                </h2>
              </button>
              
              {expandedSections['assets'] && (
                <div className="pl-7 space-y-3">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-4 mb-2">Bank Accounts & Cash</div>
                  {assetBalances.map((account) => (
                    <div key={account.id} className="flex justify-between items-center py-2 border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                      <span className="text-slate-600 font-medium">{account.name}</span>
                      <span className="text-slate-900">{formatCurrency(account.currentBalance)}</span>
                    </div>
                  ))}
                  
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2">Accounts Receivable</div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                    <span className="text-slate-600 font-medium">Unpaid Invoices & Receivables</span>
                    <span className="text-slate-900">{formatCurrency(totalAR)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-4 pb-2 px-2 font-bold bg-emerald-50/50 rounded-lg mt-4">
                    <span className="text-emerald-900">Total Assets</span>
                    <span className="text-emerald-700">{formatCurrency(finalTotalAssets)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Liabilities Section */}
            <div>
              <button 
                onClick={() => toggleSection('liabilities')}
                className="flex items-center gap-2 w-full text-left mb-4 group"
              >
                {expandedSections['liabilities'] ? 
                  <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" /> : 
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                }
                <h2 className="text-xl font-bold text-slate-800 border-b-2 border-rose-500/20 pb-1">
                  Liabilities
                </h2>
              </button>
              
              {expandedSections['liabilities'] && (
                <div className="pl-7 space-y-3">
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-4 mb-2">Credit Cards & Loans</div>
                  {resolvedLiabilityBalances.map((account) => (
                    <div key={account.id} className="flex justify-between items-center py-2 border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                      <span className="text-slate-600 font-medium">{account.name}</span>
                      <span className="text-slate-900">{formatCurrency(account.displayBalance)}</span>
                    </div>
                  ))}
                  {resolvedLiabilityBalances.length === 0 && (
                    <div className="py-2 text-slate-400 italic text-sm">No credit cards or loans found.</div>
                  )}

                  <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2">Accounts Payable</div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                    <span className="text-slate-600 font-medium">Unpaid Bills & Payables</span>
                    <span className="text-slate-900">{formatCurrency(totalAP)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-4 pb-2 px-2 font-bold bg-rose-50/50 rounded-lg mt-4">
                    <span className="text-rose-900">Total Liabilities</span>
                    <span className="text-rose-700">{formatCurrency(finalTotalLiabilities)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Equity Section */}
            <div>
              <button 
                onClick={() => toggleSection('equity')}
                className="flex items-center gap-2 w-full text-left mb-4 group"
              >
                {expandedSections['equity'] ? 
                  <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" /> : 
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                }
                <h2 className="text-xl font-bold text-slate-800 border-b-2 border-blue-500/20 pb-1">
                  Equity
                </h2>
              </button>
              
              {expandedSections['equity'] && (
                <div className="pl-7 space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100/50 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                    <span className="text-slate-600 font-medium">Retained Earnings / Owner's Equity</span>
                    <span className="text-slate-900">{formatCurrency(equity)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-4 pb-2 px-2 font-bold bg-blue-50/50 rounded-lg mt-4">
                    <span className="text-blue-900">Total Equity</span>
                    <span className="text-blue-700">{formatCurrency(equity)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Verification (Assets = Liabilities + Equity) */}
            <div className="mt-12 p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-600 font-bold">Total Assets</span>
                <span className="text-slate-900 font-bold">{formatCurrency(finalTotalAssets)}</span>
              </div>
              <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-4">
                <span className="text-slate-600 font-bold">Total Liabilities & Equity</span>
                <span className="text-slate-900 font-bold">{formatCurrency(finalTotalLiabilities + equity)}</span>
              </div>
              <div className="flex items-center gap-2 justify-center text-sm font-medium text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>Balance Sheet is Balanced</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
