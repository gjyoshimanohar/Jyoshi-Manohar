import React, { useMemo, useState } from 'react';
import { FinanceRecord, PaymentAccount } from '../types';
import { FileSpreadsheet, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  allRecords: FinanceRecord[];
  accounts: PaymentAccount[];
  defaultSearchTerm?: string;
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

export default function GeneralLedger({ allRecords, accounts, defaultSearchTerm = '' }: Props) {
  const [searchTerm, setSearchTerm] = useState(defaultSearchTerm);
  const [selectedType, setSelectedType] = useState<GLAccountType | 'All'>('All');

  React.useEffect(() => {
    setSearchTerm(defaultSearchTerm);
  }, [defaultSearchTerm]);

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

    // Initialize physical accounts (Assets & Liabilities) with opening balances
    accounts.forEach(acc => {
      const isAsset = ['bank_account', 'investment', 'other_asset'].includes(acc.type);
      const glType: GLAccountType = isAsset ? 'Asset' : 'Liability';
      const account = getAccount(acc.id, acc.name, glType);
      
      // Opening balance
      if (acc.openingBalance > 0) {
        if (isAsset) {
          account.entries.push({
            id: `open-${acc.id}`,
            date: new Date(acc.createdAt).toISOString().split('T')[0],
            description: 'Opening Balance',
            reference: 'OPENING',
            debit: acc.openingBalance,
            credit: 0,
            balance: 0
          });
          account.totalDebit += acc.openingBalance;
        } else {
          account.entries.push({
            id: `open-${acc.id}`,
            date: new Date(acc.createdAt).toISOString().split('T')[0],
            description: 'Opening Balance',
            reference: 'OPENING',
            debit: 0,
            credit: acc.openingBalance,
            balance: 0
          });
          account.totalCredit += acc.openingBalance;
        }
      }
    });

    // Process all paid transactions
    const paidRecords = allRecords.filter(r => r.status === 'paid').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    paidRecords.forEach(rec => {
      if (rec.type === 'income') {
        // Debit Asset/Liability, Credit Revenue
        if (rec.paymentAccountId) {
          const acc = accounts.find(a => a.id === rec.paymentAccountId);
          if (acc) {
            const glType: GLAccountType = ['bank_account', 'investment', 'other_asset'].includes(acc.type) ? 'Asset' : 'Liability';
            const glAcc = getAccount(acc.id, acc.name, glType);
            glAcc.entries.push({
              id: `${rec.id}-dr`, date: rec.date, description: rec.description || rec.category, reference: rec.id.slice(-6), debit: rec.amount, credit: 0, balance: 0
            });
            glAcc.totalDebit += rec.amount;
          }
        }
        
        const revAcc = getAccount(`rev-${rec.category}`, rec.category, 'Revenue');
        revAcc.entries.push({
          id: `${rec.id}-cr`, date: rec.date, description: rec.description || rec.category, reference: rec.id.slice(-6), debit: 0, credit: rec.amount, balance: 0
        });
        revAcc.totalCredit += rec.amount;
      } 
      else if (rec.type === 'expense') {
        // Debit Expense, Credit Asset/Liability
        const expAcc = getAccount(`exp-${rec.category}`, rec.category, 'Expense');
        expAcc.entries.push({
          id: `${rec.id}-dr`, date: rec.date, description: rec.description || rec.category, reference: rec.id.slice(-6), debit: rec.amount, credit: 0, balance: 0
        });
        expAcc.totalDebit += rec.amount;

        if (rec.paymentAccountId) {
          const acc = accounts.find(a => a.id === rec.paymentAccountId);
          if (acc) {
            const glType: GLAccountType = ['bank_account', 'investment', 'other_asset'].includes(acc.type) ? 'Asset' : 'Liability';
            const glAcc = getAccount(acc.id, acc.name, glType);
            glAcc.entries.push({
              id: `${rec.id}-cr`, date: rec.date, description: rec.description || rec.category, reference: rec.id.slice(-6), debit: 0, credit: rec.amount, balance: 0
            });
            glAcc.totalCredit += rec.amount;
          }
        }
      }
      else if (rec.type === 'transfer' && rec.transferToAccountId && rec.paymentAccountId) {
        // Credit From Account, Debit To Account
        const fromAcc = accounts.find(a => a.id === rec.paymentAccountId);
        const toAcc = accounts.find(a => a.id === rec.transferToAccountId);

        if (fromAcc) {
          const glType: GLAccountType = ['bank_account', 'investment', 'other_asset'].includes(fromAcc.type) ? 'Asset' : 'Liability';
          const glAcc = getAccount(fromAcc.id, fromAcc.name, glType);
          glAcc.entries.push({
            id: `${rec.id}-cr`, date: rec.date, description: `Transfer to ${toAcc?.name || 'Unknown'}`, reference: rec.id.slice(-6), debit: 0, credit: rec.amount, balance: 0
          });
          glAcc.totalCredit += rec.amount;
        }

        if (toAcc) {
          const glType: GLAccountType = ['bank_account', 'investment', 'other_asset'].includes(toAcc.type) ? 'Asset' : 'Liability';
          const glAcc = getAccount(toAcc.id, toAcc.name, glType);
          glAcc.entries.push({
            id: `${rec.id}-dr`, date: rec.date, description: `Transfer from ${fromAcc?.name || 'Unknown'}`, reference: rec.id.slice(-6), debit: rec.amount, credit: 0, balance: 0
          });
          glAcc.totalDebit += rec.amount;
        }
      }
      else if (rec.type === 'journal' && rec.transferToAccountId && rec.paymentAccountId) {
        const resolveGLAccount = (id) => {
            if (id.startsWith('rev-')) {
               const name = id.replace('rev-', '');
               return getAccount(id, name, 'Revenue');
            } else if (id.startsWith('exp-')) {
               const name = id.replace('exp-', '');
               return getAccount(id, name, 'Expense');
            } else {
               const acc = accounts.find(a => a.id === id);
               if (acc) {
                 const glType = ['bank_account', 'investment', 'other_asset'].includes(acc.type) ? 'Asset' : 'Liability';
                 return getAccount(acc.id, acc.name, glType);
               }
            }
            return null;
        };

        const fromAcc = resolveGLAccount(rec.paymentAccountId); // Credit
        const toAcc = resolveGLAccount(rec.transferToAccountId); // Debit
        
        if (fromAcc) {
          fromAcc.entries.push({
            id: `${rec.id}-cr`, date: rec.date, description: `${rec.description} (Journal Cr)`, reference: rec.id.slice(-6), debit: 0, credit: rec.amount, balance: 0
          });
          fromAcc.totalCredit += rec.amount;
        }
        if (toAcc) {
          toAcc.entries.push({
            id: `${rec.id}-dr`, date: rec.date, description: `${rec.description} (Journal Dr)`, reference: rec.id.slice(-6), debit: rec.amount, credit: 0, balance: 0
          });
          toAcc.totalDebit += rec.amount;
        }
      }
    });
    // Calculate balances and sort
    const result = Array.from(glAccounts.values());
    result.forEach(acc => {
      acc.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let currentBalance = 0;
      acc.entries.forEach(entry => {
        if (acc.type === 'Asset' || acc.type === 'Expense') {
          currentBalance += (entry.debit - entry.credit);
        } else {
          currentBalance += (entry.credit - entry.debit);
        }
        entry.balance = currentBalance;
      });
      acc.closingBalance = currentBalance;
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
    return glData.filter(acc => {
      if (selectedType !== 'All' && acc.type !== selectedType) return false;
      if (searchTerm && !acc.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (acc.entries.length === 0) return false; // Hide unused accounts
      return true;
    });
  }, [glData, selectedType, searchTerm]);

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

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
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
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none w-full md:w-auto"
          >
            <option value="All">All Types</option>
            <option value="Asset">Assets</option>
            <option value="Liability">Liabilities</option>
            <option value="Revenue">Revenue</option>
            <option value="Expense">Expenses</option>
          </select>
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
              <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
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
                <div className="text-right">
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Closing Balance</span>
                  <span className={`font-extrabold text-lg ${account.closingBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    ₹{account.closingBalance.toLocaleString('en-IN')}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      {account.type === 'Asset' || account.type === 'Expense' ? 'Dr' : 'Cr'}
                    </span>
                  </span>
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
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {entry.date ? format(new Date(entry.date), 'MMM dd, yyyy') : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-800">{entry.description}</td>
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
    </div>
  );
}
