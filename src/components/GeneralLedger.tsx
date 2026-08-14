import * as XLSX from 'xlsx';
import React, { useMemo, useState } from 'react';
import { FinanceRecord, PaymentAccount } from '../types';
import { FileSpreadsheet, Search, Filter, Calendar, Download, CheckCircle2, Clock } from 'lucide-react';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { financeService } from '../services/financeService';
import toast from 'react-hot-toast';

interface Props {
  allRecords: FinanceRecord[];
  accounts: PaymentAccount[];
  defaultSearchTerm?: string;
  onEditRecord?: (record: FinanceRecord) => void;
  onRefreshRecords?: () => void;
}

type GLAccountType = 'Asset' | 'Liability' | 'Revenue' | 'Expense';

interface GLEntry {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  record?: FinanceRecord;
}

interface GLAccount {
  id: string;
  name: string;
  type: GLAccountType;
  entries: GLEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

export default function GeneralLedger({ allRecords, accounts, defaultSearchTerm = '', onEditRecord, onRefreshRecords }: Props) {
  const [searchTerm, setSearchTerm] = useState(defaultSearchTerm);
  const [selectedType, setSelectedType] = useState<GLAccountType | 'All'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportTargetAccount, setExportTargetAccount] = useState<GLAccount | null>(null);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  // Quick Date modal state
  const [quickDateModalOpen, setQuickDateModalOpen] = useState(false);
  const [quickDateRecord, setQuickDateRecord] = useState<FinanceRecord | null>(null);
  const [quickDateValue, setQuickDateValue] = useState<string>('');
  const [quickDateSaving, setQuickDateSaving] = useState(false);

