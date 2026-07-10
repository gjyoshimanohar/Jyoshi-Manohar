import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Eye, Edit2, Download, CheckCircle, Clock, 
  AlertCircle, XCircle, Printer, ArrowLeft, Mail, FileText, 
  Check, DollarSign, Calendar, ChevronRight, Send, Search, Filter, ShieldAlert
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { settingsService, InvoiceSettings } from '../services/settingsService';
import { productService, Product } from '../services/productService';
import { invoiceService } from '../services/invoiceService';
import { Invoice, InvoiceItem } from '../types';
import { format, isAfter, parseISO } from 'date-fns';

const getCurrencySymbol = (code?: string) => {
  switch(code) {
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'INR': return '₹';
    default: return '$';
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
  const [formStatus, setFormStatus] = useState<'draft' | 'sent' | 'paid'>('draft');

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
  const taxAmount = (subtotal * taxRate) / 100;
  const computedDiscount = discountType === 'percentage' ? (subtotal * discount) / 100 : discount;
  const total = subtotal + taxAmount - computedDiscount;

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: Math.random().toString(36).substring(2, 9),
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
      notes
    };

    try {
      if (selectedInvoice) {
        await invoiceService.updateInvoice(selectedInvoice.id, payload);
      } else {
        await invoiceService.createInvoice(payload);
      }
      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error saving invoice", err);
    }
  };

  const resetForm = () => {
    setSelectedInvoice(null);
    setClientName('');
    setClientEmail('');
    setClientAddress('');
    setIssueDate(format(new Date(), 'yyyy-MM-dd'));
    setDueDate(format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    setTaxRate(5);
    setDiscount(0);
    setDiscountType('fixed');
    setCurrency('INR');
    setPaymentTerms('Net 15');
    setTermsAndConditions('');
    setNotes('');
    setItems([{ id: '1', description: 'Consulting Services', quantity: 1, rate: 150, amount: 150 }]);
    setFormStatus('draft');
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceNumber(invoice.invoiceNumber);
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
  const paidInvoiced = invoices.reduce((sum, i) => sum + (i.status === 'paid' ? i.total : 0), 0);
  const outstandingInvoiced = invoices.reduce((sum, i) => sum + (i.status === 'sent' || i.status === 'overdue' ? i.total : 0), 0);
  const overdueInvoiced = invoices.reduce((sum, i) => {
    const isOverdue = (i.status === 'sent' || i.status === 'overdue') && isAfter(new Date(), parseISO(i.dueDate));
    return sum + (isOverdue ? i.total : 0);
  }, 0);

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
          <span className="inline-flex items-center gap-1 bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-200">
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
      <div className="no-print grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Invoiced</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-gray-900">${totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1">Sum of all created bills</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Received Payments</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-emerald-600">${paidInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1">Total successfully settled amount</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding Balances</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-blue-600">${outstandingInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1">Pending and active client balances</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-150 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between bg-rose-50/20">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-4 h-4 text-rose-500" /> Overdue Balances
          </span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold text-rose-600">${overdueInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <span className="text-[10px] text-rose-400 mt-1">Invoices past their due thresholds</span>
        </div>
      </div>

      {/* ACTION TOOLBAR & FILTERS */}
      <div className="no-print bg-white rounded-2xl border border-gray-150 p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by invoice number, client details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#1a2b58] focus:bg-white transition-all text-gray-800"
            />
          </div>

          {/* Filter Status select */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-sm shrink-0">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-gray-700 text-xs font-medium focus:outline-none"
            >
              <option value="all">All Invoice Statuses</option>
              <option value="draft">Drafts</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
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
      <div className="no-print bg-white rounded-2xl border border-gray-150 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-8 h-8 border-4 border-t-indigo-600 border-gray-100 rounded-full animate-spin mb-4" />
            <span className="text-sm font-medium">Fetching real-time invoices...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FileText className="w-12 h-12 text-gray-200 mb-3" />
            <span className="text-sm font-semibold text-gray-700">No Invoices Found</span>
            <p className="text-xs text-gray-400 mt-1 text-center max-w-sm">
              Generate invoice lists to invoice consulting engagements, compliance files, and more.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-150 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Client Detail</th>
                  <th className="px-6 py-4">Dates (Issue / Due)</th>
                  <th className="px-6 py-4">Total Price</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-sm text-gray-700">
                {filteredInvoices.map(invoice => {
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{invoice.clientName}</div>
                        <div className="text-xs text-gray-400">{invoice.clientEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{invoice.issueDate}</span>
                          <ChevronRight className="w-3 h-3 text-gray-300" />
                          <span className="font-medium text-gray-800">{invoice.dueDate}</span>
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
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="View Invoice Sheet"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit (only drafts or sent) */}
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <button 
                              onClick={() => handleEdit(invoice)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
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
            <div className="no-print bg-gray-50 px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsViewOpen(false)}
                  className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-[#1a2b58] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to List
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Print Trigger */}
                <button 
                  onClick={triggerPrint}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </button>

                {/* Email Client mockup */}
                <button 
                  onClick={() => alert(`Email dispatch queued successfully for ${selectedInvoice.clientEmail}`)}
                  className="flex items-center gap-1.5 bg-[#1a2b58] hover:bg-[#121f40] text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" /> Email Client
                </button>

                <button 
                  onClick={() => setIsViewOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE AREA */}
            <div id="print-invoice-modal" className="p-8 md:p-12 bg-white text-gray-800 flex-1">
              {/* Header Letterhead */}
              <div className="flex flex-col md:flex-row md:items-start justify-between border-b border-gray-150 pb-8 gap-6">
                <div>
                  <div className="text-2xl font-bold text-[#1a2b58] tracking-tight flex items-center gap-2">
                    <FileText className="w-7 h-7 text-indigo-500" />
                    <span>{selectedInvoice.senderName || 'Apex Consulting Ltd.'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 max-w-sm whitespace-pre-line leading-relaxed">
                    {selectedInvoice.senderAddress || '100 Financial Way, Suite 400, New York, NY 10005'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedInvoice.senderEmail || 'billing@apexconsulting.com'}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-tight">Invoice</h1>
                  <div className="font-mono text-sm font-bold text-indigo-600 mt-1">{selectedInvoice.invoiceNumber}</div>
                  
                  <div className="mt-4 grid grid-cols-2 md:block gap-2 text-xs">
                    <div className="mb-1">
                      <span className="text-gray-400 block md:inline md:mr-2">Date Issued:</span>
                      <span className="font-semibold text-gray-800">{selectedInvoice.issueDate}</span>
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
                  <span className="text-gray-400 uppercase tracking-wider font-semibold block mb-2">Billed To</span>
                  <div className="text-sm font-bold text-gray-900">{selectedInvoice.clientName}</div>
                  <div className="text-gray-500 font-medium mt-1">{selectedInvoice.clientEmail}</div>
                  {selectedInvoice.clientAddress && (
                    <div className="text-gray-400 mt-2 whitespace-pre-line leading-relaxed">{selectedInvoice.clientAddress}</div>
                  )}
                </div>

                <div>
                  <span className="text-gray-400 uppercase tracking-wider font-semibold block mb-2">Payment Guidelines</span>
                  <p className="text-gray-500 leading-relaxed">
                    All balances should be paid in full by the due date. Standard bank wires or checking transfers accepted. Thank you for your partnership.
                  </p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="font-semibold text-gray-700">Payment Terms:</span>
                    <span className="text-gray-600 font-medium">{selectedInvoice.paymentTerms || 'Due on Receipt'}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="font-semibold text-gray-700">Status:</span>
                    {getStatusBadge(selectedInvoice.status, selectedInvoice.dueDate)}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-150 rounded-2xl overflow-hidden mb-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150 text-gray-500 font-semibold uppercase">
                      <th className="px-5 py-3">Description of Services / Items</th>
                      <th className="px-5 py-3 text-center w-20">Quantity</th>
                      <th className="px-5 py-3 text-right w-28">Rate ({getCurrencySymbol(selectedInvoice.currency)})</th>
                      <th className="px-5 py-3 text-right w-32">Line Total ({getCurrencySymbol(selectedInvoice.currency)})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 text-gray-700">
                    {selectedInvoice.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-5 py-3.5 font-medium text-gray-900">{item.description}</td>
                        <td className="px-5 py-3.5 text-center font-mono">{item.quantity}</td>
                        <td className="px-5 py-3.5 text-right font-mono">{getCurrencySymbol(selectedInvoice.currency)}{item.rate.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-900">{getCurrencySymbol(selectedInvoice.currency)}{item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Math summary breakdown */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-6 py-4">
                <div className="flex-1 text-xs text-gray-400">
                  {selectedInvoice.notes && (
                    <div className="mb-4">
                      <span className="font-semibold text-gray-500 block mb-1">Customer Notes:</span>
                      <p className="leading-relaxed whitespace-pre-line max-w-sm">{selectedInvoice.notes}</p>
                    </div>
                  )}
                  {selectedInvoice.termsAndConditions && (
                    <div>
                      <span className="font-semibold text-gray-500 block mb-1">Terms & Conditions:</span>
                      <p className="leading-relaxed whitespace-pre-line max-w-sm">{selectedInvoice.termsAndConditions}</p>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-80 shrink-0 text-xs text-gray-600 flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono font-semibold text-gray-800">{getCurrencySymbol(selectedInvoice.currency)}{selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>

                  {selectedInvoice.taxRate > 0 && (
                    <div className="flex justify-between">
                      <span>Service Tax ({selectedInvoice.taxRate}%)</span>
                      <span className="font-mono font-semibold text-gray-800">{getCurrencySymbol(selectedInvoice.currency)}{((selectedInvoice.subtotal * selectedInvoice.taxRate) / 100).toFixed(2)}</span>
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

                  <div className="border-t border-gray-150 pt-3 flex justify-between text-base font-bold text-gray-900">
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
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-150 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                {selectedInvoice ? 'Edit Client Invoice' : 'Generate New Client Invoice'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-700">
              {/* Top metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Invoice number <span className="text-gray-300 normal-case font-normal">(Auto)</span></label>
                  <input 
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full border border-gray-200 px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold text-indigo-600 focus:outline-none focus:border-[#1a2b58]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Billing Status</label>
                  <select 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full border border-gray-200 px-3 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[#1a2b58]"
                  >
                    <option value="draft">Draft (Private)</option>
                    <option value="sent">Sent (Active Balance)</option>
                    <option value="paid">Paid (Settled)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Currency</label>
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[#1a2b58]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Payment Terms</label>
                  <select 
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[#1a2b58]"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              {/* Billed To Client Details */}
              <div className="space-y-3">
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Client Recipient</span>
                
                {clients && clients.length > 0 && (
                  <select
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                    onChange={(e) => {
                      const selectedUid = e.target.value;
                      if (selectedUid) {
                        const client = clients.find(c => c.uid === selectedUid);
                        if (client) {
                          setClientName(client.displayName || client.email || '');
                          setClientEmail(client.email || '');
                          setClientAddress(client.address || '');
                        }
                      }
                    }}
                  >
                    <option value="">-- Select from Client Master --</option>
                    {clients.map(c => (
                      <option key={c.uid} value={c.uid}>
                        {c.displayName ? `${c.displayName} (${c.email})` : c.email}
                      </option>
                    ))}
                  </select>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input 
                    type="text"
                    placeholder="Client Full Name *"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                  />
                  <input 
                    type="email"
                    placeholder="Client Email Address *"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                  />
                </div>

                <textarea 
                  placeholder="Billing Address (Optional)"
                  rows={2}
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                />
              </div>

              {/* Sender Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Corporate Sender</span>
                  <button 
                    type="button" 
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    Edit Organization Details
                  </button>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs">
                  <div className="font-bold text-gray-900">{senderName}</div>
                  <div className="text-gray-500 mt-0.5">{senderEmail}</div>
                  {senderAddress && <div className="text-gray-400 mt-1 whitespace-pre-wrap">{senderAddress}</div>}
                </div>
              </div>

              {/* Term Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Issue Date</label>
                  <input 
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Due Date</label>
                  <input 
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                  />
                </div>
              </div>

              {/* Line Items Editor Spreadsheet */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Line Items</span>
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

                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold">
                        <th className="p-3">Description *</th>
                        <th className="p-3 text-center w-16">Qty</th>
                        <th className="p-3 text-right w-24">Rate</th>
                        <th className="p-3 text-right w-24">Total</th>
                        <th className="p-3 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="p-2 relative flex flex-col gap-1">
                            <input 
                              type="text"
                              required
                              placeholder="e.g. Service or Engagement details"
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              className="w-full border border-gray-200 bg-transparent p-1.5 focus:outline-none focus:border-indigo-400 rounded"
                            />
                            {products.length > 0 && (
                              <select
                                className="w-full border border-gray-200 bg-gray-50 p-1 text-[10px] focus:outline-none rounded text-gray-500"
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
                              className="w-full border-none bg-transparent p-1 font-mono text-center focus:outline-none focus:bg-gray-50 rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number"
                              required
                              min="0"
                              value={item.rate}
                              onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                              className="w-full border-none bg-transparent p-1 font-mono text-right focus:outline-none focus:bg-gray-50 rounded"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-semibold text-gray-800 p-3">
                            ${item.amount.toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <button 
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={items.length === 1}
                              className="text-gray-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
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
              <div className="border-t border-gray-150 pt-5 flex flex-col sm:flex-row justify-between gap-6">
                {/* Notes and feedback */}
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Customer Notes</label>
                  <textarea 
                    placeholder="e.g. It was a pleasure working with you!"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58] mb-3"
                  />
                  
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Terms & Conditions</label>
                  <textarea 
                    placeholder="e.g. Please pay within 15 days by bank transfer."
                    rows={2}
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    className="w-full border border-gray-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                  />
                </div>

                {/* Subtotals */}
                <div className="w-full sm:w-64 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-mono font-semibold text-gray-800">{getCurrencySymbol(currency)}{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Service Tax (%)</span>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-16 text-right border border-gray-200 px-1.5 py-1 rounded font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500 text-[11px] uppercase tracking-wider font-semibold">Discount</span>
                      <select 
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                        className="text-[10px] border border-gray-200 rounded px-1 py-0.5 focus:outline-none"
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
                      className="w-20 text-right border border-gray-200 px-1.5 py-1 rounded font-mono text-xs focus:outline-none text-emerald-600"
                    />
                  </div>

                  <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-sm font-bold text-gray-900">
                    <span>Grand Total</span>
                    <span className="font-mono text-lg text-[#1a2b58]">{getCurrencySymbol(currency)}{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-gray-150 pt-5 flex items-center justify-end gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs cursor-pointer transition-colors"
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
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Organization Settings</h3>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              settingsService.updateInvoiceSettings({ senderName, senderEmail, senderAddress });
              setIsSettingsModalOpen(false);
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Company Name</label>
                <input 
                  type="text" 
                  value={senderName} 
                  onChange={(e) => setSenderName(e.target.value)} 
                  className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" 
                  readOnly
                />
                <span className="text-[10px] text-gray-400">Corporate sender name is strictly fixed to Jyoshi Manohar.</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Company Email</label>
                <input 
                  type="email" 
                  value={senderEmail} 
                  onChange={(e) => setSenderEmail(e.target.value)} 
                  className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" 
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Organization Address & Footer</label>
                <textarea 
                  value={senderAddress} 
                  onChange={(e) => setSenderAddress(e.target.value)} 
                  className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" 
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
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Manage Line Items / Products</h3>
              <button onClick={() => setIsProductsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
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
              }} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="text-sm font-semibold mb-3">{editingProduct ? 'Edit Product' : 'Add New Product'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <input name="name" type="text" placeholder="Product / Service Name *" required defaultValue={editingProduct?.name} className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" />
                  <input name="price" type="number" step="0.01" min="0" placeholder="Unit Price *" required defaultValue={editingProduct?.price} className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm" />
                </div>
                <textarea name="desc" placeholder="Description (Optional)" rows={2} defaultValue={editingProduct?.description} className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm mb-3" />
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold">
                    {editingProduct ? 'Save Changes' : 'Add Product'}
                  </button>
                  {editingProduct && (
                    <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold">
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* Product List */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-gray-700">Existing Products</h4>
                {products.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4 text-center border border-dashed rounded-xl">No products added yet.</div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-150">
                    {products.map(p => (
                      <div key={p.id} className="p-3 bg-white flex justify-between items-center hover:bg-gray-50">
                        <div>
                          <div className="font-semibold text-sm text-gray-900">{p.name} <span className="text-gray-500 ml-2 font-mono">{getCurrencySymbol(currency)}{p.price}</span></div>
                          {p.description && <div className="text-xs text-gray-500 mt-1">{p.description}</div>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingProduct(p)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => productService.deleteProduct(p.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
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
    </div>
  );
}
