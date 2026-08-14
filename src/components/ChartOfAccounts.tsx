import React, { useMemo, useState } from 'react';
import { FinanceRecord, PaymentAccount } from '../types';
import { Landmark, TrendingUp, TrendingDown, Layers, Scale, FileSpreadsheet, Download, X, Calendar, Search, ExternalLink, ArrowUpRight, BookOpen, FileText, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import CustomDatePicker from './CustomDatePicker';
import { financeService } from '../services/financeService';

interface Props {
  allRecords: FinanceRecord[];
  filteredRecords: FinanceRecord[];
  accounts: PaymentAccount[];
  onNavigateToGL?: (searchTerm: string) => void;
  onEditRecord?: (record: FinanceRecord) => void;
  onRefreshRecords?: () => void;
}

type AccountCategoryType = 'Asset' | 'Liability' | 'Revenue' | 'Expense';

interface SelectedItem {
  name: string;
  type: AccountCategoryType;
  id?: string;
  value: number;
}

interface ItemGLEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  scope: string;
  debit: number;
  credit: number;
  balance: number;
  record?: FinanceRecord;
}

export default function ChartOfAccounts({ allRecords, filteredRecords, accounts, onNavigateToGL, onEditRecord, onRefreshRecords }: Props) {
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Quick Date assignment modal state
  const [quickDateModalOpen, setQuickDateModalOpen] = useState(false);
  const [quickDateRecord, setQuickDateRecord] = useState<FinanceRecord | null>(null);
  const [quickDateValue, setQuickDateValue] = useState('');
  const [quickDateSaving, setQuickDateSaving] = useState(false);

  const handleDateClick = (rec: FinanceRecord) => {
    if (onEditRecord) {
      onEditRecord(rec);
    } else {
      setQuickDateRecord(rec);
      setQuickDateValue(rec.date || format(new Date(), 'yyyy-MM-dd'));
      setQuickDateModalOpen(true);
    }
  };

  const handleSaveQuickDate = async () => {
    if (!quickDateRecord || !quickDateValue) return;
    try {
      setQuickDateSaving(true);
      await financeService.updateRecord(quickDateRecord.id, { date: quickDateValue });
      if (onRefreshRecords) {
        await onRefreshRecords();
      }
      setQuickDateModalOpen(false);
      setQuickDateRecord(null);
    } catch (err) {
      console.error('Failed to update date:', err);
    } finally {
      setQuickDateSaving(false);
    }
  };

  const { assets, liabilities, revenue, expenses, equity } = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    
    const assetAccounts = accounts.filter(a => ['bank_account', 'investment', 'other_asset'].includes(a.type));
    const liabilityAccounts = accounts.filter(a => ['credit_card', 'loan', 'other_liability'].includes(a.type));
    
    const accountBalances: Record<string, number> = {};
    accounts.forEach(acc => {
      accountBalances[acc.id] = acc.type === 'credit_card' || acc.type === 'loan' ? -Number(acc.openingBalance || 0) : Number(acc.openingBalance || 0);
    });

    const findAccount = (idOrName?: string) => {
      if (!idOrName) return undefined;
      const clean = idOrName.trim().toLowerCase();
      return accounts.find(a => 
        a.id === idOrName || 
        a.id.toLowerCase() === clean || 
        a.name.toLowerCase() === clean ||
        a.name.toLowerCase().includes(clean) ||
        clean.includes(a.name.toLowerCase())
      );
    };
    
    allRecords.forEach(rec => {
      if ((rec.status || '').toLowerCase() !== 'paid') return;
      const amt = Number(rec.amount) || 0;
      const sourceAcc = findAccount(rec.paymentAccountId);
      const destAcc = findAccount(rec.transferToAccountId);
      
      if (sourceAcc && accountBalances[sourceAcc.id] !== undefined) {
        if (rec.type === 'income') {
          accountBalances[sourceAcc.id] += amt;
        } else if (rec.type === 'expense') {
          accountBalances[sourceAcc.id] -= amt;
        } else if (rec.type === 'transfer' || rec.type === 'journal') {
          accountBalances[sourceAcc.id] -= amt;
        }
      }

      if (destAcc && accountBalances[destAcc.id] !== undefined) {
        if (rec.type === 'transfer' || rec.type === 'journal') {
          accountBalances[destAcc.id] += amt;
        }
      }
    });
    
    const assetItems = assetAccounts.map(a => {
      const val = accountBalances[a.id];
      totalAssets += val;
      return { id: a.id, name: a.name, value: val, type: 'Asset' as AccountCategoryType };
    });
    
    const liabilityItems = liabilityAccounts.map(a => {
      const val = Math.abs(accountBalances[a.id]); // show debt as positive
      totalLiabilities += val;
      return { id: a.id, name: a.name, value: val, type: 'Liability' as AccountCategoryType };
    });
    
    const revByCategory: Record<string, number> = {};
    const expByCategory: Record<string, number> = {};
    
    let totalRev = 0;
    let totalExp = 0;
    
    filteredRecords.forEach(rec => {
      if (rec.type === 'income') {
        revByCategory[rec.category] = (revByCategory[rec.category] || 0) + rec.amount;
        totalRev += rec.amount;
      } else if (rec.type === 'expense') {
        expByCategory[rec.category] = (expByCategory[rec.category] || 0) + rec.amount;
        totalExp += rec.amount;
      }
    });
    
    const revItems = Object.entries(revByCategory)
      .map(([name, value]) => ({ name, value, type: 'Revenue' as AccountCategoryType }))
      .sort((a,b) => b.value - a.value);

    const expItems = Object.entries(expByCategory)
      .map(([name, value]) => ({ name, value, type: 'Expense' as AccountCategoryType }))
      .sort((a,b) => b.value - a.value);
    
    const equityVal = totalAssets - totalLiabilities;
    
    return {
      assets: { total: totalAssets, items: assetItems },
      liabilities: { total: totalLiabilities, items: liabilityItems },
      revenue: { total: totalRev, items: revItems },
      expenses: { total: totalExp, items: expItems },
      equity: equityVal
    };
  }, [allRecords, filteredRecords, accounts]);

  // Compute ledger data for selected item
  const selectedLedgerData = useMemo(() => {
    if (!selectedItem) return { entries: [], totalDebit: 0, totalCredit: 0, closingBalance: 0 };

    const entries: ItemGLEntry[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    const isPhysicalAccount = selectedItem.type === 'Asset' || selectedItem.type === 'Liability';
    const acc = isPhysicalAccount 
      ? accounts.find(a => (selectedItem.id && a.id === selectedItem.id) || a.name.toLowerCase() === selectedItem.name.toLowerCase())
      : null;

    if (acc) {
      // Add Opening Balance
      if (acc.openingBalance > 0) {
        if (selectedItem.type === 'Asset') {
          entries.push({
            id: `open-${acc.id}`,
            date: new Date(acc.createdAt).toISOString().split('T')[0],
            description: 'Opening Balance',
            reference: 'OPENING',
            scope: 'business',
            debit: acc.openingBalance,
            credit: 0,
            balance: 0
          });
          totalDebit += acc.openingBalance;
        } else {
          entries.push({
            id: `open-${acc.id}`,
            date: new Date(acc.createdAt).toISOString().split('T')[0],
            description: 'Opening Balance',
            reference: 'OPENING',
            scope: 'business',
            debit: 0,
            credit: acc.openingBalance,
            balance: 0
          });
          totalCredit += acc.openingBalance;
        }
      }

      // Process paid records for this account
      const paidRecords = allRecords.filter(r => (r.status || '').toLowerCase() !== 'cancelled' && (r.status || '').toLowerCase() !== 'void').sort((a, b) => {
        const dComp = (a.date || "").localeCompare(b.date || "");
        if (dComp !== 0) return dComp;
        return (a.createdAt || 0) - (b.createdAt || 0);
      });

      paidRecords.forEach(rec => {
        const isFrom = rec.paymentAccountId === acc.id;
        const isTo = rec.transferToAccountId === acc.id;

        if (!isFrom && !isTo) return;

        if (rec.type === 'income') {
          entries.push({
            id: `${rec.id}-dr`,
            date: rec.date,
            description: rec.description || rec.category,
            reference: rec.paymentMode || rec.id.slice(-6),
            scope: rec.scope || 'business',
            debit: rec.amount,
            credit: 0,
            balance: 0,
            record: rec
          });
          totalDebit += rec.amount;
        } else if (rec.type === 'expense') {
          entries.push({
            id: `${rec.id}-cr`,
            date: rec.date,
            description: rec.description || rec.category,
            reference: rec.paymentMode || rec.id.slice(-6),
            scope: rec.scope || 'business',
            debit: 0,
            credit: rec.amount,
            balance: 0,
            record: rec
          });
          totalCredit += rec.amount;
        } else if (rec.type === 'transfer') {
          if (isFrom) {
            const toAcc = accounts.find(a => a.id === rec.transferToAccountId);
            entries.push({
              id: `${rec.id}-cr`,
              date: rec.date,
              description: `Transfer to ${toAcc?.name || 'Account'}`,
              reference: 'TRANSFER',
              scope: rec.scope || 'business',
              debit: 0,
              credit: rec.amount,
              balance: 0,
              record: rec
            });
            totalCredit += rec.amount;
          }
          if (isTo) {
            const fromAcc = accounts.find(a => a.id === rec.paymentAccountId);
            entries.push({
              id: `${rec.id}-dr`,
              date: rec.date,
              description: `Transfer from ${fromAcc?.name || 'Account'}`,
              reference: 'TRANSFER',
              scope: rec.scope || 'business',
              debit: rec.amount,
              credit: 0,
              balance: 0,
              record: rec
            });
            totalDebit += rec.amount;
          }
        } else if (rec.type === 'journal') {
          if (isFrom) {
            entries.push({
              id: `${rec.id}-cr`,
              date: rec.date,
              description: `${rec.description} (Journal Cr)`,
              reference: 'JOURNAL',
              scope: rec.scope || 'business',
              debit: 0,
              credit: rec.amount,
              balance: 0,
              record: rec
            });
            totalCredit += rec.amount;
          }
          if (isTo) {
            entries.push({
              id: `${rec.id}-dr`,
              date: rec.date,
              description: `${rec.description} (Journal Dr)`,
              reference: 'JOURNAL',
              scope: rec.scope || 'business',
              debit: rec.amount,
              credit: 0,
              balance: 0,
              record: rec
            });
            totalDebit += rec.amount;
          }
        }
      });
    } else {
      // Category Ledger (Revenue or Expense) - combines BOTH income and expense records into a single unified statement
      const catPaidRecords = allRecords
        .filter(r => (r.status || '').toLowerCase() !== 'cancelled' && (r.status || '').toLowerCase() !== 'void' && r.category?.toLowerCase() === selectedItem.name.toLowerCase())
        .sort((a, b) => {
          const dComp = (a.date || "").localeCompare(b.date || "");
          if (dComp !== 0) return dComp;
          return (a.createdAt || 0) - (b.createdAt || 0);
        });

      catPaidRecords.forEach(rec => {
        if (rec.type === 'income') {
          entries.push({
            id: `${rec.id}-cr`,
            date: rec.date,
            description: rec.description || rec.category,
            reference: rec.paymentMode || rec.id.slice(-6),
            scope: rec.scope || 'business',
            debit: 0,
            credit: rec.amount,
            balance: 0,
            record: rec
          });
          totalCredit += rec.amount;
        } else {
          entries.push({
            id: `${rec.id}-dr`,
            date: rec.date,
            description: rec.description || rec.category,
            reference: rec.paymentMode || rec.id.slice(-6),
            scope: rec.scope || 'business',
            debit: rec.amount,
            credit: 0,
            balance: 0,
            record: rec
          });
          totalDebit += rec.amount;
        }
      });
    }

    // Sort entries chronologically
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Apply date range filter if provided
    const sTime = startDate ? new Date(startDate).getTime() : 0;
    const eTime = endDate ? new Date(endDate).getTime() : Infinity;

    let runningBal = 0;
    let filteredDebit = 0;
    let filteredCredit = 0;

    const isCategoryLedger = !['Asset', 'Liability'].includes(selectedItem.type);
    const hasIncomeEntries = totalCredit > 0;

    const calculatedEntries = entries.map(entry => {
      if (selectedItem.type === 'Asset') {
        runningBal += (entry.debit - entry.credit);
      } else if (selectedItem.type === 'Liability') {
        runningBal += (entry.credit - entry.debit);
      } else if (selectedItem.type === 'Expense' && !hasIncomeEntries) {
        // Pure expense category with no income entries
        runningBal += (entry.debit - entry.credit);
      } else {
        // Revenue or Category with mixed Income/Expense (e.g. Raghuveer Account)
        // Income (Credit) increases balance (+), Expense (Debit) decreases balance (-)
        runningBal += (entry.credit - entry.debit);
      }

      return {
        ...entry,
        balance: runningBal
      };
    }).filter(entry => {
      const t = new Date(entry.date).getTime();
      const inRange = t >= sTime && t <= eTime;
      if (inRange) {
        filteredDebit += entry.debit;
        filteredCredit += entry.credit;
      }
      return inRange;
    });

    return {
      entries: calculatedEntries,
      totalDebit: filteredDebit,
      totalCredit: filteredCredit,
      closingBalance: runningBal,
      isCategoryLedger,
      hasIncomeEntries
    };
  }, [selectedItem, allRecords, accounts, startDate, endDate]);

  const handleDownloadExcel = () => {
    if (!selectedItem) return;
    try {
      const headerRow = [
        ["Account / Category Ledger", selectedItem.name],
        ["Classification", selectedItem.type],
        ["Generated Date", format(new Date(), 'MMM dd, yyyy HH:mm')],
        ["Date Filter", startDate || endDate ? `${startDate || 'Start'} to ${endDate || 'Current'}` : "All Time"],
        [],
        ["Total Debit (Dr)", selectedLedgerData.totalDebit],
        ["Total Credit (Cr)", selectedLedgerData.totalCredit],
        ["Net / Closing Balance", selectedLedgerData.closingBalance],
        [],
        ["Date", "Description", "Reference / Mode", "Scope", "Debit (Dr)", "Credit (Cr)", "Balance"]
      ];

      const dataRows = selectedLedgerData.entries.map(t => [
        t.date ? format(new Date(t.date), 'yyyy-MM-dd') : '-',
        t.description,
        t.reference,
        t.scope === 'personal' ? 'Private' : 'Corporate',
        t.debit > 0 ? t.debit : '',
        t.credit > 0 ? t.credit : '',
        t.balance
      ]);

      const ws = XLSX.utils.aoa_to_sheet([...headerRow, ...dataRows]);
      
      ws['!cols'] = [
        { wch: 14 },
        { wch: 42 },
        { wch: 18 },
        { wch: 12 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Item Ledger");

      XLSX.writeFile(wb, `Ledger_${selectedItem.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } catch (err) {
      console.error("Error generating Excel:", err);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedItem) return;
    try {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setTextColor(26, 43, 88); // Primary dark blue
      doc.text(selectedItem.name, 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Type: ${selectedItem.type}`, 14, 27);
      doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 33);
      if (startDate || endDate) {
        doc.text(`Period: ${startDate || 'All'} to ${endDate || 'Current'}`, 14, 39);
      }

      // Summary Card Top Right
      doc.setDrawColor(200);
      doc.setFillColor(248, 250, 252);
      doc.rect(120, 14, 76, 28, 'FD');

      doc.setFontSize(9);
      doc.text('Total Debit:', 124, 20);
      doc.text(`Rs. ${selectedLedgerData.totalDebit.toLocaleString('en-IN')}`, 192, 20, { align: 'right' });

      doc.text('Total Credit:', 124, 26);
      doc.text(`Rs. ${selectedLedgerData.totalCredit.toLocaleString('en-IN')}`, 192, 26, { align: 'right' });

      doc.setFont(undefined, 'bold');
      doc.text('Net Balance:', 124, 35);
      doc.text(`Rs. ${selectedLedgerData.closingBalance.toLocaleString('en-IN')}`, 192, 35, { align: 'right' });

      doc.setFont(undefined, 'normal');

      const tableData = selectedLedgerData.entries.map(t => [
        t.date ? format(new Date(t.date), 'yyyy-MM-dd') : '-',
        t.description,
        t.reference,
        t.scope === 'personal' ? 'Private' : 'Corporate',
        t.debit > 0 ? `Rs. ${t.debit.toLocaleString('en-IN')}` : '-',
        t.credit > 0 ? `Rs. ${t.credit.toLocaleString('en-IN')}` : '-',
        `Rs. ${t.balance.toLocaleString('en-IN')}`
      ]);

      autoTable(doc, {
        startY: 46,
        head: [['Date', 'Description', 'Ref / Mode', 'Scope', 'Debit (Dr)', 'Credit (Cr)', 'Balance']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [26, 43, 88] },
        styles: { fontSize: 8.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`Ledger_${selectedItem.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    }
  };

  const Section = ({ title, icon: Icon, total, items, colorClass }: any) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${colorClass.bg}`}>
            <Icon className={`w-5 h-5 ${colorClass.text}`} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{title}</h3>
            <span className="text-[10px] text-slate-400 font-medium">Click any row to open ledger</span>
          </div>
        </div>
        <span className="font-extrabold text-slate-800">₹{total.toLocaleString('en-IN')}</span>
      </div>
      <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No records found.</p>
        ) : (
          items.map((item: any, idx: number) => (
            <div 
              key={idx} 
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedItem(item);
              }}
              className="flex justify-between items-center p-2 rounded-xl border border-transparent hover:border-amber-200 hover:bg-amber-50/50 cursor-pointer transition-all group"
              title={`Click to view ledger statement for ${item.name}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-700 font-semibold text-sm group-hover:text-amber-900 transition-colors">
                  {item.name}
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5">
                  <BookOpen className="w-3 h-3" /> Ledger
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 font-bold text-sm">₹{item.value.toLocaleString('en-IN')}</span>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h3 className="text-lg font-bold text-primary tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-600" /> Chart of Accounts
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Double-entry accounting summary. Click any item to view its detailed ledger statement and download reports.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Section title="Assets" icon={Landmark} total={assets.total} items={assets.items} colorClass={{ bg: 'bg-emerald-100', text: 'text-emerald-700' }} />
        <Section title="Liabilities" icon={Scale} total={liabilities.total} items={liabilities.items} colorClass={{ bg: 'bg-rose-100', text: 'text-rose-700' }} />
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="p-3 bg-indigo-100 rounded-full mb-3">
            <Layers className="w-8 h-8 text-indigo-700" />
          </div>
          <h3 className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-1">Total Equity (Net Worth)</h3>
          <span className={`text-3xl font-extrabold ${equity >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ₹{equity.toLocaleString('en-IN')}
          </span>
          <p className="text-xs text-slate-400 mt-2 max-w-[200px]">Calculated as Total Assets minus Total Liabilities.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Revenue (Income)" icon={TrendingUp} total={revenue.total} items={revenue.items} colorClass={{ bg: 'bg-blue-100', text: 'text-blue-700' }} />
        <Section title="Expenses" icon={TrendingDown} total={expenses.total} items={expenses.items} colorClass={{ bg: 'bg-amber-100', text: 'text-amber-700' }} />
      </div>

      {/* Item Ledger Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-[#1a2b58] text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6 text-[#AD8D3E]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white tracking-tight">{selectedItem.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-extrabold bg-[#AD8D3E]/20 text-[#AD8D3E] border border-[#AD8D3E]/30">
                      {selectedItem.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Account Ledger & Transaction History Statement
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Actions & Date Filters */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                  <Calendar className="w-4 h-4 text-slate-400" /> Date Filter:
                </div>
                <div className="w-36">
                  <CustomDatePicker
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    placeholder="From Date"
                  />
                </div>
                <span className="text-slate-400 text-xs">to</span>
                <div className="w-36">
                  <CustomDatePicker
                    value={endDate}
                    onChange={(val) => setEndDate(val)}
                    placeholder="To Date"
                  />
                </div>
                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="text-xs text-amber-800 hover:underline font-bold px-1 cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleDownloadExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title="Export Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title="Export PDF Report (.pdf)"
                >
                  <Download className="w-4 h-4" /> PDF Report
                </button>
                {onNavigateToGL && (
                  <button
                    onClick={() => {
                      const name = selectedItem.name;
                      setSelectedItem(null);
                      onNavigateToGL(name);
                    }}
                    className="bg-[#1a2b58] hover:bg-[#1a2b58]/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="Open in General Ledger Tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in GL
                  </button>
                )}
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-100 shrink-0 bg-white">
              <div className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">Total Payments / Debit (Dr)</span>
                <span className="text-lg font-bold text-rose-700 block mt-0.5">
                  ₹{selectedLedgerData.totalDebit.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Total Receipts / Credit (Cr)</span>
                <span className="text-lg font-bold text-emerald-700 block mt-0.5">
                  ₹{selectedLedgerData.totalCredit.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">Closing / Net Balance</span>
                <span className="text-lg font-extrabold text-amber-900 block mt-0.5">
                  {selectedLedgerData.closingBalance < 0 
                    ? `₹${Math.abs(selectedLedgerData.closingBalance).toLocaleString('en-IN')} Dr` 
                    : `₹${selectedLedgerData.closingBalance.toLocaleString('en-IN')}${selectedLedgerData.hasIncomeEntries ? ' Cr' : ''}`}
                </span>
              </div>
            </div>

            {/* Table Entries Container */}
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {selectedLedgerData.entries.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No ledger transactions recorded</p>
                  <p className="text-xs text-slate-400 mt-1">Try adjusting date filters or adding paid transactions.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Ref / Mode</th>
                        <th className="py-2.5 px-3 text-center">Scope</th>
                        <th className="py-2.5 px-3 text-right">Debit (Dr - Paid)</th>
                        <th className="py-2.5 px-3 text-right">Credit (Cr - Received)</th>
                        <th className="py-2.5 px-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedLedgerData.entries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                            {entry.date && !isNaN(new Date(entry.date).getTime()) ? (
                              entry.record ? (
                                <button
                                  type="button"
                                  onClick={() => handleDateClick(entry.record!)}
                                  className="font-medium text-slate-700 hover:text-indigo-600 hover:underline transition-colors text-left flex items-center gap-1.5 cursor-pointer group/btn"
                                  title="Click to edit date"
                                >
                                  <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-indigo-600 transition-colors" />
                                  <span>{format(new Date(entry.date), 'MMM dd, yyyy')}</span>
                                </button>
                              ) : (
                                <span className="flex items-center gap-1.5 text-slate-600">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {format(new Date(entry.date), 'MMM dd, yyyy')}
                                </span>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (entry.record) {
                                    handleDateClick(entry.record);
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition shadow-2xs cursor-pointer group/btn"
                                title="No date set. Click to assign a date."
                              >
                                <Calendar className="w-3.5 h-3.5 text-amber-600 group-hover/btn:scale-110 transition-transform" />
                                <span>+ Add Date</span>
                              </button>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 max-w-xs truncate" title={entry.description}>
                            <div className="flex flex-col">
                              <span>{entry.description}</span>
                              {entry.record && (!entry.date || isNaN(new Date(entry.date).getTime())) && (
                                <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" /> Missing date
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-600">
                              {entry.reference}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              entry.scope === 'personal' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {entry.scope === 'personal' ? 'Private' : 'Corporate'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-700 whitespace-nowrap">
                            {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                            {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-800 whitespace-nowrap">
                            {entry.balance < 0 ? (
                              <span className="text-rose-700">₹{Math.abs(entry.balance).toLocaleString('en-IN')} Dr</span>
                            ) : (
                              <span className="text-slate-800">₹{entry.balance.toLocaleString('en-IN')}{selectedLedgerData.hasIncomeEntries ? ' Cr' : ''}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-3 px-4 flex justify-between items-center text-[11px] text-slate-500 shrink-0">
              <span>Showing {selectedLedgerData.entries.length} statement entries</span>
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Quick Date Assign Modal for Chart of Accounts */}
      {quickDateModalOpen && quickDateRecord && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-amber-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Set Transaction Date</h3>
                  <p className="text-xs text-slate-500">{quickDateRecord.description || quickDateRecord.category || 'Transaction'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setQuickDateModalOpen(false);
                  setQuickDateRecord(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Amount:</span>
                <span className="font-bold text-slate-800 text-sm">₹{Number(quickDateRecord.amount || 0).toLocaleString('en-IN')}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Date <span className="text-rose-500">*</span>
                </label>
                <CustomDatePicker
                  value={quickDateValue}
                  onChange={setQuickDateValue}
                  placeholder="Select transaction date"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-3">
              <button
                onClick={() => {
                  setQuickDateModalOpen(false);
                  setQuickDateRecord(null);
                }}
                disabled={quickDateSaving}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuickDate}
                disabled={quickDateSaving || !quickDateValue}
                className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {quickDateSaving ? 'Saving...' : 'Save Date'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
