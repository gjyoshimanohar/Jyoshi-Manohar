import React, { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';
import { 
  Plus, Trash2, Eye, Edit2, Download, CheckCircle, Clock, 
  AlertCircle, XCircle, Printer, ArrowLeft, Mail, FileText, 
  Check, DollarSign, Calendar, ChevronRight, Send, Search, Filter, ShieldAlert
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { settingsService, InvoiceSettings } from '../services/settingsService';
import { productService, Product } from '../services/productService';
import { invoiceService } from '../services/invoiceService';
import { financeService } from '../services/financeService';
import { Invoice, InvoiceItem, InvoicePayment } from '../types';
import { format, isAfter, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const getCurrencySymbol = (code?: string) => {
  switch(code) {
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'INR': return '₹';
    default: return '₹';
  }
};

export interface ClientType {
  uid: string;
  email: string;
  displayName?: string;
  address?: string;
  mobile?: string;
}

interface InvoiceManagementProps {
  isAdmin: boolean;
  clients?: ClientType[];
}

export default function InvoiceManagement({ isAdmin, clients }: InvoiceManagementProps) {
  // States
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Active states for editing / viewing
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Form fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [documentType, setDocumentType] = useState<'invoice' | 'estimate'>('invoice');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [issueDate, setIssueDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(() => format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [taxRate, setTaxRate] = useState<number>(5);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage'|'fixed'>('fixed');
  const [currency, setCurrency] = useState('INR');
  const [paymentTerms, setPaymentTerms] = useState('Net 15');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Consulting Services', quantity: 1, rate: 150, amount: 150 }
  ]);
    const [formStatus, setFormStatus] = useState<'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled'>('draft');

  // Recurring & Payment States
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  
  // Payment Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');

  // Products & Settings
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);


  // Load invoices
  useEffect(() => {
    if (!auth.currentUser) return;

    let unsubscribe: () => void;
    
    if (isAdmin) {
      unsubscribe = invoiceService.subscribeToAllInvoices((data) => {
        setInvoices(data);
        setLoading(false);
      }, (err) => {
        console.error("Failed to fetch invoices", err);
        setLoading(false);
      });
    } else {
      unsubscribe = invoiceService.subscribeToUserInvoices(auth.currentUser.uid, (data) => {
        setInvoices(data);
        setLoading(false);
      }, (err) => {
        console.error("Failed to fetch user invoices", err);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAdmin]);

  // Set sender defaults once auth is loaded
  useEffect(() => {
    const unsubSettings = settingsService.subscribeToInvoiceSettings((settings) => {
      if (settings) {
        setSenderName('Jyoshi Manohar');
        setSenderEmail(settings.senderEmail || auth.currentUser?.email || '');
        setSenderAddress(settings.senderAddress || '');
      } else {
        setSenderName('Jyoshi Manohar');
        setSenderEmail(auth.currentUser?.email || '');
        setSenderAddress('');
      }
    });

    const unsubProducts = productService.subscribeToProducts((data) => {
      setProducts(data);
    });

    return () => {
      unsubSettings();
      unsubProducts();
    };
  }, []);

  // Auto-generate invoice number based on invoice list size
  useEffect(() => {
    if (!isFormOpen || selectedInvoice) return;
    const count = invoices.length + 1;
    const year = new Date().getFullYear();
    setInvoiceNumber(`INV-${year}-${String(count).padStart(4, '0')}`);
  }, [isFormOpen, selectedInvoice, invoices]);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxableSubtotal = items.reduce((sum, item) => sum + (item.taxable !== false ? item.amount : 0), 0);
  const taxAmount = (taxableSubtotal * taxRate) / 100;
  const computedDiscount = discountType === 'percentage' ? (subtotal * discount) / 100 : discount;
  const total = subtotal + taxAmount - computedDiscount;

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'service',
      taxable: true,
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, key: keyof InvoiceItem, value: any) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [key]: value };
        if (key === 'quantity' || key === 'rate') {
          const q = key === 'quantity' ? Number(value) : item.quantity;
          const r = key === 'rate' ? Number(value) : item.rate;
          updatedItem.amount = q * r;
        }
        return updatedItem;
      }
      return item;
    });
    setItems(updated);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (!clientName || !clientEmail || items.some(i => !i.description)) {
      alert("Please fill in all client details and description for all items.");
      return;
    }

    const payload = {
      userId: auth.currentUser.uid,
      invoiceNumber,
      documentType,
      clientName,
      clientEmail,
      clientAddress,
      senderName,
      senderEmail,
      senderAddress,
      issueDate,
      dueDate,
      status: formStatus as any,
      items,
      taxRate,
      discount,
      discountType,
      currency,
      paymentTerms,
      termsAndConditions,
      subtotal,
      total,
      notes,
      isRecurring,
      recurringInterval,
      amountPaid,
      payments
    };

    try {
      let savedInvoiceId;
      if (selectedInvoice) {
        await invoiceService.updateInvoice(selectedInvoice.id, payload);
        savedInvoiceId = selectedInvoice.id;
      } else {
        const newInv = await invoiceService.createInvoice(payload);
        savedInvoiceId = newInv.id;
      }
      
      // Sync with finance tracker
      if (documentType === 'invoice') {
        const existingRecord = await financeService.getRecordByInvoiceId(savedInvoiceId);
        
        let recordStatus: 'paid' | 'pending' | 'overdue' = 'pending';
        if (formStatus === 'paid') recordStatus = 'paid';
        if (formStatus === 'overdue') recordStatus = 'overdue';

        if (existingRecord) {
          await financeService.updateRecord(existingRecord.id, {
            amount: total,
            status: recordStatus,
            clientName: clientName
          });
        } else {
          await financeService.createRecord({
            type: 'income',
            category: 'Sales',
            amount: total,
            description: `Invoice ${invoiceNumber}`,
            date: issueDate,
            status: recordStatus,
            clientName: clientName,
            invoiceId: savedInvoiceId
          });
        }
      }

      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error saving invoice", err);
    }
  };

  const resetForm = () => {
    setSelectedInvoice(null);
    setInvoiceNumber('');
    setDocumentType('invoice');
    setClientName('');
    setClientEmail('');
    setClientAddress('');
    setIssueDate(format(new Date(), 'yyyy-MM-dd'));
    setDueDate(format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    setTaxRate(5);
    setDiscount(0);
    setDiscountType('fixed');
    setPaymentTerms('Net 15');
    setTermsAndConditions('');
    setNotes('');
    setItems([{ id: '1', type: 'service', description: 'Consulting Services', quantity: 1, rate: 150, amount: 150 }]);
    setFormStatus('draft');
    setIsRecurring(false);
    setRecurringInterval('monthly');
    setAmountPaid(0);
    setPayments([]);
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceNumber(invoice.invoiceNumber);
    setDocumentType(invoice.documentType || 'invoice');
    setClientName(invoice.clientName);
    setClientEmail(invoice.clientEmail);
    setClientAddress(invoice.clientAddress || '');
    setSenderName(invoice.senderName || '');
    setSenderEmail(invoice.senderEmail || '');
    setSenderAddress(invoice.senderAddress || '');
    setIssueDate(invoice.issueDate);
    setDueDate(invoice.dueDate);
    setTaxRate(invoice.taxRate);
    setDiscount(invoice.discount);
    setDiscountType(invoice.discountType || 'fixed');
    setCurrency(invoice.currency || 'INR');
    setPaymentTerms(invoice.paymentTerms || 'Net 15');
    setTermsAndConditions(invoice.termsAndConditions || '');
    setNotes(invoice.notes || '');
    setItems(invoice.items);
    setFormStatus(invoice.status as any);
    setIsRecurring(invoice.isRecurring || false);
    setRecurringInterval(invoice.recurringInterval || 'monthly');
    setAmountPaid(invoice.amountPaid || 0);
    setPayments(invoice.payments || []);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await invoiceService.deleteInvoice(id);
    } catch (err) {
      console.error("Error deleting invoice", err);
    }
  };

  const handleUpdateStatus = async (invoice: Invoice, newStatus: Invoice['status']) => {
    try {
      await invoiceService.updateInvoice(invoice.id, { status: newStatus });
    } catch (err) {
      console.error("Error updating status", err);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  // Filter & Search
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check overdue status on-the-fly for presentation
    let status = inv.status;
    if (status === 'sent' && isAfter(new Date(), parseISO(inv.dueDate))) {
      status = 'overdue';
    }

    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate high-level stats
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.total, 0);
  const paidInvoiced = invoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
  const outstandingInvoiced = invoices.reduce((sum, i) => sum + (i.status !== 'draft' && i.status !== 'cancelled' ? Math.max(0, i.total - (i.amountPaid || 0)) : 0), 0);
  const overdueInvoiced = invoices.reduce((sum, i) => {
    const isOverdue = (i.status === 'sent' || i.status === 'overdue' || i.status === 'partial') && isAfter(new Date(), parseISO(i.dueDate));
    return sum + (isOverdue ? Math.max(0, i.total - (i.amountPaid || 0)) : 0);
  }, 0);

  // Revenue Chart Data (Last 6 months)
  const chartData = React.useMemo(() => {
    const months: Record<string, { name: string, invoiced: number, paid: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = format(d, 'yyyy-MM');
      months[key] = { name: format(d, 'MMM'), invoiced: 0, paid: 0 };
    }
    
    invoices.forEach(inv => {
      const monthKey = inv.issueDate.substring(0, 7);
      if (months[monthKey]) {
        months[monthKey].invoiced += inv.total;
        if (inv.status === 'paid' || inv.status === 'partial') {
           months[monthKey].paid += (inv.amountPaid || (inv.status === 'paid' ? inv.total : 0));
        }
      }
    });
    return Object.values(months);
  }, [invoices]);

  // Aging Report Data
  const agingData = React.useMemo(() => {
    let current = 0, thirty = 0, sixty = 0, ninetyPlus = 0;
    const now = new Date();
    
    invoices.forEach(inv => {
      if (inv.status !== 'paid' && inv.status !== 'draft' && inv.status !== 'cancelled') {
        const outstanding = Math.max(0, inv.total - (inv.amountPaid || 0));
        const due = parseISO(inv.dueDate);
        
        if (!isAfter(now, due)) {
          current += outstanding;
        } else {
          const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 3600 * 24));
          if (diffDays <= 30) thirty += outstanding;
          else if (diffDays <= 60) sixty += outstanding;
          else ninetyPlus += outstanding;
        }
      }
    });
    
    return [
      { name: 'Current', amount: current },
      { name: '1-30 Days', amount: thirty },
      { name: '31-60 Days', amount: sixty },
      { name: '60+ Days', amount: ninetyPlus },
    ];
  }, [invoices]);

  // Status Colors helper
  const getStatusBadge = (status: Invoice['status'], dueDateStr: string) => {
    let resolvedStatus = status;
    if (status === 'sent' && isAfter(new Date(), parseISO(dueDateStr))) {
      resolvedStatus = 'overdue';
    }

    switch (resolvedStatus) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5" /> Paid
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-blue-100">
            <Clock className="w-3.5 h-3.5" /> Sent
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-rose-100 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" /> Overdue
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-200">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-100">
            <FileText className="w-3.5 h-3.5" /> Draft
          </span>
        );
    }
  };

  return (
    <div id="invoice-management-system" className="w-[96%] mx-auto py-4 font-sans select-none pb-24">
      {/* Printable Wrapper */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-invoice-modal, #print-invoice-modal * {
            visibility: visible;
          }
          #print-invoice-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* DASHBOARD SUMMARY BLOCKS */}
      <div className="no-print grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all hover:-translate-y-0.5 cursor-pointer">
          <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center border border-slate-100">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Invoiced
            </span>
            <h4 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              ₹{totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all hover:-translate-y-0.5 cursor-pointer">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Received Payments
            </span>
            <h4 className="text-xl font-bold text-emerald-600 tracking-tight mt-0.5">
              ₹{paidInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all hover:-translate-y-0.5 cursor-pointer">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Outstanding Balances
            </span>
            <h4 className="text-xl font-bold text-blue-600 tracking-tight mt-0.5">
              ₹{outstandingInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all hover:-translate-y-0.5 cursor-pointer">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Overdue Balances
            </span>
            <h4 className="text-xl font-bold text-rose-600 tracking-tight mt-0.5">
              ₹{overdueInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>
        </div>
      </div>

      {/* FINANCIAL DASHBOARD CHARTS */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] lg:col-span-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">6-Month Revenue Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value.toFixed(2)}`]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area type="monotone" name="Total Invoiced" dataKey="invoiced" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorInvoiced)" />
                <Area type="monotone" name="Total Paid" dataKey="paid" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPaid)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">A/R Aging Summary</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(val) => `${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  formatter={(value: number) => [`${value.toFixed(2)}`, 'Outstanding']}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Bar dataKey="amount" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ACTION TOOLBAR & FILTERS */}
      <div className="no-print bg-white rounded-2xl border border-slate-100 p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by invoice number, client details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1a2b58] focus:bg-white transition-all text-slate-800"
            />
          </div>

          {/* Filter Status select */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-sm shrink-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer min-w-[160px]">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: "all", label: "All Invoice Statuses" },
                { value: "draft", label: "Drafts" },
                { value: "sent", label: "Sent" },
                { value: "paid", label: "Paid" },
                { value: "overdue", label: "Overdue" },
                { value: "cancelled", label: "Cancelled" }
              ]}
              className="bg-transparent border-none text-slate-700 text-xs font-semibold focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Create Invoice trigger */}
        <button 
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="flex items-center justify-center gap-2 bg-[#1a2b58] hover:bg-[#121f40] text-white font-semibold text-sm px-4.5 py-2.5 rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Generate Invoice
        </button>
      </div>

      {/* MAIN DATA TABLE LIST */}
      <div className="no-print bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-8 h-8 border-4 border-t-indigo-600 border-gray-100 rounded-full animate-spin mb-4" />
            <span className="text-sm font-medium">Fetching real-time invoices...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText className="w-12 h-12 text-gray-200 mb-3" />
            <span className="text-sm font-semibold text-slate-700">No Invoices Found</span>
            <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">
              Generate invoice lists to invoice consulting engagements, compliance files, and more.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Client Detail</th>
                  <th className="px-6 py-4">Dates (Issue / Due)</th>
                  <th className="px-6 py-4">Total Price</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredInvoices.map(invoice => {
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{invoice.clientName}</div>
                        <div className="text-xs text-slate-400">{invoice.clientEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{invoice.issueDate}</span>
                          <ChevronRight className="w-3 h-3 text-gray-300" />
                          <span className="font-medium text-slate-800">{invoice.dueDate}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-gray-950">
                        {getCurrencySymbol(invoice.currency)}{invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(invoice.status, invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View */}
                          <button 
                            onClick={() => { setSelectedInvoice(invoice); setIsViewOpen(true); }}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="View Invoice Sheet"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit (only drafts or sent) */}
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <button 
                              onClick={() => handleEdit(invoice)}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Modify invoice details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Mark as Paid / Unpaid */}
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <button 
                              onClick={() => handleUpdateStatus(invoice, 'paid')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Mark Invoice as Paid"
                            >
                              <Check className="w-4 h-4 font-bold" />
                            </button>
                          )}

                          {/* Delete */}
                          <button 
                            onClick={() => handleDelete(invoice.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete invoice record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW INVOICE DETAILED PANEL MODAL */}
      {isViewOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col my-8">
            {/* Header controls */}
            <div className="no-print bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsViewOpen(false)}
                  className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-[#1a2b58] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to List
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Print Trigger */}
                <button 
                  onClick={triggerPrint}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </button>

                {/* Admin Actions */}
                {isAdmin ? (
                  <>
                    <button 
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Record Payment
                    </button>
                    <button 
                      onClick={() => alert(`Email dispatch queued successfully for ${selectedInvoice.clientEmail}`)}
                      className="flex items-center gap-1.5 bg-[#1a2b58] hover:bg-[#121f40] text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" /> Email Client
                    </button>
                  </>
                ) : (
                  <>
                    {selectedInvoice.status !== 'paid' && (
                      <button 
                        onClick={() => {
                          alert("Redirecting to secure Stripe checkout gateway...");
                        }}
                        className="flex items-center gap-1.5 bg-[#635BFF] hover:bg-[#5851e5] text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> Pay Now
                      </button>
                    )}
                  </>
                )}

                <button 
                  onClick={() => setIsViewOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE AREA */}
            <div id="print-invoice-modal" className="p-8 md:p-12 bg-white text-slate-800 flex-1">
              {/* Header Letterhead */}
              <div className="flex flex-col md:flex-row md:items-start justify-between border-b border-slate-100 pb-8 gap-6">
                <div>
                  <div className="text-2xl font-bold text-[#1a2b58] tracking-tight flex items-center gap-2">
                    <FileText className="w-7 h-7 text-indigo-500" />
                    <span>{selectedInvoice.senderName || 'Apex Consulting Ltd.'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm whitespace-pre-line leading-relaxed">
                    {selectedInvoice.senderAddress || '100 Financial Way, Suite 400, New York, NY 10005'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedInvoice.senderEmail || 'billing@apexconsulting.com'}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-tight">Invoice</h1>
                  <div className="font-mono text-sm font-bold text-indigo-600 mt-1">{selectedInvoice.invoiceNumber}</div>
                  
                  <div className="mt-4 grid grid-cols-2 md:block gap-2 text-xs">
                    <div className="mb-1">
                      <span className="text-slate-400 block md:inline md:mr-2">Date Issued:</span>
                      <span className="font-semibold text-slate-800">{selectedInvoice.issueDate}</span>
                    </div>
                    <div>
                      <span className="text-rose-400 block md:inline md:mr-2">Payment Due:</span>
                      <span className="font-semibold text-rose-600">{selectedInvoice.dueDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client & Sender Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 text-xs leading-relaxed">
                <div>
                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-2">Billed To</span>
                  <div className="text-sm font-bold text-slate-900">{selectedInvoice.clientName}</div>
                  <div className="text-slate-500 font-medium mt-1">{selectedInvoice.clientEmail}</div>
                  {selectedInvoice.clientAddress && (
                    <div className="text-slate-400 mt-2 whitespace-pre-line leading-relaxed">{selectedInvoice.clientAddress}</div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-2">Payment Guidelines</span>
                  <p className="text-slate-500 leading-relaxed">
                    All balances should be paid in full by the due date. Standard bank wires or checking transfers accepted. Thank you for your partnership.
                  </p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">Payment Terms:</span>
                    <span className="text-slate-600 font-medium">{selectedInvoice.paymentTerms || 'Due on Receipt'}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">Status:</span>
                    {getStatusBadge(selectedInvoice.status, selectedInvoice.dueDate)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden mb-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                      <th className="px-5 py-3">Description of Services / Items</th>
                      <th className="px-5 py-3 text-center w-20">Quantity</th>
                      <th className="px-5 py-3 text-right w-28">Rate ({getCurrencySymbol(selectedInvoice.currency)})</th>
                      <th className="px-5 py-3 text-right w-32">Line Total ({getCurrencySymbol(selectedInvoice.currency)})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedInvoice.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {item.type && (
                            <span className="inline-block bg-slate-100 text-slate-500 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded mr-2 align-middle">
                              {item.type}
                            </span>
                          )}
                          <span className="align-middle">{item.description}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center font-mono">{item.quantity}</td>
                        <td className="px-5 py-3.5 text-right font-mono">{getCurrencySymbol(selectedInvoice.currency)}{item.rate.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">{getCurrencySymbol(selectedInvoice.currency)}{item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment History */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="py-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Payment History</h4>
                  <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/50">
                        <tr>
                          <th className="px-4 py-2 font-semibold text-slate-500">Date</th>
                          <th className="px-4 py-2 font-semibold text-slate-500">Method</th>
                          <th className="px-4 py-2 font-semibold text-slate-500">Reference</th>
                          <th className="px-4 py-2 font-semibold text-slate-500 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedInvoice.payments.map(p => (
                          <tr key={p.id}>
                            <td className="px-4 py-2 text-slate-600">{p.date}</td>
                            <td className="px-4 py-2 text-slate-600">{p.method}</td>
                            <td className="px-4 py-2 text-slate-400">{p.reference || '-'}</td>
                            <td className="px-4 py-2 text-emerald-600 font-bold font-mono text-right">{getCurrencySymbol(selectedInvoice.currency)}{p.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Math summary breakdown */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-6 py-4">
                <div className="flex-1 text-xs text-slate-400">
                  {selectedInvoice.notes && (
                    <div className="mb-4">
                      <span className="font-semibold text-slate-500 block mb-1">Customer Notes:</span>
                      <p className="leading-relaxed whitespace-pre-line max-w-sm">{selectedInvoice.notes}</p>
                    </div>
                  )}
                  {selectedInvoice.termsAndConditions && (
                    <div>
                      <span className="font-semibold text-slate-500 block mb-1">Terms & Conditions:</span>
                      <p className="leading-relaxed whitespace-pre-line max-w-sm">{selectedInvoice.termsAndConditions}</p>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-80 shrink-0 text-xs text-slate-600 flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono font-semibold text-slate-800">{getCurrencySymbol(selectedInvoice.currency)}{selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>

                  {selectedInvoice.taxRate > 0 && (
                    <div className="flex justify-between">
                      <span>Service Tax ({selectedInvoice.taxRate}%)</span>
                      <span className="font-mono font-semibold text-slate-800">{getCurrencySymbol(selectedInvoice.currency)}{((selectedInvoice.subtotal * selectedInvoice.taxRate) / 100).toFixed(2)}</span>
                    </div>
                  )}

                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Client Discount</span>
                      <span className="font-mono font-semibold">
                        {selectedInvoice.discountType === 'percentage' 
                          ? `-${selectedInvoice.discount}% (${getCurrencySymbol(selectedInvoice.currency)}${((selectedInvoice.subtotal * selectedInvoice.discount) / 100).toFixed(2)})`
                          : `-${getCurrencySymbol(selectedInvoice.currency)}${selectedInvoice.discount.toFixed(2)}`
                        }
                      </span>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-bold text-slate-900">
                    <span>Total Due</span>
                    <span className="font-mono text-[#1a2b58]">{getCurrencySymbol(selectedInvoice.currency)}{selectedInvoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE & EDIT SLIDING DRAWER / FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-end z-[999] p-0 sm:p-4">
          <div className="bg-white h-[100dvh] sm:h-[95vh] w-full max-w-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                {selectedInvoice ? 'Edit Client Invoice' : 'Generate New Client Invoice'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
              {/* Top metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Type</label>
                  <CustomSelect
                    value={documentType}
                    onChange={(val) => setDocumentType(val as any)}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-white focus:outline-none focus:border-primary hover:shadow-sm transition-all text-primary"
                    options={[
                      { value: "invoice", label: "Invoice" },
                      { value: "estimate", label: "Estimate" }
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Document number <span className="text-gray-300 normal-case font-normal">(Auto)</span></label>
                  <input 
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold text-indigo-600 focus:outline-none focus:border-[#1a2b58]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Billing Status</label>
                  <CustomSelect
                    value={formStatus}
                    onChange={(val) => setFormStatus(val as any)}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-white focus:outline-none focus:border-primary hover:shadow-sm transition-all text-primary"
                    options={[
                      { value: "draft", label: "Draft (Private)" },
                      { value: "sent", label: "Sent (Active Balance)" },
                      { value: "paid", label: "Paid (Settled)" },
                      { value: "partial", label: "Partial Payment" },
                      { value: "overdue", label: "Overdue" },
                      { value: "cancelled", label: "Cancelled" }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Currency</label>
                  <CustomSelect
                    value={currency}
                    onChange={(val) => setCurrency(val)}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-white focus:outline-none focus:border-primary hover:shadow-sm transition-all text-primary"
                    options={[
                      { value: "USD", label: "USD ($)" },
                      { value: "EUR", label: "EUR (€)" },
                      { value: "GBP", label: "GBP (£)" },
                      { value: "INR", label: "INR (₹)" },
                      { value: "AUD", label: "AUD ($)" },
                      { value: "CAD", label: "CAD ($)" }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Payment Terms</label>
                  <CustomSelect
                    value={paymentTerms}
                    onChange={(val) => setPaymentTerms(val)}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-white focus:outline-none focus:border-primary hover:shadow-sm transition-all text-primary"
                    options={[
                      { value: "Due on Receipt", label: "Due on Receipt" },
                      { value: "Net 15", label: "Net 15" },
                      { value: "Net 30", label: "Net 30" },
                      { value: "Net 45", label: "Net 45" },
                      { value: "Net 60", label: "Net 60" },
                      { value: "Custom", label: "Custom" }
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Currency</label>
                  <CustomSelect
                    value={currency}
                    onChange={(val) => setCurrency(val)}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-white focus:outline-none focus:border-primary hover:shadow-sm transition-all text-primary"
                    options={[
                      { value: "USD", label: "USD ($)" },
                      { value: "EUR", label: "EUR (€)" },
                      { value: "GBP", label: "GBP (£)" },
                      { value: "INR", label: "INR (₹)" },
                      { value: "AUD", label: "AUD ($)" },
                      { value: "CAD", label: "CAD ($)" }
                    ]}
                  />
                </div>
              </div>

              {/* Billed To Client Details */}
              <div className="space-y-3">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Client Recipient</span>
                
                {clients && clients.length > 0 && (
                  <CustomSelect
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-white focus:outline-none focus:border-primary hover:shadow-sm transition-all text-primary"
                    value={clients.some(c => c.uid === selectedInvoice?.clientName) ? selectedInvoice?.clientName : ""}
                    placeholder="-- Select from Client Master --"
                    onChange={(val) => {
                      const selectedUid = val;
                      if (selectedUid) {
                        const client = clients.find(c => c.uid === selectedUid);
                        if (client) {
                          setClientName(client.displayName || client.email || '');
                          setClientEmail(client.email || '');
                          setClientAddress(client.address || '');
                        }
                      }
                    }}
                    options={[...clients.map(c => ({
                      value: c.uid,
                      label: c.displayName ? `${c.displayName} (${c.email})` : c.email
                    }))]}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="text"
                    placeholder="Client Full Name *"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                  />
                  <input 
                    type="email"
                    placeholder="Client Email Address *"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                  />
                </div>

                <textarea 
                  placeholder="Billing Address (Optional)"
                  rows={2}
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                />
              </div>

              {/* Sender Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Corporate Sender</span>
                  <button 
                    type="button" 
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    Edit Organization Details
                  </button>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                  <div className="font-bold text-slate-900">{senderName}</div>
                  <div className="text-slate-500 mt-0.5">{senderEmail}</div>
                  {senderAddress && <div className="text-slate-400 mt-1 whitespace-pre-wrap">{senderAddress}</div>}
                </div>
              </div>

              {/* Term Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Issue Date</label>
                  <input 
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Due Date</label>
                  <input 
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                  />
                  
                </div>
              </div>
              
              {/* Recurring Settings */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isRecurring" 
                    checked={isRecurring} 
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 text-[#1a2b58] rounded border-gray-300 focus:ring-[#1a2b58]"
                  />
                  <label htmlFor="isRecurring" className="text-xs font-semibold text-slate-700">Make this a recurring invoice</label>
                </div>
                {isRecurring && (
                  <CustomSelect
                    value={recurringInterval}
                    onChange={(val) => setRecurringInterval(val as any)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-white focus:outline-none focus:border-primary hover:shadow-sm transition-all text-primary"
                    options={[
                      { value: "weekly", label: "Weekly" },
                      { value: "monthly", label: "Monthly" },
                      { value: "yearly", label: "Yearly" }
                    ]}
                  />
                )}
              </div>

              {/* Line Items Editor Spreadsheet */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Line Items</span>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsProductsModalOpen(true)}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                    >
                      Manage Products
                    </button>
                    <button 
                      type="button"
                      onClick={handleAddItem}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="p-3">Description *</th>
                        <th className="p-3 text-center w-16">Qty</th>
                        <th className="p-3 text-right w-24">Rate</th>
                        <th className="p-3 text-right w-24">Total</th>
                        <th className="p-3 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="p-2 relative flex flex-col gap-1">
                            <select
                              value={item.type || 'service'}
                              onChange={(e) => handleItemChange(item.id, 'type', e.target.value)}
                              className="w-full border-none bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 p-1 text-[10px] focus:outline-none rounded font-semibold uppercase cursor-pointer"
                            >
                              <option value="service">Service</option>
                              <option value="time">Time</option>
                              <option value="expense">Expense</option>
                            </select>
                            <input 
                              type="text"
                              required
                              placeholder="e.g. Service or Engagement details"
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              className="w-full border border-slate-200 bg-transparent p-1.5 focus:outline-none focus:border-indigo-400 rounded"
                            />
                            {products.length > 0 && (
                              <select
                                className="w-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors p-1 text-[10px] focus:outline-none rounded text-slate-600 cursor-pointer"
                                onChange={(e) => {
                                  const selectedProd = products.find(p => p.id === e.target.value);
                                  if (selectedProd) {
                                    handleItemChange(item.id, 'description', selectedProd.name + (selectedProd.description ? ' - ' + selectedProd.description : ''));
                                    handleItemChange(item.id, 'rate', selectedProd.price);
                                  }
                                  e.target.value = "";
                                }}
                              >
                                <option value="">Or select from predefined products...</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.name} - {getCurrencySymbol(currency)}{p.price}</option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="p-2">
                            <input 
                              type="number"
                              required
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                              className="w-full border-none bg-transparent p-1 font-mono text-center focus:outline-none focus:bg-slate-50 rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number"
                              required
                              min="0"
                              value={item.rate}
                              onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full border-none bg-transparent p-1 font-mono text-right focus:outline-none focus:bg-slate-50 rounded"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-semibold text-slate-800 p-3">
                            ₹{item.amount.toFixed(2)}
                            <div className="mt-1 flex items-center justify-end gap-1">
                              <input 
                                type="checkbox" 
                                checked={item.taxable !== false} 
                                onChange={(e) => handleItemChange(item.id, 'taxable', e.target.checked)}
                                className="w-3 h-3 text-[#1a2b58] rounded border-gray-300"
                                title="Taxable"
                              />
                              <span className="text-[9px] text-slate-400">Tax</span>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <button 
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={items.length === 1}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary computation row */}
              <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row justify-between gap-6">
                {/* Notes and feedback */}
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Customer Notes</label>
                  <textarea 
                    placeholder="e.g. It was a pleasure working with you!"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58] mb-3"
                  />
                  
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Terms & Conditions</label>
                  <textarea 
                    placeholder="e.g. Please pay within 15 days by bank transfer."
                    rows={2}
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                  />
                </div>

                {/* Subtotals */}
                <div className="w-full sm:w-64 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-mono font-semibold text-slate-800">{getCurrencySymbol(currency)}{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Service Tax (%)</span>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-16 text-right border border-slate-200 px-1.5 py-1 rounded font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Discount</span>
                      <select 
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                        className="text-[10px] border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors rounded px-1 py-0.5 focus:outline-none cursor-pointer"
                      >
                        <option value="fixed">Fixed ({getCurrencySymbol(currency)})</option>
                        <option value="percentage">Percent (%)</option>
                      </select>
                    </div>
                    <input 
                      type="number"
                      min="0"
                      max={discountType === 'percentage' ? 100 : subtotal}
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 text-right border border-slate-200 px-1.5 py-1 rounded font-mono text-xs focus:outline-none text-emerald-600"
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-sm font-bold text-slate-900">
                    <span>Grand Total</span>
                    <span className="font-mono text-lg text-[#1a2b58]">{getCurrencySymbol(currency)}{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-slate-100 pt-5 flex items-center justify-end gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4.5 py-2.5 bg-slate-100 hover:bg-gray-200 text-slate-700 rounded-xl font-semibold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-[#1a2b58] hover:bg-[#121f40] text-white rounded-xl font-semibold text-xs shadow-sm cursor-pointer transition-all active:scale-[0.98]"
                >
                  {selectedInvoice ? 'Save Changes' : 'Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORGANIZATION SETTINGS MODAL */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Organization Settings</h3>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              settingsService.updateInvoiceSettings({ senderName, senderEmail, senderAddress });
              setIsSettingsModalOpen(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Company Name</label>
                <input 
                  type="text" 
                  value={senderName} 
                  onChange={(e) => setSenderName(e.target.value)} 
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm" 
                  readOnly
                />
                <span className="text-[10px] text-slate-400">Corporate sender name is strictly fixed to Jyoshi Manohar.</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Company Email</label>
                <input 
                  type="email" 
                  value={senderEmail} 
                  onChange={(e) => setSenderEmail(e.target.value)} 
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm" 
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Organization Address & Footer</label>
                <textarea 
                  value={senderAddress} 
                  onChange={(e) => setSenderAddress(e.target.value)} 
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm" 
                  rows={3} 
                />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCTS MODAL */}
      {isProductsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white w-full max-w-2xl h-[80vh] flex flex-col rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Manage Line Items / Products</h3>
              <button onClick={() => setIsProductsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Product Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget as HTMLFormElement;
                const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                const desc = (form.elements.namedItem('desc') as HTMLTextAreaElement).value;
                const price = parseFloat((form.elements.namedItem('price') as HTMLInputElement).value);
                if (editingProduct) {
                  await productService.updateProduct(editingProduct.id, { name, description: desc, price });
                  setEditingProduct(null);
                } else {
                  await productService.createProduct({ name, description: desc, price });
                }
                form.reset();
              }} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-sm font-semibold mb-3">{editingProduct ? 'Edit Product' : 'Add New Product'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <input name="name" type="text" placeholder="Product / Service Name *" required defaultValue={editingProduct?.name} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm" />
                  <input name="price" type="number" step="0.01" min="0" placeholder="Unit Price *" required defaultValue={editingProduct?.price} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm" />
                </div>
                <textarea name="desc" placeholder="Description (Optional)" rows={2} defaultValue={editingProduct?.description} className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm mb-3" />
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold">
                    {editingProduct ? 'Save Changes' : 'Add Product'}
                  </button>
                  {editingProduct && (
                    <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-gray-200 text-slate-700 rounded-lg text-sm font-semibold">
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* Product List */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-700">Existing Products</h4>
                {products.length === 0 ? (
                  <div className="text-sm text-slate-500 py-4 text-center border border-dashed rounded-xl">No products added yet.</div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {products.map(p => (
                      <div key={p.id} className="p-3 bg-white flex justify-between items-center hover:bg-slate-50/80 transition-colors">
                        <div>
                          <div className="font-semibold text-sm text-slate-900">{p.name} <span className="text-slate-500 ml-2 font-mono">{getCurrencySymbol(currency)}{p.price}</span></div>
                          {p.description && <div className="text-xs text-slate-500 mt-1">{p.description}</div>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingProduct(p)} className="p-1.5 text-indigo-600 hover:bg-primary/10 hover:text-primary rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => productService.deleteProduct(p.id)} className="p-1.5 text-red-600 hover:bg-rose-50 hover:text-rose-600 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Record Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const paymentValue = parseFloat(paymentAmount);
              if (isNaN(paymentValue) || paymentValue <= 0) return;
              
              const newPayment = {
                id: Math.random().toString(36).substring(2, 9),
                date: format(new Date(), 'yyyy-MM-dd'),
                amount: paymentValue,
                method: paymentMethod,
                reference: paymentReference
              };
              
              const updatedAmountPaid = (selectedInvoice.amountPaid || 0) + paymentValue;
              const newStatus = updatedAmountPaid >= selectedInvoice.total ? 'paid' : 'partial';
              
              const updatedPayments = [...(selectedInvoice.payments || []), newPayment];
              
              await invoiceService.updateInvoice(selectedInvoice.id, {
                amountPaid: updatedAmountPaid,
                payments: updatedPayments,
                status: newStatus
              });
              
              if (selectedInvoice.documentType === 'invoice') {
                const existingRecord = await financeService.getRecordByInvoiceId(selectedInvoice.id);
                if (existingRecord) {
                  let recordStatus: 'paid' | 'pending' | 'overdue' = 'pending';
                  if (newStatus === 'paid') recordStatus = 'paid';
                  
                  await financeService.updateRecord(existingRecord.id, {
                    status: recordStatus
                  });
                }
              }

              // update local view state
              setSelectedInvoice({
                ...selectedInvoice,
                amountPaid: updatedAmountPaid,
                payments: updatedPayments,
                status: newStatus
              });
              
              setPaymentAmount('');
              setPaymentReference('');
              setIsPaymentModalOpen(false);
            }} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm mb-4 flex justify-between items-center">
                <span className="text-slate-600">Total Amount:</span>
                <span className="font-bold">{getCurrencySymbol(selectedInvoice.currency)}{selectedInvoice.total.toFixed(2)}</span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-sm mb-4 flex justify-between items-center">
                <span className="text-emerald-700">Outstanding:</span>
                <span className="font-bold text-emerald-700">{getCurrencySymbol(selectedInvoice.currency)}{Math.max(0, selectedInvoice.total - (selectedInvoice.amountPaid || 0)).toFixed(2)}</span>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Amount</label>
                <input 
                  type="number" 
                  step="0.01"
                  max={selectedInvoice.total - (selectedInvoice.amountPaid || 0)}
                  value={paymentAmount} 
                  onChange={(e) => setPaymentAmount(e.target.value)} 
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm" 
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Method</label>
                <CustomSelect
                   value={paymentMethod}
                   onChange={(val) => setPaymentMethod(val)}
                   className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-semibold bg-slate-50/50 hover:bg-white focus:outline-none focus:border-primary hover:shadow-sm transition-all text-primary"
                   options={[
                     { value: "Bank Transfer", label: "Bank Transfer" },
                     { value: "Credit Card", label: "Credit Card" },
                     { value: "Cash", label: "Cash" },
                     { value: "Check", label: "Check" },
                     { value: "Paypal", label: "Paypal" },
                     { value: "Other", label: "Other" }
                   ]}
                 />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Reference (Optional)</label>
                <input 
                  type="text" 
                  value={paymentReference} 
                  onChange={(e) => setPaymentReference(e.target.value)} 
                  placeholder="Transaction ID / Check Number"
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg text-sm" 
                />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
