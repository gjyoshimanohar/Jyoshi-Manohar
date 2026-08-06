import React, { useState, useEffect, useMemo } from 'react';
import { FinanceRecord, Invoice, PaymentAccount, RecurringSchedule } from '../types';
import { invoiceService } from '../services/invoiceService';
import { recurringScheduleService } from '../services/recurringScheduleService';
import { 
  Briefcase, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar, 
  Repeat, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  Building2, 
  FileText, 
  Sparkles, 
  X, 
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { format, isBefore, addMonths, addDays } from 'date-fns';
import CustomDatePicker from './CustomDatePicker';

interface Props {
  records: FinanceRecord[];
  accounts?: PaymentAccount[];
  onRefreshRecords?: () => void;
}

const CATEGORY_OPTIONS = [
  "Rent & Housing",
  "Office Rent",
  "Software & Cloud",
  "Utilities & Bills",
  "Legal & Professional Fees",
  "Salaries & Payroll",
  "Marketing & Ads",
  "Insurance & SIP",
  "Vendor Payments",
  "Other Expense"
];

export default function APARDashboard({ records, accounts = [], onRefreshRecords }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Recurring Schedules State
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RecurringSchedule | null>(null);
  
  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formCategory, setFormCategory] = useState('Rent & Housing');
  const [formAmount, setFormAmount] = useState('');
  const [formFrequency, setFormFrequency] = useState<RecurringSchedule['frequency']>('monthly');
  const [formNextDueDate, setFormNextDueDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [formPaymentAccount, setFormPaymentAccount] = useState('');
  const [formScope, setFormScope] = useState<'business' | 'personal'>('business');
  const [formNotes, setFormNotes] = useState('');
  const [formAutoPost, setFormAutoPost] = useState(true);

  // Status message state
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const unsubscribe = invoiceService.subscribeToAllInvoices((data) => {
      setInvoices(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchSchedules = async () => {
    setSchedulesLoading(true);
    try {
      const data = await recurringScheduleService.getAllSchedules();
      setSchedules(data);
    } catch (err) {
      console.error("Failed to load recurring schedules:", err);
    } finally {
      setSchedulesLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

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

  // Compute summary stats for recurring schedules
  const { totalMonthlyCommitment, activeSchedulesCount } = useMemo(() => {
    let totalMonthly = 0;
    let activeCount = 0;

    schedules.forEach(s => {
      if (s.status === 'active') {
        activeCount++;
        let monthlyEquiv = s.amount;
        if (s.frequency === 'weekly') monthlyEquiv = s.amount * 4.33;
        else if (s.frequency === 'quarterly') monthlyEquiv = s.amount / 3;
        else if (s.frequency === 'yearly') monthlyEquiv = s.amount / 12;
        
        totalMonthly += monthlyEquiv;
      }
    });

    return {
      totalMonthlyCommitment: Math.round(totalMonthly),
      activeSchedulesCount: activeCount
    };
  }, [schedules]);

  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setFormTitle('');
    setFormVendor('');
    setFormCategory('Rent & Housing');
    setFormAmount('');
    setFormFrequency('monthly');
    setFormNextDueDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    setFormPaymentAccount(accounts[0]?.id || '');
    setFormScope('business');
    setFormNotes('');
    setFormAutoPost(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: RecurringSchedule) => {
    setEditingSchedule(s);
    setFormTitle(s.title);
    setFormVendor(s.vendorName || '');
    setFormCategory(s.category);
    setFormAmount(s.amount.toString());
    setFormFrequency(s.frequency);
    setFormNextDueDate(s.nextDueDate);
    setFormPaymentAccount(s.paymentAccountId || '');
    setFormScope(s.scope);
    setFormNotes(s.notes || '');
    setFormAutoPost(s.autoPost !== false);
    setIsModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAmount || isNaN(Number(formAmount))) {
      showNotification('Please enter a valid title and amount.', 'error');
      return;
    }

    const payload = {
      title: formTitle.trim(),
      vendorName: formVendor.trim(),
      category: formCategory,
      amount: Number(formAmount),
      frequency: formFrequency,
      nextDueDate: formNextDueDate,
      paymentAccountId: formPaymentAccount,
      scope: formScope,
      status: editingSchedule ? editingSchedule.status : 'active',
      notes: formNotes.trim(),
      autoPost: formAutoPost
    };

    try {
      if (editingSchedule) {
        await recurringScheduleService.updateSchedule(editingSchedule.id, payload);
        showNotification(`Updated schedule "${formTitle.trim()}"`);
      } else {
        await recurringScheduleService.createSchedule(payload);
        showNotification(`Created recurring schedule "${formTitle.trim()}"`);
      }
      setIsModalOpen(false);
      fetchSchedules();
    } catch (err) {
      console.error(err);
      showNotification('Failed to save schedule.', 'error');
    }
  };

  const handleToggleStatus = async (schedule: RecurringSchedule) => {
    const newStatus = schedule.status === 'active' ? 'paused' : 'active';
    try {
      await recurringScheduleService.updateSchedule(schedule.id, { status: newStatus });
      showNotification(`Schedule "${schedule.title}" is now ${newStatus}`);
      fetchSchedules();
    } catch (err) {
      showNotification('Failed to toggle status', 'error');
    }
  };

  const handleDeleteSchedule = async (schedule: RecurringSchedule) => {
    if (!window.confirm(`Are you sure you want to delete "${schedule.title}" recurring schedule?`)) return;
    try {
      await recurringScheduleService.deleteSchedule(schedule.id);
      showNotification(`Deleted schedule "${schedule.title}"`);
      fetchSchedules();
    } catch (err) {
      showNotification('Failed to delete schedule', 'error');
    }
  };

  const handleGenerateBillNow = async (schedule: RecurringSchedule) => {
    try {
      await recurringScheduleService.generateBillFromSchedule(schedule, 'pending');
      showNotification(`Generated pending bill of ₹${schedule.amount.toLocaleString('en-IN')} for "${schedule.title}"`);
      fetchSchedules();
      if (onRefreshRecords) onRefreshRecords();
    } catch (err) {
      console.error(err);
      showNotification('Failed to generate pending bill', 'error');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading AP/AR Data...</div>;
  }

  const List = ({ items, emptyMsg }: { items: any[], emptyMsg: string }) => (
    <div className="space-y-3 mt-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
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
      {/* Toast Notification */}
      {actionMessage && (
        <div className={`p-3 px-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md animate-fade-in ${
          actionMessage.type === 'success' ? 'bg-emerald-800 text-white' : 'bg-rose-800 text-white'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <AlertCircle className="w-4 h-4 text-rose-300" />}
          {actionMessage.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h3 className="text-lg font-bold text-primary tracking-tight flex items-center gap-2">
            💼 AP/AR & Recurring Liabilities Dashboard
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Manage upcoming bills, receivables, and recurring liability schedules like rent and subscriptions.
          </p>
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
              <p className="text-xs text-slate-500">Money owed to you from invoices & client claims</p>
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
              <p className="text-xs text-slate-500">Money you owe to vendors & suppliers</p>
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

      {/* RECURRING PAYMENT SCHEDULES SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Repeat className="w-6 h-6 text-indigo-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">Recurring Payment Schedules</h3>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Liabilities & Subscriptions
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Set up recurring payment schedules for office rent, software retainers, internet utilities, and professional fees.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="bg-[#1a2b58] hover:bg-[#1a2b58]/90 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-[#AD8D3E]" /> Set Up Recurring Schedule
          </button>
        </div>

        {/* Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-3">
            <div className="p-2.5 bg-indigo-200/60 text-indigo-800 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block">
                Monthly Recurring Commitment
              </span>
              <span className="text-xl font-extrabold text-indigo-900 mt-0.5 block">
                ₹{totalMonthlyCommitment.toLocaleString('en-IN')}<span className="text-xs font-normal text-indigo-600">/mo</span>
              </span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center gap-3">
            <div className="p-2.5 bg-emerald-200/60 text-emerald-800 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Active Liability Schedules
              </span>
              <span className="text-xl font-extrabold text-emerald-900 mt-0.5 block">
                {activeSchedulesCount} Active
              </span>
            </div>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-center gap-3">
            <div className="p-2.5 bg-amber-200/60 text-amber-900 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                Auto-Bill Generation
              </span>
              <span className="text-xs font-bold text-amber-900 mt-1 block">
                Instantly posts pending bills to Accounts Payable queue
              </span>
            </div>
          </div>
        </div>

        {/* Schedules Cards List */}
        {schedulesLoading ? (
          <p className="text-center py-6 text-slate-400 text-xs">Loading recurring schedules...</p>
        ) : schedules.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            <Repeat className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No Recurring Payment Schedules Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Create recurring schedules for rent, subscriptions, or utilities to automate your accounts payable tracking.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 bg-[#1a2b58] text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Set Up Schedule
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schedules.map((schedule) => {
              const account = accounts.find(a => a.id === schedule.paymentAccountId);
              const isOverdue = isBefore(new Date(schedule.nextDueDate), new Date());

              return (
                <div 
                  key={schedule.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    schedule.status === 'active' 
                      ? 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md' 
                      : 'bg-slate-50 border-slate-200 opacity-70'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-800 text-sm">{schedule.title}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            schedule.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {schedule.status}
                          </span>
                        </div>
                        {schedule.vendorName && (
                          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" /> Payee: {schedule.vendorName}
                          </p>
                        )}
                      </div>

                      <span className="text-base font-extrabold text-slate-900 shrink-0">
                        ₹{schedule.amount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] my-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md capitalize">
                        {schedule.frequency}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md">
                        {schedule.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-bold ${
                        schedule.scope === 'personal' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {schedule.scope === 'personal' ? 'Private' : 'Corporate'}
                      </span>
                      {account && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded-md flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-emerald-600" /> {account.name}
                        </span>
                      )}
                    </div>

                    {/* Next Due Info */}
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs mb-3">
                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Next Due:
                      </span>
                      <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                        {format(new Date(schedule.nextDueDate), 'MMM dd, yyyy')} {isOverdue && '(Due/Overdue)'}
                      </span>
                    </div>

                    {schedule.notes && (
                      <p className="text-[11px] text-slate-500 italic line-clamp-2 mb-3">
                        "{schedule.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                    <button
                      onClick={() => handleGenerateBillNow(schedule)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                      title="Post pending bill into Accounts Payable queue"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Generate Bill
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(schedule)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          schedule.status === 'active' 
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' 
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={schedule.status === 'active' ? 'Pause Schedule' : 'Activate Schedule'}
                      >
                        {schedule.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(schedule)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Schedule"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteSchedule(schedule)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT RECURRING SCHEDULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-[#1a2b58] text-white p-4 sm:p-5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Repeat className="w-5 h-5 text-[#AD8D3E]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingSchedule ? 'Edit Recurring Payment Schedule' : 'Set Up Recurring Payment Schedule'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Recurring liability schedule for office rent, SaaS, or retainers.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSchedule} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              
              {/* Title / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Liability Schedule Title *
                </label>
                <input 
                  type="text" 
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. CBD Plaza Office Lease Rent"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Vendor / Payee */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payee / Vendor Name
                </label>
                <input 
                  type="text" 
                  value={formVendor}
                  onChange={e => setFormVendor(e.target.value)}
                  placeholder="e.g. CBD Plaza Realty Corp"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Expense Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {CATEGORY_OPTIONS.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recurring Amount (₹) *
                  </label>
                  <input 
                    type="number" 
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                    required
                  />
                </div>
              </div>

              {/* Frequency & Next Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Frequency
                  </label>
                  <select
                    value={formFrequency}
                    onChange={e => setFormFrequency(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-semibold"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Next Due Date
                  </label>
                  <CustomDatePicker
                    value={formNextDueDate}
                    onChange={val => setFormNextDueDate(val)}
                  />
                </div>
              </div>

              {/* Payment Account & Scope */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preferred Payment Account
                  </label>
                  <select
                    value={formPaymentAccount}
                    onChange={e => setFormPaymentAccount(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="">-- Optional --</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Accounting Scope
                  </label>
                  <select
                    value={formScope}
                    onChange={e => setFormScope(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="business">Corporate / Business</option>
                    <option value="personal">Private / Personal</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notes & Instructions
                </label>
                <textarea 
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="e.g. Invoice usually arrives on 28th. Direct debit set up on SBI account."
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1a2b58] hover:bg-[#1a2b58]/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {editingSchedule ? 'Save Changes' : 'Create Schedule'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