  React.useEffect(() => {
    setSearchTerm(defaultSearchTerm);
  }, [defaultSearchTerm]);

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
    if (!quickDateRecord || !quickDateValue) {
      toast.error('Please select a valid date.');
      return;
    }
    setQuickDateSaving(true);
    try {
      await financeService.updateRecord(quickDateRecord.id, { date: quickDateValue });
      toast.success('Transaction date updated successfully!');
      setQuickDateModalOpen(false);
      setQuickDateRecord(null);
      if (onRefreshRecords) {
        onRefreshRecords();
      }
    } catch (err) {
      console.error('Failed to update date:', err);
      toast.error('Failed to update date. Please try again.');
    } finally {
      setQuickDateSaving(false);
    }
  };

  const glData = useMemo(() => {
    const glAccounts = new Map<string, GLAccount>();

    // Helper to get or create a GL Account
    const getAccount = (id: string, name: string, type: GLAccountType): GLAccount => {
      if (!glAccounts.has(id)) {
        glAccounts.set(id, {
          id, name, type, entries: [], totalDebit: 0, totalCredit: 0, closingBalance: 0
        });
      }
      return glAccounts.get(id)!;
    };

    // Helper to find physical payment account by ID or name
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

    // Initialize physical accounts (Assets & Liabilities) with opening balances
    accounts.forEach(acc => {
      const isAsset = ['bank_account', 'investment', 'other_asset'].includes(acc.type);
      const glType: GLAccountType = isAsset ? 'Asset' : 'Liability';
      const account = getAccount(acc.id, acc.name, glType);
      
      // Opening balance
      const openBal = Number(acc.openingBalance) || 0;
      if (openBal !== 0) {
        const openDate = acc.createdAt && !isNaN(new Date(acc.createdAt).getTime())
          ? new Date(acc.createdAt).toISOString().split('T')[0]
          : '2020-01-01';

        if (isAsset) {
          if (openBal > 0) {
            account.entries.push({
              id: `open-${acc.id}`,
              date: openDate,
              description: 'Opening Balance',
              reference: 'OPENING',
              debit: openBal,
              credit: 0,
              balance: 0
            });
            account.totalDebit += openBal;
          } else {
            account.entries.push({
              id: `open-${acc.id}`,
              date: openDate,
              description: 'Opening Balance (Overdraft)',
              reference: 'OPENING',
              debit: 0,
              credit: Math.abs(openBal),
              balance: 0
            });
            account.totalCredit += Math.abs(openBal);
          }
        } else {
          if (openBal > 0) {
            account.entries.push({
              id: `open-${acc.id}`,
              date: openDate,
              description: 'Opening Balance (Debt)',
              reference: 'OPENING',
              debit: 0,
              credit: openBal,
              balance: 0
            });
            account.totalCredit += openBal;
          } else {
            account.entries.push({
              id: `open-${acc.id}`,
              date: openDate,
              description: 'Opening Balance',
              reference: 'OPENING',
              debit: Math.abs(openBal),
              credit: 0,
              balance: 0
            });
            account.totalDebit += Math.abs(openBal);
          }
        }
      }
    });

    // Process all posting transactions
    const postingRecords = allRecords.filter(r => {
      const st = (r.status || '').toLowerCase();
      return st !== 'cancelled' && st !== 'void';
    }).sort((a, b) => {
      const dateComp = (a.date || "").localeCompare(b.date || "");
      if (dateComp !== 0) return dateComp;
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.id || "").localeCompare(b.id || "");
    });

    postingRecords.forEach(rec => {
      const amt = Number(rec.amount) || 0;

      if (rec.type === 'income') {
        // Debit Asset/Liability, Credit Revenue
        if (rec.paymentAccountId) {
          const acc = findAccount(rec.paymentAccountId);
          if (acc) {
            const isAsset = ['bank_account', 'investment', 'other_asset'].includes(acc.type);
            const glType: GLAccountType = isAsset ? 'Asset' : 'Liability';
            const glAcc = getAccount(acc.id, acc.name, glType);
            glAcc.entries.push({
              id: `${rec.id}-dr`,
              date: rec.date || '',
              description: rec.description || rec.category || 'Income Inflow',
              reference: (rec.id || '').slice(-6) || 'INC',
              debit: amt,
              credit: 0,
              balance: 0,
              record: rec
            });
            glAcc.totalDebit += amt;
          }
        }
        
        const revCategory = rec.category || 'General Income';
        const revAcc = getAccount(`rev-${revCategory}`, revCategory, 'Revenue');
        revAcc.entries.push({
          id: `${rec.id}-cr`,
          date: rec.date || '',
          description: rec.description || rec.category || 'Income Inflow',
          reference: (rec.id || '').slice(-6) || 'INC',
          debit: 0,
          credit: amt,
          balance: 0,
          record: rec
        });
        revAcc.totalCredit += amt;
      } 
      else if (rec.type === 'expense') {
        // Debit Expense, Credit Asset/Liability
        const expCategory = rec.category || 'General Expense';
        const expAcc = getAccount(`exp-${expCategory}`, expCategory, 'Expense');
        expAcc.entries.push({
          id: `${rec.id}-dr`,
          date: rec.date || '',
          description: rec.description || rec.category || 'Expense Outflow',
          reference: (rec.id || '').slice(-6) || 'EXP',
          debit: amt,
          credit: 0,
          balance: 0,
          record: rec
        });
        expAcc.totalDebit += amt;

        if (rec.paymentAccountId) {
          const acc = findAccount(rec.paymentAccountId);
          if (acc) {
            const isAsset = ['bank_account', 'investment', 'other_asset'].includes(acc.type);
            const glType: GLAccountType = isAsset ? 'Asset' : 'Liability';
            const glAcc = getAccount(acc.id, acc.name, glType);
            glAcc.entries.push({
              id: `${rec.id}-cr`,
              date: rec.date || '',
              description: rec.description || rec.category || 'Expense Outflow',
              reference: (rec.id || '').slice(-6) || 'EXP',
              debit: 0,
              credit: amt,
              balance: 0,
              record: rec
            });
            glAcc.totalCredit += amt;
          }
        }
      }
      else if (rec.type === 'transfer') {
        // Credit From Account, Debit To Account
        const fromAcc = findAccount(rec.paymentAccountId);
        const toAcc = findAccount(rec.transferToAccountId);

        if (fromAcc) {
          const isAsset = ['bank_account', 'investment', 'other_asset'].includes(fromAcc.type);
          const glType: GLAccountType = isAsset ? 'Asset' : 'Liability';
          const glAcc = getAccount(fromAcc.id, fromAcc.name, glType);
          glAcc.entries.push({
            id: `${rec.id}-cr`,
            date: rec.date || '',
            description: rec.description || `Transfer to ${toAcc?.name || 'Destination Account'}`,
            reference: (rec.id || '').slice(-6) || 'TRF',
            debit: 0,
            credit: amt,
            balance: 0,
            record: rec
          });
          glAcc.totalCredit += amt;
        }

        if (toAcc) {
          const isAsset = ['bank_account', 'investment', 'other_asset'].includes(toAcc.type);
          const glType: GLAccountType = isAsset ? 'Asset' : 'Liability';
          const glAcc = getAccount(toAcc.id, toAcc.name, glType);
          glAcc.entries.push({
            id: `${rec.id}-dr`,
            date: rec.date || '',
            description: rec.description || `Transfer from ${fromAcc?.name || 'Source Account'}`,
            reference: (rec.id || '').slice(-6) || 'TRF',
            debit: amt,
            credit: 0,
            balance: 0,
            record: rec
          });
          glAcc.totalDebit += amt;
        }
      }
      else if (rec.type === 'journal') {
        const resolveGLAccount = (idOrName?: string) => {
          if (!idOrName) return null;
          if (idOrName.startsWith('rev-')) {
            const name = idOrName.replace('rev-', '');
            return getAccount(idOrName, name, 'Revenue');
          } else if (idOrName.startsWith('exp-')) {
            const name = idOrName.replace('exp-', '');
            return getAccount(idOrName, name, 'Expense');
          } else {
            const acc = findAccount(idOrName);
            if (acc) {
              const isAsset = ['bank_account', 'investment', 'other_asset'].includes(acc.type);
              const glType: GLAccountType = isAsset ? 'Asset' : 'Liability';
              return getAccount(acc.id, acc.name, glType);
            }
          }
          return null;
        };

        const fromAcc = resolveGLAccount(rec.paymentAccountId); // Credit
        const toAcc = resolveGLAccount(rec.transferToAccountId); // Debit
        
        if (fromAcc) {
          fromAcc.entries.push({
            id: `${rec.id}-cr`,
            date: rec.date || '',
            description: rec.description ? `${rec.description} (Journal Cr)` : 'Journal Credit',
            reference: (rec.id || '').slice(-6) || 'JRN',
            debit: 0,
            credit: amt,
            balance: 0,
            record: rec
          });
          fromAcc.totalCredit += amt;
        }
        if (toAcc) {
          toAcc.entries.push({
            id: `${rec.id}-dr`,
            date: rec.date || '',
            description: rec.description ? `${rec.description} (Journal Dr)` : 'Journal Debit',
            reference: (rec.id || '').slice(-6) || 'JRN',
            debit: amt,
            credit: 0,
            balance: 0,
            record: rec
          });
          toAcc.totalDebit += amt;
        }
      }
    });

    // Calculate balances and sort entries chronologically
    const result = Array.from(glAccounts.values());
    result.forEach(acc => {
      acc.entries.sort((a, b) => {
        const dateComp = (a.date || "").localeCompare(b.date || "");
        if (dateComp !== 0) return dateComp;
        if (a.id.startsWith('open-')) return -1;
        if (b.id.startsWith('open-')) return 1;
        return (a.id || "").localeCompare(b.id || "");
      });
    });

    return result.sort((a, b) => {
      const typeOrder = { 'Asset': 1, 'Liability': 2, 'Equity': 3, 'Revenue': 4, 'Expense': 5 };
      if (typeOrder[a.type as keyof typeof typeOrder] !== typeOrder[b.type as keyof typeof typeOrder]) {
        return typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder];
      }
      return a.name.localeCompare(b.name);
    });
  }, [allRecords, accounts]);

  const filteredGlData = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    return glData
      .filter(acc => {
        if (selectedType !== 'All' && acc.type !== selectedType) return false;
        if (cleanSearch && !acc.name.toLowerCase().includes(cleanSearch) && !acc.id.toLowerCase().includes(cleanSearch)) return false;
        return true;
      })
      .map(acc => {
        let periodOpeningBalance = 0;
        let periodDebit = 0;
        let periodCredit = 0;
        const filteredEntries = [];

        acc.entries.forEach(entry => {
          const entryDate = entry.date || '';
          if (startDate && entryDate < startDate) {
            if (acc.type === 'Asset' || acc.type === 'Expense') {
              periodOpeningBalance += (entry.debit - entry.credit);
            } else {
              periodOpeningBalance += (entry.credit - entry.debit);
            }
          } else if ((!startDate || entryDate >= startDate) && (!endDate || entryDate <= endDate)) {
            filteredEntries.push({ ...entry });
            periodDebit += entry.debit;
            periodCredit += entry.credit;
          }
        });

        if (startDate) {
          filteredEntries.unshift({
            id: `period-open-${acc.id}`,
            date: startDate,
            description: 'Opening Balance (Brought Forward)',
            reference: 'B/F',
            debit: 0,
            credit: 0,
            balance: periodOpeningBalance
          });
        }

        let currentBalance = startDate ? periodOpeningBalance : 0;
        const newEntries = filteredEntries.map(entry => {
          if (entry.id.startsWith('period-open-')) {
            return entry;
          }
          if (acc.type === 'Asset' || acc.type === 'Expense') {
            currentBalance += (entry.debit - entry.credit);
          } else {
            currentBalance += (entry.credit - entry.debit);
          }
          return { ...entry, balance: currentBalance };
        });

        return {
          ...acc,
          entries: newEntries,
          totalDebit: periodDebit,
          totalCredit: periodCredit,
          closingBalance: currentBalance
        };
      });
  }, [glData, selectedType, searchTerm, startDate, endDate]);

  const handleDownloadPDF = (account: GLAccount, sDateStr: string, eDateStr: string) => {
    try {
      const doc = new jsPDF();
      
      const sDate = sDateStr ? new Date(sDateStr).getTime() : 0;
      const eDate = eDateStr ? new Date(eDateStr).getTime() : Infinity;
      
      const filteredEntries = account.entries.filter(t => {
        if (t.id.startsWith('period-open-')) return true;
        const time = new Date(t.date).getTime();
        return time >= sDate && time <= eDate;
      });
      
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text(account.name, 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Account Type: ${account.type}`, 14, 30);
      doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 36);

      if (sDateStr || eDateStr) {
         doc.text(`Period: ${sDateStr ? format(new Date(sDateStr), 'MMM dd, yyyy') : 'All Time'} - ${eDateStr ? format(new Date(eDateStr), 'MMM dd, yyyy') : 'Current'}`, 14, 42);
      }
      
      doc.setDrawColor(200);
      doc.setFillColor(248, 250, 252);
      doc.rect(120, 16, 75, 28, 'FD');
      
      doc.setFontSize(9);
      doc.text('Total Debit:', 125, 22);
      doc.text(`Rs. ${account.totalDebit.toLocaleString('en-IN')}`, 190, 22, { align: 'right' });
      
      doc.text('Total Credit:', 125, 28);
      doc.text(`Rs. ${account.totalCredit.toLocaleString('en-IN')}`, 190, 28, { align: 'right' });
      
      doc.setFont(undefined, 'bold');
      doc.text('Closing Balance:', 125, 36);
      doc.text(`Rs. ${account.closingBalance.toLocaleString('en-IN')}`, 190, 36, { align: 'right' });

      doc.setFont(undefined, 'normal');

      const tableData = filteredEntries.map(t => [
        t.date ? format(new Date(t.date), 'yyyy-MM-dd') : '-',
        t.description,
        t.reference,
        t.debit > 0 ? `Rs. ${t.debit.toLocaleString('en-IN')}` : '-',
        t.credit > 0 ? `Rs. ${t.credit.toLocaleString('en-IN')}` : '-',
        `Rs. ${t.balance.toLocaleString('en-IN')}`
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['Date', 'Description', 'Reference', 'Debit (Dr)', 'Credit (Cr)', 'Balance']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`Statement_${account.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    }
  };


  const handleDownloadExcel = (account: GLAccount, sDateStr: string, eDateStr: string) => {
    try {
      const sDate = sDateStr ? new Date(sDateStr).getTime() : 0;
      const eDate = eDateStr ? new Date(eDateStr).getTime() : Infinity;
      
      const filteredEntries = account.entries.filter(t => {
        if (t.id.startsWith('period-open-')) return true;
        const time = new Date(t.date).getTime();
        return time >= sDate && time <= eDate;
      });

      const headerRow = [
        ["Account Name", account.name],
        ["Account Type", account.type],
        ["Generated on", format(new Date(), 'MMM dd, yyyy')],
        ["Period", sDateStr || eDateStr ? `${sDateStr ? format(new Date(sDateStr), 'MMM dd, yyyy') : 'All Time'} - ${eDateStr ? format(new Date(eDateStr), 'MMM dd, yyyy') : 'Current'}` : "All Time"],
        [],
        ["Total Debit", account.totalDebit],
        ["Total Credit", account.totalCredit],
        ["Closing Balance", account.closingBalance],
        [],
        ["Date", "Description", "Reference", "Debit (Dr)", "Credit (Cr)", "Balance"]
      ];

      const dataRows = filteredEntries.map(t => [
        t.date ? format(new Date(t.date), 'yyyy-MM-dd') : '-',
        t.description,
        t.reference,
        t.debit > 0 ? t.debit : '',
        t.credit > 0 ? t.credit : '',
        t.balance
      ]);

      const ws = XLSX.utils.aoa_to_sheet([...headerRow, ...dataRows]);
      
      ws['!cols'] = [
        { wch: 12 },
        { wch: 40 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ledger Statement");

      XLSX.writeFile(wb, `Statement_${account.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } catch (err) {
      console.error("Error generating Excel:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h3 className="text-lg font-bold text-primary tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> General Ledger
          </h3>
          <p className="text-xs text-gray-500 mt-1">Detailed double-entry view of all account debits and credits.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col xl:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 flex-1 sm:flex-none">
            <div className="w-36">
              <CustomDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Start Date"
              />
            </div>
            <span className="text-slate-400 text-xs font-bold">to</span>
            <div className="w-36">
              <CustomDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="End Date"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <CustomSelect
              value={selectedType}
              onChange={(val) => setSelectedType(val as any)}
              options={[
                { value: 'All', label: 'All Types' },
                { value: 'Asset', label: 'Assets' },
                { value: 'Liability', label: 'Liabilities' },
                { value: 'Revenue', label: 'Revenue' },
                { value: 'Expense', label: 'Expenses' }
              ]}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-[9px] text-sm focus-within:border-primary w-full sm:w-40"
              
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {filteredGlData.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
            No accounts found matching your filters.
          </div>
        ) : (
          filteredGlData.map(account => (
            <div key={account.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{account.name}</h4>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block
                    ${account.type === 'Asset' ? 'bg-emerald-100 text-emerald-700' : 
                      account.type === 'Liability' ? 'bg-rose-100 text-rose-700' : 
                      account.type === 'Revenue' ? 'bg-blue-100 text-blue-700' : 
                      'bg-amber-100 text-amber-700'}`}>
                    {account.type}
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Closing Balance</span>
                    <span className={`font-extrabold text-lg ${account.closingBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      ₹{account.closingBalance.toLocaleString('en-IN')}
                      <span className="text-xs font-normal text-slate-500 ml-1">
                        {account.type === 'Asset' || account.type === 'Expense' ? 'Dr' : 'Cr'}
                      </span>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setExportTargetAccount(account as GLAccount);
                      setExportStartDate(startDate);
                      setExportEndDate(endDate);
                      setExportFormat('excel');
                      setExportModalOpen(true);
                    }}
                    className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-primary hover:border-primary/30 hover:bg-primary/5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                    title="Export Statement"
                  >
                    <Download className="w-4 h-4" /> Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                      <th className="px-4 py-3 font-semibold w-24">Date</th>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold w-24">Ref</th>
                      <th className="px-4 py-3 font-semibold text-right w-32">Debit (Dr)</th>
                      <th className="px-4 py-3 font-semibold text-right w-32">Credit (Cr)</th>
                      <th className="px-4 py-3 font-semibold text-right w-32">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {account.entries.map((entry, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${entry.id.startsWith('period-open-') ? 'bg-slate-50/50 font-medium' : ''}`}>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {entry.id.startsWith('period-open-') ? (
                            <span className="text-slate-400 text-xs italic font-medium">B/F</span>
                          ) : entry.id.startsWith('open-') ? (
                            entry.date && !isNaN(new Date(entry.date).getTime()) ? (
                              <span className="text-slate-500 text-xs font-semibold">
                                {format(new Date(entry.date), 'MMM dd, yyyy')}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">Opening</span>
                            )
                          ) : entry.date && !isNaN(new Date(entry.date).getTime()) ? (
                            entry.record ? (
                              <button
                                type="button"
                                onClick={() => handleDateClick(entry.record!)}
                                className="font-medium text-slate-700 hover:text-indigo-600 hover:underline transition-colors text-left flex items-center gap-1.5 cursor-pointer group/btn"
                                title="Click to edit transaction date"
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
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition shadow-xs cursor-pointer group/btn"
                              title="No date set. Click to assign a date."
                            >
                              <Calendar className="w-3.5 h-3.5 text-amber-600 group-hover/btn:scale-110 transition-transform" />
                              <span>+ Add Date</span>
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          <div className="flex flex-col">
                            <span className="font-medium">{entry.description}</span>
                            {entry.record && (!entry.date || isNaN(new Date(entry.date).getTime())) && (
                              <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" /> Missing date
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs font-mono">{entry.reference}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                          {entry.debit > 0 ? entry.debit.toLocaleString('en-IN') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-rose-600 font-medium">
                          {entry.credit > 0 ? entry.credit.toLocaleString('en-IN') : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 font-semibold">
                          {entry.balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-600 text-xs uppercase tracking-wider">
                        Totals
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">
                        ₹{account.totalDebit.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">
                        ₹{account.totalCredit.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Export Statement Modal */}
      {exportModalOpen && exportTargetAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center">
                <Download className="w-4 h-4 mr-2 text-primary" />
                Export Ledger Statement
              </h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Export Format</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="excel"
                      checked={exportFormat === 'excel'}
                      onChange={() => setExportFormat('excel')}
                      className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 flex items-center">
                      <FileSpreadsheet className="w-4 h-4 mr-1 text-emerald-600" /> Excel
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={() => setExportFormat('pdf')}
                      className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 flex items-center">
                      <Download className="w-4 h-4 mr-1 text-indigo-600" /> PDF
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Export Filters (Date Range)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Start Date</label>
                    <CustomDatePicker
                      value={exportStartDate}
                      onChange={setExportStartDate}
                      placeholder="Start Date"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">End Date</label>
                    <CustomDatePicker
                      value={exportEndDate}
                      onChange={setExportEndDate}
                      placeholder="End Date"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Leave blank to export all available records.</p>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (exportFormat === 'excel') handleDownloadExcel(exportTargetAccount, exportStartDate, exportEndDate);
                  else handleDownloadPDF(exportTargetAccount, exportStartDate, exportEndDate);
                  setExportModalOpen(false);
                }}
                className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition shadow-sm flex items-center cursor-pointer"
              >
                <Download className="w-4 h-4 mr-1.5" /> Generate Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Date Assign Modal */}
      {quickDateModalOpen && quickDateRecord && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
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
