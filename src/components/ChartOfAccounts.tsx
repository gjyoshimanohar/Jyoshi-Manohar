import React, { useMemo } from 'react';
import { FinanceRecord, PaymentAccount } from '../types';
import { Landmark, TrendingUp, TrendingDown, Layers, Scale, IndianRupee } from 'lucide-react';

interface Props {
  allRecords: FinanceRecord[];
  filteredRecords: FinanceRecord[];
  accounts: PaymentAccount[];
}

export default function ChartOfAccounts({ allRecords, filteredRecords, accounts }: Props) {
  const { assets, liabilities, revenue, expenses, equity } = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    
    const assetAccounts = accounts.filter(a => ['bank_account', 'investment', 'other_asset'].includes(a.type));
    const liabilityAccounts = accounts.filter(a => ['credit_card', 'loan', 'other_liability'].includes(a.type));
    
    const accountBalances: Record<string, number> = {};
    accounts.forEach(acc => {
      // Liabilities are tracked as positive debt in FinanceTracker, but let's just compute the net balance
      accountBalances[acc.id] = acc.type === 'credit_card' || acc.type === 'loan' ? -acc.openingBalance : acc.openingBalance;
    });
    
    allRecords.forEach(rec => {
      if (rec.status !== 'paid') return;
      
      if (rec.paymentAccountId && accountBalances[rec.paymentAccountId] !== undefined) {
        if (rec.type === 'income') {
          accountBalances[rec.paymentAccountId] += rec.amount;
        } else if (rec.type === 'expense') {
          accountBalances[rec.paymentAccountId] -= rec.amount;
        } else if (rec.type === 'transfer' && rec.transferToAccountId) {
          accountBalances[rec.paymentAccountId] -= rec.amount;
          if (accountBalances[rec.transferToAccountId] !== undefined) {
            accountBalances[rec.transferToAccountId] += rec.amount;
          }
        }
      }
    });
    
    const assetItems = assetAccounts.map(a => {
      const val = accountBalances[a.id];
      totalAssets += val;
      return { name: a.name, value: val };
    });
    
    const liabilityItems = liabilityAccounts.map(a => {
      const val = Math.abs(accountBalances[a.id]); // show debt as positive
      totalLiabilities += val;
      return { name: a.name, value: val };
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
    
    const revItems = Object.entries(revByCategory).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const expItems = Object.entries(expByCategory).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    
    const equityVal = totalAssets - totalLiabilities;
    
    return {
      assets: { total: totalAssets, items: assetItems },
      liabilities: { total: totalLiabilities, items: liabilityItems },
      revenue: { total: totalRev, items: revItems },
      expenses: { total: totalExp, items: expItems },
      equity: equityVal
    };
  }, [allRecords, filteredRecords, accounts]);

  const Section = ({ title, icon: Icon, total, items, colorClass }: any) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${colorClass.bg}`}>
            <Icon className={`w-5 h-5 ${colorClass.text}`} />
          </div>
          <h3 className="font-bold text-slate-800">{title}</h3>
        </div>
        <span className="font-extrabold text-slate-800">₹{total.toLocaleString('en-IN')}</span>
      </div>
      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No records found.</p>
        ) : (
          items.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <span className="text-slate-600 font-medium">{item.name}</span>
              <span className="text-slate-800 font-semibold">₹{item.value.toLocaleString('en-IN')}</span>
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
          <h3 className="text-lg font-bold text-primary tracking-tight">⚖️ Chart of Accounts</h3>
          <p className="text-xs text-gray-500 mt-1">Double-entry accounting balances organized by Assets, Liabilities, Equity, Revenue, and Expenses.</p>
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
    </div>
  );
}
