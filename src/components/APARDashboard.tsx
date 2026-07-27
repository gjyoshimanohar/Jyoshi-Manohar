import React, { useState, useEffect, useMemo } from 'react';
import { FinanceRecord, Invoice } from '../types';
import { invoiceService } from '../services/invoiceService';
import { Briefcase, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { format, isBefore } from 'date-fns';

interface Props {
  records: FinanceRecord[];
}

export default function APARDashboard({ records }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = invoiceService.subscribeToAllInvoices((data) => {
      setInvoices(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const {
    arTotal, arOverdue, arUpcoming, arItems,
    apTotal, apOverdue, apUpcoming, apItems
  } = useMemo(() => {
    const today = new Date();
    
    // Accounts Receivable (AR) -> Unpaid Invoices
    const arItemsList: any[] = [];
    let arTotalVal = 0;
    let arOverdueVal = 0;
    let arUpcomingVal = 0;

    invoices.forEach(inv => {
      if (inv.documentType === 'invoice' && ['sent', 'partial', 'overdue'].includes(inv.status)) {
        const balance = inv.total - (inv.amountPaid || 0);
        if (balance > 0) {
          arTotalVal += balance;
          const isOver = inv.dueDate ? isBefore(new Date(inv.dueDate), today) : false;
          if (isOver) arOverdueVal += balance;
          else arUpcomingVal += balance;
          
          arItemsList.push({
            id: inv.id,
            entity: inv.clientName,
            description: `Invoice #${inv.invoiceNumber}`,
            amount: balance,
            dueDate: inv.dueDate,
            isOverdue: isOver
          });
        }
      }
    });

    // Also include pending reimbursement records in AR
    records.forEach(rec => {
      if (rec.type === 'expense' && rec.isReceivableFromClient && rec.status === 'pending') {
        arTotalVal += rec.amount;
        const isOver = rec.dueDate ? isBefore(new Date(rec.dueDate), today) : isBefore(new Date(rec.date), today);
        if (isOver) arOverdueVal += rec.amount;
        else arUpcomingVal += rec.amount;
        
        arItemsList.push({
          id: rec.id,
          entity: rec.clientName || 'Unknown Client',
          description: rec.description || rec.category,
          amount: rec.amount,
          dueDate: rec.dueDate || rec.date,
          isOverdue: isOver
        });
      }
    });

    // Accounts Payable (AP) -> Unpaid Bills / Expenses
    const apItemsList: any[] = [];
    let apTotalVal = 0;
    let apOverdueVal = 0;
    let apUpcomingVal = 0;

    records.forEach(rec => {
      if (rec.type === 'expense' && rec.status === 'pending' && !rec.isReceivableFromClient) {
        apTotalVal += rec.amount;
        const isOver = rec.dueDate ? isBefore(new Date(rec.dueDate), today) : isBefore(new Date(rec.date), today);
        if (isOver) apOverdueVal += rec.amount;
        else apUpcomingVal += rec.amount;
        
        apItemsList.push({
          id: rec.id,
          entity: rec.category,
          description: rec.description || 'Pending Expense',
          amount: rec.amount,
          dueDate: rec.dueDate || rec.date,
          isOverdue: isOver
        });
      }
    });

    // Sort by due date
    arItemsList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    apItemsList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return {
      arTotal: arTotalVal, arOverdue: arOverdueVal, arUpcoming: arUpcomingVal, arItems: arItemsList,
      apTotal: apTotalVal, apOverdue: apOverdueVal, apUpcoming: apUpcomingVal, apItems: apItemsList
    };
  }, [invoices, records]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading AP/AR Data...</div>;
  }

  const List = ({ items, emptyMsg }: { items: any[], emptyMsg: string }) => (
    <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 italic">{emptyMsg}</p>
      ) : (
        items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors">
            <div className="flex flex-col">
              <span className="font-bold text-slate-800 text-sm">{item.entity}</span>
              <span className="text-xs text-slate-500">{item.description}</span>
              <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span className={item.isOverdue ? 'text-rose-600' : 'text-slate-500'}>
                  Due: {format(new Date(item.dueDate), 'MMM dd, yyyy')} {item.isOverdue && '(Overdue)'}
                </span>
              </div>
            </div>
            <span className={`font-extrabold ${item.isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
              ₹{item.amount.toLocaleString('en-IN')}
            </span>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h3 className="text-lg font-bold text-primary tracking-tight">💼 AP/AR Dashboard</h3>
          <p className="text-xs text-gray-500 mt-1">Track outstanding invoices (Receivables) and upcoming bills (Payables).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts Receivable */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <ArrowDownLeft className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Accounts Receivable</h3>
              <p className="text-xs text-slate-500">Money owed to you</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Outstanding</span>
              <span className="text-2xl font-extrabold text-emerald-700">₹{arTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <span className="block text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Overdue</span>
              <span className="text-2xl font-extrabold text-rose-700">₹{arOverdue.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Outstanding Invoices & Claims</h4>
          <List items={arItems} emptyMsg="No pending receivables." />
        </div>

        {/* Accounts Payable */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-rose-100 rounded-xl">
              <ArrowUpRight className="w-6 h-6 text-rose-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Accounts Payable</h3>
              <p className="text-xs text-slate-500">Money you owe</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <span className="block text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Total Payables</span>
              <span className="text-2xl font-extrabold text-amber-700">₹{apTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <span className="block text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Overdue</span>
              <span className="text-2xl font-extrabold text-rose-700">₹{apOverdue.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <h4 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">Upcoming Bills & Expenses</h4>
          <List items={apItems} emptyMsg="No pending payables." />
        </div>
      </div>
    </div>
  );
}
