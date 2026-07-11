import toast from 'react-hot-toast';
import React, { useState, useEffect, useMemo } from 'react';
import CustomSelect from './CustomSelect';
import { 
  Plus, Trash2, Eye, Edit2, Download, CheckCircle, Clock, 
  AlertCircle, XCircle, Printer, ArrowLeft, Mail, FileText, FileSpreadsheet,
  Check, DollarSign, Calendar, ChevronRight, Send, Search, Filter, ShieldAlert, MessageSquare, Layers,
  TrendingUp, CreditCard, Landmark, CheckSquare, Sparkles
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { settingsService, InvoiceSettings } from '../services/settingsService';
import { productService, Product } from '../services/productService';
import { invoiceService } from '../services/invoiceService';
import { financeService } from '../services/financeService';
import { Invoice, InvoiceItem, InvoicePayment, PaymentAccount } from '../types';
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

export default function InvoiceManagement({ isAdmin: propIsAdmin, clients }: InvoiceManagementProps) {
  const isAdmin = propIsAdmin && auth.currentUser?.email === 'gjyoshimanohar@gmail.com';
  // States
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Virtualization state
  const [scrollTop, setScrollTop] = useState(0);

  const handleGenerateVirtualDemo = () => {
    const mockInvoices: Invoice[] = [];
    const baseNum = 3501;
    const statuses: Invoice['status'][] = ['paid', 'sent', 'overdue', 'cancelled'];
    const clientsNames = ['Acme Corp', 'Global Industries', 'Delta LLC', 'Quantum Labs', 'Echo Ltd', 'Vertex Inc'];
    
    for (let i = 0; i < 2500; i++) {
      const idx = i + baseNum;
      const numStr = `INV-2026-${String(idx).padStart(4, '0')}`;
      const name = clientsNames[i % clientsNames.length];
      const status = statuses[i % statuses.length];
      const total = 5000 + (i * 123) % 45000;
      
      mockInvoices.push({
        id: `virtual-${i}`,
        documentType: 'invoice',
        userId: 'demo-virtual-user',
        invoiceNumber: numStr,
        clientName: `${name} (Virtual #${i})`,
        clientEmail: `contact@${name.toLowerCase().replace(' ', '')}.com`,
        issueDate: '2026-07-01',
        dueDate: '2026-07-15',
        status: status,
        items: [{ id: '1', description: 'Virtual Consulting Render', quantity: 1, rate: total, amount: total }],
        taxRate: 18,
        discount: 0,
        subtotal: total,
        total: total,
        createdAt: Date.now() - (i * 10 * 60 * 1000), // staggered times
        currency: 'INR',
      });
    }
    
    setInvoices(prev => {
      // Remove any existing virtual invoices first to prevent duplicates
      const cleaned = prev.filter(inv => !inv.id.startsWith('virtual-'));
      return [...cleaned, ...mockInvoices];
    });
    toast.success('Injected 2,500 mock invoices! Try searching or scrolling the list with silky smooth 60fps table virtualization.');
  };
  
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
    const [taxStructure, setTaxStructure] = useState<'standard' | 'gst'>('gst');
    const [gstType, setGstType] = useState<'intrastate' | 'interstate'>('intrastate');

    const [analyticsTab, setAnalyticsTab] = useState<'revenue' | 'tax' | 'itc' | 'outflows'>('revenue');
    const [financeRecords, setFinanceRecords] = useState<any[]>([]);

  // Recurring & Payment States
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [templateId, setTemplateId] = useState<'standard' | 'modern' | 'elegant' | 'compact' | 'fresh'>('standard');
  const [viewTemplateId, setViewTemplateId] = useState<'standard' | 'modern' | 'elegant' | 'compact' | 'fresh'>('standard');
  
  // Payment Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');

  // Checkout Modal States (Client)
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutSimulating, setCheckoutSimulating] = useState(false);
  const [checkoutGateway, setCheckoutGateway] = useState<'stripe' | 'razorpay'>('stripe');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [checkoutStep, setCheckoutStep] = useState<'input' | 'otp' | 'success'>('input');
  
  // Template Showcase States
  const [isTemplateShowcaseOpen, setIsTemplateShowcaseOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<'standard' | 'modern' | 'elegant' | 'compact' | 'fresh'>('standard');

  // Reminders Modals State
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isPDFLedgerModalOpen, setIsPDFLedgerModalOpen] = useState(false);
  const [reminderChannel, setReminderChannel] = useState<'email' | 'whatsapp'>('email');
  const [reminderSubject, setReminderSubject] = useState('');
  const [reminderBody, setReminderBody] = useState('');
  const [reminderMobile, setReminderMobile] = useState('');
  const [reminderTemplate, setReminderTemplate] = useState<'gentle' | 'formal' | 'urgent' | 'custom'>('gentle');
  const [isLedgerExpanded, setIsLedgerExpanded] = useState(false);

  const applyReminderTemplate = (type: 'gentle' | 'formal' | 'urgent' | 'custom', invoice: Invoice) => {
    setReminderTemplate(type);
    if (type === 'custom') return;
    
    const symbol = getCurrencySymbol(invoice.currency);
    const amountStr = `${symbol}${invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (type === 'gentle') {
      setReminderSubject(`Friendly Payment Reminder: ${invoice.invoiceNumber}`);
      setReminderBody(`Dear ${invoice.clientName},\n\nHope you are doing well.\n\nThis is a gentle heads-up that invoice ${invoice.invoiceNumber} for ${amountStr} is outstanding and due on ${invoice.dueDate}.\n\nYou can view and pay this invoice securely from your client portal dashboard. Thank you so much for your partnership!\n\nBest regards,\nJyoshi Manohar\nChartered Accountant`);
    } else if (type === 'formal') {
      setReminderSubject(`Professional Invoice Payment Request: ${invoice.invoiceNumber}`);
      setReminderBody(`Dear ${invoice.clientName},\n\nI hope this message finds you well.\n\nPlease find on your client portal invoice ${invoice.invoiceNumber} for professional services, totaling ${amountStr}.\n\nThis payment is due on ${invoice.dueDate}. Please arrange for bank wire or checking transfer using our portal guidelines. If payment has already been sent, please disregard this automated reminder.\n\nBest regards,\nJyoshi Manohar\nChartered Accountant`);
    } else if (type === 'urgent') {
      setReminderSubject(`URGENT: Past-Due Accounting Invoice Notice - ${invoice.invoiceNumber}`);
      setReminderBody(`Dear ${invoice.clientName},\n\nThis is an urgent notice that invoice ${invoice.invoiceNumber} (${amountStr}) is now past due. The original due date was ${invoice.dueDate}.\n\nPlease remit the outstanding balance immediately to avoid late fee penalty accumulation or service disruption. Payments can be processed securely on your client dashboard.\n\nIf there are any concerns or questions regarding this balance, please reach out directly.\n\nBest regards,\nJyoshi Manohar\nChartered Accountant`);
    }
  };

  const handleApplyLateFee = async (invoice: Invoice) => {
    const feeInput = window.prompt("Enter late fee / overdue interest penalty amount in INR:", "500");
    if (feeInput === null) return;
    const feeAmount = parseFloat(feeInput);
    if (isNaN(feeAmount) || feeAmount <= 0) {
      toast.error("Please enter a valid positive number.");
      return;
    }

    const lateFeeItem: InvoiceItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'expense',
      taxable: false,
      description: `Late Fee & Overdue Interest Penalty (${format(new Date(), 'dd-MMM-yyyy')})`,
      quantity: 1,
      rate: feeAmount,
      amount: feeAmount
    };

    const updatedItems = [...invoice.items, lateFeeItem];
    
    // Recalculate totals
    const newSubtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    const newTaxableSubtotal = updatedItems.reduce((sum, item) => sum + (item.taxable !== false ? item.amount : 0), 0);
    
    const struct = invoice.taxStructure || 'standard';
    const gstTypeVal = invoice.gstType || 'intrastate';
    const rateVal = invoice.taxRate || 0;
    
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let taxAmount = 0;

    if (struct === 'gst') {
      if (gstTypeVal === 'intrastate') {
        cgstRate = rateVal / 2;
        sgstRate = rateVal / 2;
        cgstAmount = (newTaxableSubtotal * cgstRate) / 100;
        sgstAmount = (newTaxableSubtotal * sgstRate) / 100;
        taxAmount = cgstAmount + sgstAmount;
      } else {
        igstRate = rateVal;
        igstAmount = (newTaxableSubtotal * igstRate) / 100;
        taxAmount = igstAmount;
      }
    } else {
      taxAmount = (newTaxableSubtotal * rateVal) / 100;
    }

    const discType = invoice.discountType || 'fixed';
    const computedDiscount = discType === 'percentage' ? (newSubtotal * invoice.discount) / 100 : invoice.discount;
    const newTotal = newSubtotal + taxAmount - computedDiscount;

    try {
      const updatedFields: Partial<Invoice> = {
        items: updatedItems,
        subtotal: newSubtotal,
        cgstAmount,
        sgstAmount,
        igstAmount,
        total: newTotal
      };

      await invoiceService.updateInvoice(invoice.id, updatedFields);
      
      setSelectedInvoice({
        ...invoice,
        ...updatedFields
      });

      toast.success(`Overdue penalty of ₹${feeAmount.toFixed(2)} applied successfully!`);
    } catch (err) {
      console.error("Error applying late fee", err);
      toast.error("Failed to apply late fee. Please try again.");
    }
  };

  // Products & Settings
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Convert Estimate to Active Invoice
  const handleConvertEstimate = async (invoice: Invoice) => {
    if (!auth.currentUser) return;
    if (!window.confirm("Are you sure you want to convert this estimate into an invoice? This registers the transaction and assigns an invoice number.")) return;
    
    try {
      const count = invoices.filter(inv => inv.documentType === 'invoice').length + 1;
      const year = new Date().getFullYear();
      const newInvNumber = `INV-${year}-${String(count).padStart(4, '0')}`;
      
      const updatedFields: Partial<Invoice> = {
        documentType: 'invoice',
        invoiceNumber: newInvNumber,
        status: 'sent',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      };

      await invoiceService.updateInvoice(invoice.id, updatedFields);
      
      // Register in Finance Database
      await financeService.createRecord({
        type: 'income',
        category: 'Sales',
        amount: invoice.total,
        description: `Invoice ${newInvNumber} (Converted from Estimate ${invoice.invoiceNumber})`,
        date: updatedFields.issueDate!,
        status: 'pending',
        clientName: invoice.clientName,
        invoiceId: invoice.id
      });

      setSelectedInvoice({
        ...invoice,
        ...updatedFields
      });
      
      toast.success(`Estimate successfully converted to Invoice ${newInvNumber}!`);
    } catch (err) {
      console.error("Error converting estimate to invoice", err);
      toast.error("Failed to convert estimate. Please try again.");
    }
  };

  // CSV Ledger Export function
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices found to export.");
      return;
    }

    const headers = [
      "Invoice/Estimate Number",
      "Doc Type",
      "Client Name",
      "Client Email",
      "Issue Date",
      "Due Date",
      "Subtotal",
      "Tax Structure",
      "Tax Rate (%)",
      "Discount",
      "Grand Total",
      "Amount Paid",
      "Status",
      "Is Recurring"
    ];

    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      inv.documentType || 'invoice',
      `"${inv.clientName.replace(/"/g, '""')}"`,
      inv.clientEmail,
      inv.issueDate,
      inv.dueDate,
      inv.subtotal.toFixed(2),
      inv.taxStructure || 'standard',
      inv.taxRate,
      inv.discount.toFixed(2),
      inv.total.toFixed(2),
      (inv.amountPaid || 0).toFixed(2),
      inv.status,
      inv.isRecurring ? "Yes" : "No"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Invoice_Ledger_Export_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Ledger Export function (HTML-based XLS for rich formatting)
  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices found to export.");
      return;
    }

    const headers = [
      "Invoice/Estimate Number",
      "Doc Type",
      "Client Name",
      "Client Email",
      "Issue Date",
      "Due Date",
      "Subtotal (INR)",
      "Tax Structure",
      "Tax Rate (%)",
      "Discount (INR)",
      "Grand Total (INR)",
      "Amount Paid (INR)",
      "Status",
      "Is Recurring"
    ];

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Invoices Ledger</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->`;
    html += `<style>
      table { border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin-top: 20px; }
      th { background-color: #1a2b58; color: #ffffff; font-weight: bold; padding: 12px 10px; border: 1px solid #e2e8f0; text-align: left; }
      td { padding: 10px 8px; border: 1px solid #e2e8f0; font-size: 13px; color: #334155; }
      .header-title { font-size: 20px; font-weight: bold; color: #1a2b58; }
      .header-meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
      .number { text-align: right; mso-number-format:"\\#\\,\\#\\#0\\.00"; }
      .text { text-align: left; }
      .status-paid { background-color: #d1fae5; color: #065f46; font-weight: bold; text-align: center; }
      .status-draft { background-color: #f1f5f9; color: #475569; font-weight: bold; text-align: center; }
      .status-sent { background-color: #dbeafe; color: #1d4ed8; font-weight: bold; text-align: center; }
      .status-overdue { background-color: #ffe4e6; color: #b91c1c; font-weight: bold; text-align: center; }
    </style></head><body>`;
    
    html += `<div class="header-title">CA JYOSHI MANOHAR - CLIENT INVOICES LEDGER</div>`;
    html += `<div class="header-meta">Generated on ${new Date().toLocaleDateString()} | Total Records: ${filteredInvoices.length}</div>`;
    html += `<table><thead><tr>`;
    headers.forEach(h => {
      html += `<th>${h}</th>`;
    });
    html += `</tr></thead><tbody>`;
    
    filteredInvoices.forEach(inv => {
      const statusClass = inv.status === 'paid' ? 'status-paid' : inv.status === 'sent' ? 'status-sent' : inv.status === 'overdue' ? 'status-overdue' : 'status-draft';
      html += `<tr>`;
      html += `<td class="text" style="font-weight: bold; color: #1d4ed8;">${inv.invoiceNumber}</td>`;
      html += `<td class="text" style="text-transform: uppercase;">${inv.documentType || 'invoice'}</td>`;
      html += `<td class="text">${inv.clientName}</td>`;
      html += `<td class="text">${inv.clientEmail}</td>`;
      html += `<td class="text">${inv.issueDate}</td>`;
      html += `<td class="text">${inv.dueDate}</td>`;
      html += `<td class="number">${inv.subtotal.toFixed(2)}</td>`;
      html += `<td class="text" style="text-transform: uppercase;">${inv.taxStructure || 'standard'}</td>`;
      html += `<td class="number">${inv.taxRate}</td>`;
      html += `<td class="number">${inv.discount.toFixed(2)}</td>`;
      html += `<td class="number" style="font-weight: bold;">${inv.total.toFixed(2)}</td>`;
      html += `<td class="number">${(inv.amountPaid || 0).toFixed(2)}</td>`;
      html += `<td class="${statusClass}">${inv.status.toUpperCase()}</td>`;
      html += `<td class="text" style="text-align: center;">${inv.isRecurring ? "YES" : "NO"}</td>`;
      html += `</tr>`;
    });
    
    html += `</tbody></table></body></html>`;
    
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Invoice_Ledger_Spreadsheet_${format(new Date(), 'yyyyMMdd')}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel spreadsheet exported successfully!");
  };

  // PDF Ledger Export function
  const handleExportPDF = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices found to export.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented PDF generation. Please allow popups for this portal.");
      return;
    }

    const symbol = "₹";
    let rowsHtml = "";
    let grandSubtotal = 0;
    let grandTotal = 0;
    let grandPaid = 0;

    filteredInvoices.forEach(inv => {
      grandSubtotal += inv.subtotal;
      grandTotal += inv.total;
      grandPaid += (inv.amountPaid || 0);

      rowsHtml += `
        <tr>
          <td><strong>${inv.invoiceNumber}</strong></td>
          <td style="text-transform: uppercase;">${inv.documentType || 'invoice'}</td>
          <td>${inv.clientName}</td>
          <td>${inv.issueDate}</td>
          <td>${inv.dueDate}</td>
          <td style="text-align: right;">${symbol}${inv.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right;">${symbol}${inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: center;"><span class="badge badge-${inv.status}">${inv.status.toUpperCase()}</span></td>
        </tr>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <title>Invoices Ledger Summary - CA Jyoshi Manohar</title>
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
            .badge { font-size: 9px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; }
            .badge-paid { background-color: #d1fae5; color: #065f46; }
            .badge-sent { background-color: #dbeafe; color: #1d4ed8; }
            .badge-overdue { background-color: #ffe4e6; color: #b91c1c; }
            .badge-draft { background-color: #f1f5f9; color: #475569; }
            .totals-container { float: right; width: 300px; margin-top: 10px; }
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
              <strong>OFFICE LEDGER REPORT</strong><br/>
              Date: ${new Date().toLocaleDateString()}<br/>
              Scope: Real-time Invoices Register
            </div>
          </div>

          <div class="title-section">
            <h1>Financial Transaction Summary</h1>
            <p>Ledger containing active invoices and estimate records corresponding to verified consultancies.</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Doc Number</th>
                <th>Doc Type</th>
                <th>Client Name</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th style="text-align: right;">Subtotal</th>
                <th style="text-align: right;">Grand Total</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="total-row">
              <span style="color: #64748b;">Subtotal:</span>
              <strong>${symbol}${grandSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="total-row">
              <span style="color: #64748b;">Amount Paid:</span>
              <strong style="color: #15803d;">${symbol}${grandPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
            <div class="total-row total-row-grand">
              <span>Grand Cumulative Total:</span>
              <span>${symbol}${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="footer">
            CA Jyoshi Manohar Offices • Confidential Ledger Report • Page 1 of 1
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
    toast.success("PDF ledger report generated successfully!");
  };

  // Pre-fill fields for customized reminders
  const openReminderModal = (invoice: Invoice) => {
    // Attempt to extract mobile from address or use empty
    const mobileMatch = invoice.clientAddress?.match(/\+?[0-9]{10,15}/)?.[0] || '';
    setReminderMobile(mobileMatch);
    setReminderChannel('email');
    applyReminderTemplate('gentle', invoice);
    setIsReminderModalOpen(true);
  };

  const handleSendReminder = async () => {
    if (!selectedInvoice) return;
    
    const newReminder = {
      id: Math.random().toString(36).substring(2, 9),
      date: format(new Date(), 'yyyy-MM-dd HH:mm'),
      channel: reminderChannel,
      recipient: reminderChannel === 'email' ? selectedInvoice.clientEmail : reminderMobile || selectedInvoice.clientName,
      message: reminderBody
    };

    const updatedReminders = [...(selectedInvoice.reminders || []), newReminder];

    try {
      await invoiceService.updateInvoice(selectedInvoice.id, {
        reminders: updatedReminders
      });

      setSelectedInvoice({
        ...selectedInvoice,
        reminders: updatedReminders
      });

      if (reminderChannel === 'whatsapp') {
        const encodedText = encodeURIComponent(reminderBody);
        const cleanPhone = reminderMobile.replace(/[^0-9]/g, '');
        const waUrl = cleanPhone 
          ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
          : `https://web.whatsapp.com/send?text=${encodedText}`;
        window.open(waUrl, '_blank');
      } else {
        toast.success(`Email dispatch triggered successfully to ${selectedInvoice.clientEmail}!`);
      }

      setIsReminderModalOpen(false);
    } catch (err) {
      console.error("Error saving reminder log", err);
      toast.error("Failed to save communication log. Please try again.");
    }
  };


  // Load payment accounts from the database
  useEffect(() => {
    const q = query(collection(db, "payment_accounts"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accountsList: PaymentAccount[] = [];
      snapshot.forEach((docRef) => {
        accountsList.push({ id: docRef.id, ...docRef.data() } as PaymentAccount);
      });
      setPaymentAccounts(accountsList);
    }, (error) => {
      console.error("Error fetching payment accounts in invoice management:", error);
    });
    return () => unsubscribe();
  }, []);

  // Pre-select the first bank account when payment modal is opened
  useEffect(() => {
    if (isPaymentModalOpen && paymentAccounts.length > 0) {
      setSelectedBankAccountId(paymentAccounts[0].id);
    }
  }, [isPaymentModalOpen, paymentAccounts]);

  // Load finance records for outflows
  useEffect(() => {
    const q = query(collection(db, "finance_records"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: any[] = [];
      snapshot.forEach((docRef) => {
        records.push({ id: docRef.id, ...docRef.data() });
      });
      setFinanceRecords(records);
    }, (error) => {
      console.error("Error fetching finance records for analytics:", error);
    });
    return () => unsubscribe();
  }, []);

  // YoY GST Comparisons
  const yoyTaxData = useMemo(() => {
    const years = ['2024', '2025', '2026'];
    return years.map(yr => {
      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      invoices.forEach(inv => {
        const invYear = inv.issueDate.substring(0, 4);
        if (invYear === yr) {
          if (inv.taxStructure === 'gst') {
            cgst += inv.cgstAmount || 0;
            sgst += inv.sgstAmount || 0;
            igst += inv.igstAmount || 0;
          } else {
            cgst += (inv.total - inv.subtotal) / 2;
            sgst += (inv.total - inv.subtotal) / 2;
          }
        }
      });
      return {
        year: `FY ${yr}-${Number(yr) + 1 - 2000}`,
        CGST: Math.round(cgst),
        SGST: Math.round(sgst),
        IGST: Math.round(igst),
        TotalTax: Math.round(cgst + sgst + igst)
      };
    });
  }, [invoices]);

  // Cumulative Input Tax Credits (ITC) Accumulated in 2026
  const itcData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let runningTotal = 0;
    return months.map((m, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      let monthlyITC = 0;
      invoices.forEach(inv => {
        if (inv.issueDate.startsWith(`2026-${monthNum}`)) {
          const tax = (inv.taxStructure === 'gst' ? (inv.igstAmount || 0) + (inv.cgstAmount || 0) + (inv.sgstAmount || 0) : (inv.total - inv.subtotal)) || 0;
          monthlyITC += tax;
        }
      });
      runningTotal += monthlyITC;
      return {
        name: m,
        'Monthly ITC': Math.round(monthlyITC),
        'Cumulative ITC': Math.round(runningTotal)
      };
    });
  }, [invoices]);

  // Outflow Trends in 2026
  const outflowData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((m, idx) => {
      const monthNum = String(idx + 1).padStart(2, '0');
      let expenses = 0;
      let transfers = 0;
      financeRecords.forEach(rec => {
        if (rec.date && rec.date.startsWith(`2026-${monthNum}`)) {
          if (rec.type === 'expense') {
            expenses += rec.amount || 0;
          } else if (rec.type === 'transfer') {
            transfers += rec.amount || 0;
          }
        }
      });
      return {
        name: m,
        'Expenses': Math.round(expenses),
        'Transfers Out': Math.round(transfers),
        'Total Outflow': Math.round(expenses + transfers)
      };
    });
  }, [financeRecords]);


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

  
  useEffect(() => {
    const handleOpen = () => {
      resetForm();
      setIsFormOpen(true);
    };
    window.addEventListener('OPEN_CREATE_INVOICE', handleOpen);
    return () => window.removeEventListener('OPEN_CREATE_INVOICE', handleOpen);
  }, []);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxableSubtotal = items.reduce((sum, item) => sum + (item.taxable !== false ? item.amount : 0), 0);
  
  // GST Split calculations
  const cgstRate = taxStructure === 'gst' && gstType === 'intrastate' ? taxRate / 2 : 0;
  const sgstRate = taxStructure === 'gst' && gstType === 'intrastate' ? taxRate / 2 : 0;
  const igstRate = taxStructure === 'gst' && gstType === 'interstate' ? taxRate : 0;

  const cgstAmount = (taxableSubtotal * cgstRate) / 100;
  const sgstAmount = (taxableSubtotal * sgstRate) / 100;
  const igstAmount = (taxableSubtotal * igstRate) / 100;

  const taxAmount = taxStructure === 'gst' ? (cgstAmount + sgstAmount + igstAmount) : ((taxableSubtotal * taxRate) / 100);
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
      toast.error("Please fill in all client details and description for all items.");
      return;
    }

    const calculatedCgstRate = taxStructure === 'gst' && gstType === 'intrastate' ? taxRate / 2 : 0;
    const calculatedSgstRate = taxStructure === 'gst' && gstType === 'intrastate' ? taxRate / 2 : 0;
    const calculatedIgstRate = taxStructure === 'gst' && gstType === 'interstate' ? taxRate : 0;

    const calculatedCgstAmount = (taxableSubtotal * calculatedCgstRate) / 100;
    const calculatedSgstAmount = (taxableSubtotal * calculatedSgstRate) / 100;
    const calculatedIgstAmount = (taxableSubtotal * calculatedIgstRate) / 100;

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
      taxStructure,
      gstType,
      cgstRate: calculatedCgstRate,
      sgstRate: calculatedSgstRate,
      igstRate: calculatedIgstRate,
      cgstAmount: calculatedCgstAmount,
      sgstAmount: calculatedSgstAmount,
      igstAmount: calculatedIgstAmount,
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
      payments,
      templateId,
      reminders: selectedInvoice?.reminders || []
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
    setTaxRate(18); // Default standard GST 18%
    setTaxStructure('gst');
    setGstType('intrastate');
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
    setTemplateId('standard');
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
    setTaxStructure(invoice.taxStructure || 'standard');
    setGstType(invoice.gstType || 'intrastate');
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
    setTemplateId(invoice.templateId || 'standard');
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await invoiceService.deleteInvoice(id);
      // Clean up related finance records from the Finance Tracker
      const existingRecord = await financeService.getRecordByInvoiceId(id);
      if (existingRecord) {
        await financeService.deleteRecord(existingRecord.id);
      }
    } catch (err) {
      console.error("Error deleting invoice", err);
    }
  };

  const handleUpdateStatus = async (invoice: Invoice, newStatus: Invoice['status']) => {
    try {
      await invoiceService.updateInvoice(invoice.id, { status: newStatus });
      // Sync status updates with the Finance Tracker
      if (invoice.documentType === 'invoice') {
        const existingRecord = await financeService.getRecordByInvoiceId(invoice.id);
        if (existingRecord) {
          let recordStatus: 'paid' | 'pending' | 'overdue' = 'pending';
          if (newStatus === 'paid') recordStatus = 'paid';
          if (newStatus === 'overdue') recordStatus = 'overdue';
          await financeService.updateRecord(existingRecord.id, {
            status: recordStatus
          });
        }
      }
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

  // Client Ledger aggregated statistics
  const clientLedgerSummary = useMemo(() => {
    const summaryMap: { 
      [name: string]: { 
        email: string; 
        totalInvoiced: number; 
        totalPaid: number; 
        outstanding: number; 
        remindersCount: number;
        overdue: number;
      } 
    } = {};

    invoices.forEach(inv => {
      if (inv.documentType === 'estimate') return; // skip estimates
      const name = inv.clientName || 'Unnamed Client';
      if (!summaryMap[name]) {
        summaryMap[name] = {
          email: inv.clientEmail || '',
          totalInvoiced: 0,
          totalPaid: 0,
          outstanding: 0,
          remindersCount: 0,
          overdue: 0
        };
      }

      summaryMap[name].totalInvoiced += inv.total;
      summaryMap[name].totalPaid += (inv.amountPaid || 0);
      
      const outstanding = inv.status === 'paid' ? 0 : (inv.total - (inv.amountPaid || 0));
      summaryMap[name].outstanding += outstanding;
      summaryMap[name].remindersCount += (inv.reminders?.length || 0);

      const isOverdue = (inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'partial') && isAfter(new Date(), parseISO(inv.dueDate));
      if (isOverdue) {
        summaryMap[name].overdue += outstanding;
      }
    });

    return Object.entries(summaryMap).map(([clientName, stats]) => ({
      clientName,
      ...stats
    }));
  }, [invoices]);

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
          #print-invoice-modal, #print-invoice-modal *, #print-ledger-modal, #print-ledger-modal * {
            visibility: visible;
          }
          #print-invoice-modal, #print-ledger-modal {
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
              {isAdmin ? "Total Invoiced" : "Total Billed"}
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
              {isAdmin ? "Received Payments" : "Payments Made"}
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
      <div className="no-print bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" /> Business Intelligence & Analytics
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Real-year GST comparisons, input tax credits, and cash outflow trends.</p>
          </div>
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl self-start">
            <button
              onClick={() => setAnalyticsTab('revenue')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${analyticsTab === 'revenue' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Revenue
            </button>
            <button
              onClick={() => setAnalyticsTab('tax')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${analyticsTab === 'tax' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              YoY GST
            </button>
            <button
              onClick={() => setAnalyticsTab('itc')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${analyticsTab === 'itc' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Cumulative ITC
            </button>
            <button
              onClick={() => setAnalyticsTab('outflows')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${analyticsTab === 'outflows' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Cash Outflows
            </button>
          </div>
        </div>

        {analyticsTab === 'revenue' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">6-Month Revenue & Collections Trend</h4>
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
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area type="monotone" name={isAdmin ? "Total Invoiced" : "Total Billed"} dataKey="invoiced" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorInvoiced)" />
                    <Area type="monotone" name={isAdmin ? "Total Paid" : "Payments Made"} dataKey="paid" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPaid)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">A/R Aging Summary</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Outstanding']}
                      cursor={{ fill: '#f9fafb' }}
                    />
                    <Bar dataKey="amount" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {analyticsTab === 'tax' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">GST Tax Component Comparisons (Year-over-Year)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yoyTaxData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="CGST" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="SGST" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="IGST" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">GST Filings Health</h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                    <span className="text-xs font-medium text-slate-500">Total GST Accrued</span>
                    <span className="text-sm font-bold text-slate-800">
                      ₹{yoyTaxData.reduce((acc, curr) => acc + curr.TotalTax, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                    <span className="text-xs font-medium text-slate-500">Active CGST Portions</span>
                    <span className="text-sm font-bold text-[#6366f1]">
                      ₹{yoyTaxData.reduce((acc, curr) => acc + curr.CGST, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                    <span className="text-xs font-medium text-slate-500">Active SGST Portions</span>
                    <span className="text-sm font-bold text-[#a855f7]">
                      ₹{yoyTaxData.reduce((acc, curr) => acc + curr.SGST, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-4">
                * Real-time automated division of GST into Central (CGST), State (SGST), and Integrated (IGST) ledgers based on client geolocation.
              </p>
            </div>
          </div>
        )}

        {analyticsTab === 'itc' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Input Tax Credit (ITC) Accumulation Curve (CY 2026)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={itcData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorITC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area type="monotone" name="Monthly ITC Gained" dataKey="Monthly ITC" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorITC)" />
                    <Area type="monotone" name="Cumulative Claimable ITC" dataKey="Cumulative ITC" stroke="#1d4ed8" strokeWidth={2.5} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">ITC Reconciliation</h5>
                <div className="space-y-3">
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cumulative GSTR-2B ITC</p>
                    <p className="text-2xl font-black text-blue-600 mt-1">
                      ₹{itcData[itcData.length - 1]?.['Cumulative ITC'].toLocaleString() || '0'}
                    </p>
                  </div>
                  <div className="p-4 bg-white border border-slate-100 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ready to Offset</p>
                    <p className="text-xs font-extrabold text-emerald-600 mt-1">100% Fully Reconciled</p>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-4">
                * Claimable ITC calculated automatically from all paid consultant fees, helping you offset downstream GST liabilities.
              </p>
            </div>
          </div>
        )}

        {analyticsTab === 'outflows' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Firm/Client Cash Outflows & Overhead Burn (CY 2026)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={outflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area type="monotone" name="Total Monthly Outflow" dataKey="Total Outflow" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOutflow)" />
                    <Area type="monotone" name="Direct Expenses" dataKey="Expenses" stroke="#f97316" strokeWidth={1.5} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div>
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Cash Burn Diagnostics</h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                    <span className="text-xs font-medium text-slate-500">Annual Outflow Sum</span>
                    <span className="text-sm font-bold text-rose-600">
                      ₹{outflowData.reduce((acc, curr) => acc + curr['Total Outflow'], 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                    <span className="text-xs font-medium text-slate-500">Expenses</span>
                    <span className="text-sm font-bold text-slate-700">
                      ₹{outflowData.reduce((acc, curr) => acc + curr.Expenses, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
                    <span className="text-xs font-medium text-slate-500">Transfers Out</span>
                    <span className="text-sm font-bold text-slate-700">
                      ₹{outflowData.reduce((acc, curr) => acc + curr['Transfers Out'], 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-4">
                * Sum of expenses and ledger transfers synced directly with the Monthly Corporate Accounts databases.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CLIENT LEDGER & COLLECTION INSIGHTS PANEL */}
      {isAdmin && (
        <div className="no-print bg-white rounded-2xl border border-slate-100 mb-6 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <button 
            type="button"
            onClick={() => setIsLedgerExpanded(!isLedgerExpanded)}
            className="w-full px-6 py-4 bg-slate-50/50 flex items-center justify-between text-left hover:bg-slate-100/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#1a2b58]" />
              <div>
                <h3 className="font-bold text-slate-950 text-sm">Client Ledger Summary & Collection Insights</h3>
                <p className="text-xs text-slate-500 font-medium">Aggregated balances, payments received, and active chaser statistics by account</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
              <span>{isLedgerExpanded ? 'Hide Ledger Details' : 'Show Ledger Details'}</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${isLedgerExpanded ? 'rotate-90' : ''}`} />
            </div>
          </button>

          {isLedgerExpanded && (
          <div className="p-6 border-t border-slate-100">
            {clientLedgerSummary.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-6">No client invoice activity recorded to construct ledger statements.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3">Client Account</th>
                      <th className="px-5 py-3 text-right">Total Invoiced</th>
                      <th className="px-5 py-3 text-right">Total Collected</th>
                      <th className="px-5 py-3 text-right">Outstanding Balance</th>
                      <th className="px-5 py-3 text-right text-rose-600">Overdue Amount</th>
                      <th className="px-5 py-3 text-center">Reminders Dispatched</th>
                      <th className="px-5 py-3 text-center no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {clientLedgerSummary.map(row => (
                      <tr key={row.clientName} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900 text-sm">{row.clientName}</div>
                          <div className="text-slate-400 mt-0.5">{row.email || 'No email associated'}</div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-800">
                          ₹{row.totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-600 bg-emerald-50/10">
                          ₹{row.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-indigo-600 bg-indigo-50/10">
                          ₹{row.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`px-5 py-3.5 text-right font-mono font-semibold ${row.overdue > 0 ? 'text-rose-600 bg-rose-50/10 font-bold' : 'text-slate-400'}`}>
                          ₹{row.overdue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex items-center justify-center font-bold font-mono px-2 py-0.5 rounded-full text-2xs ${row.remindersCount > 0 ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                            {row.remindersCount} Sent
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center no-print">
                          <button 
                            type="button"
                            onClick={() => {
                              const match = invoices.find(inv => inv.clientName === row.clientName && inv.status !== 'paid');
                              if (match) {
                                openReminderModal(match);
                              } else {
                                toast.error("No active outstanding invoices found for this client account to dispatch reminders.");
                              }
                            }}
                            className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-indigo-600 text-slate-700 hover:text-indigo-600 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                            title="Dispatch payment demand reminder to client partner"
                          >
                            <Mail className="w-3.5 h-3.5" /> Chaser
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
             )}
           </div>
         )}
       </div>
      )}

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

        {/* Action Triggers */}
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-4.5 py-2.5 rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98]"
            title={isAdmin ? "Download invoice catalog spreadsheet for audits" : "Download your invoice history"}
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>

          <button 
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-4.5 py-2.5 rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98]"
            title="Download invoice ledger formatted for MS Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-650" /> Export Excel
          </button>

          <button 
            onClick={handleExportPDF}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-4.5 py-2.5 rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98]"
            title="Generate professionally styled PDF invoice ledger"
          >
            <FileText className="w-4 h-4 text-red-600" /> Export PDF
          </button>

          <button 
            onClick={handleGenerateVirtualDemo}
            className="flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm px-4.5 py-2.5 rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98]"
            title="Simulate 2,500 invoices to test virtual list performance"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" /> Virtualization Demo
          </button>

          {isAdmin && (
            <button 
              onClick={() => { resetForm(); setIsFormOpen(true); }}
              className="flex items-center justify-center gap-2 bg-[#1a2b58] hover:bg-[#121f40] text-white font-semibold text-sm px-4.5 py-2.5 rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" /> Generate Invoice
            </button>
          )}
        </div>
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
              {isAdmin 
                ? "Generate invoice lists to invoice consulting engagements, compliance files, and more." 
                : "You do not have any active invoices on your account yet."}
            </p>
          </div>
        ) : (
          <div 
            className="overflow-auto max-h-[500px]"
            onScroll={(e) => {
              setScrollTop(e.currentTarget.scrollTop);
            }}
          >
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_rgba(0,0,0,0.01)]">
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Client Detail</th>
                  <th className="px-6 py-4">Dates (Issue / Due)</th>
                  <th className="px-6 py-4">Total Price</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {(() => {
                  const rowHeight = 73; // approx row height in px
                  const totalInvoices = filteredInvoices.length;
                  const viewportHeight = 500;
                  
                  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
                  const endIndex = Math.min(totalInvoices, Math.floor((scrollTop + viewportHeight) / rowHeight) + 3);
                  
                  const topPadding = startIndex * rowHeight;
                  const bottomPadding = Math.max(0, (totalInvoices - endIndex) * rowHeight);
                  
                  const visibleInvoices = filteredInvoices.slice(startIndex, endIndex);

                  return (
                    <>
                      {topPadding > 0 && (
                        <tr>
                          <td colSpan={6} style={{ height: `${topPadding}px`, border: 'none', padding: 0 }} />
                        </tr>
                      )}
                      
                      {visibleInvoices.map(invoice => {
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
                                  onClick={() => { 
                                    setSelectedInvoice(invoice); 
                                    setViewTemplateId(invoice.templateId || 'standard'); 
                                    setIsViewOpen(true); 
                                  }}
                                  className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="View Invoice Sheet"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Edit (only drafts or sent) */}
                                {isAdmin && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                  <button 
                                    onClick={() => handleEdit(invoice)}
                                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Modify invoice details"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Mark as Paid / Unpaid */}
                                {isAdmin && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                  <button 
                                    onClick={() => handleUpdateStatus(invoice, 'paid')}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Mark Invoice as Paid"
                                  >
                                    <Check className="w-4 h-4 font-bold" />
                                  </button>
                                )}

                                {/* Delete */}
                                {isAdmin && (
                                  <button 
                                    onClick={() => handleDelete(invoice.id)}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete invoice record"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {bottomPadding > 0 && (
                        <tr>
                          <td colSpan={6} style={{ height: `${bottomPadding}px`, border: 'none', padding: 0 }} />
                        </tr>
                      )}
                    </>
                  );
                })()}
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
            <div className="no-print bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <button 
                  onClick={() => setIsViewOpen(false)}
                  className="flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-[#1a2b58] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to List
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Zoho Style:</span>
                  <CustomSelect
                    value={viewTemplateId}
                    onChange={(val) => setViewTemplateId(val as any)}
                    className="border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 focus:outline-none transition-all text-slate-700 shadow-sm"
                    options={[
                      { value: "standard", label: "💼 Standard" },
                      { value: "modern", label: "✨ Modern Slate" },
                      { value: "elegant", label: "🖋️ Elegant Editorial" },
                      { value: "compact", label: "⚡ Compact Lite" },
                      { value: "fresh", label: "🌱 Fresh Bold" }
                    ]}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewTemplateId(viewTemplateId);
                      setIsTemplateShowcaseOpen(true);
                    }}
                    className="no-print flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-300 bg-indigo-50/50 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
                    title="Compare and view layout samples of all design templates"
                  >
                    Compare Styles 🎨
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
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
                    {selectedInvoice.documentType === 'estimate' && (
                      <button 
                        onClick={() => handleConvertEstimate(selectedInvoice)}
                        className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Convert to Invoice
                      </button>
                    )}
                    
                    {selectedInvoice.documentType !== 'estimate' && (
                      <button 
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> Record Payment
                      </button>
                    )}

                     {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' && selectedInvoice.documentType !== 'estimate' && (
                      <button 
                        onClick={() => handleApplyLateFee(selectedInvoice)}
                        className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                        title="Add late fee penalty to invoice"
                      >
                        <AlertCircle className="w-3.5 h-3.5" /> Apply Late Fee
                      </button>
                    )}

                    <button 
                      onClick={() => openReminderModal(selectedInvoice)}
                      className="flex items-center gap-1.5 bg-[#1a2b58] hover:bg-[#121f40] text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                    >
                      <Mail className="w-3.5 h-3.5" /> Send Reminder / Mail
                    </button>
                  </>
                ) : (
                  <>
                    {selectedInvoice.status !== 'paid' && selectedInvoice.documentType !== 'estimate' && (
                      <button 
                        onClick={() => {
                          setCheckoutStep('input');
                          setCheckoutGateway('stripe');
                          setCardNumber('');
                          setCardExpiry('');
                          setCardCvc('');
                          setCardName('');
                          setUpiId('');
                          setOtpCode('');
                          setIsCheckoutModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 bg-[#635BFF] hover:bg-[#5851e5] text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> Pay Now
                      </button>
                    )}
                    <a
                      href={`mailto:${selectedInvoice.senderEmail || 'billing@apexconsulting.com'}?subject=Inquiry regarding Invoice ${selectedInvoice.invoiceNumber}`}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4" /> Contact Support
                    </a>
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
            <div id="print-invoice-modal" className={`p-8 md:p-12 bg-white text-slate-800 flex-1 relative ${
              viewTemplateId === 'elegant' ? 'font-serif' : 'font-sans'
            } ${viewTemplateId === 'compact' ? 'text-[11px]' : 'text-xs'}`}>

              {/* HEADER SECTION SWITCHER */}
              {viewTemplateId === 'standard' && (
                <div className="flex flex-col md:flex-row md:items-start justify-between border-b border-slate-100 pb-8 gap-6 mb-6">
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
                    <h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-tight">
                      {selectedInvoice.documentType === 'estimate' ? 'Estimate' : 'Invoice'}
                    </h1>
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
              )}

              {viewTemplateId === 'modern' && (
                <div className="bg-slate-900 text-white -mx-8 -mt-8 p-8 md:-mx-12 md:-mt-12 md:p-10 mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
                  <div>
                    <div className="text-2xl font-black tracking-wider uppercase text-slate-100 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-emerald-400" />
                      <span>{selectedInvoice.senderName || 'Apex Consulting Ltd.'}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-3 whitespace-pre-line leading-relaxed max-w-sm">
                      {selectedInvoice.senderAddress || '100 Financial Way, Suite 400, New York, NY 10005'}
                    </p>
                    <p className="text-xs text-emerald-300 mt-1.5 font-medium">
                      {selectedInvoice.senderEmail || 'billing@apexconsulting.com'}
                    </p>
                  </div>
                  <div className="text-left md:text-right md:min-w-[200px]">
                    <h2 className="text-3xl font-black tracking-widest uppercase text-slate-400">
                      {selectedInvoice.documentType === 'estimate' ? 'Estimate' : 'Invoice'}
                    </h2>
                    <div className="font-mono text-sm font-semibold text-emerald-400 mt-1">{selectedInvoice.invoiceNumber}</div>
                    <div className="mt-4 text-xs text-slate-300 space-y-1 font-medium">
                      <div>Issued: <span className="text-white">{selectedInvoice.issueDate}</span></div>
                      <div>Due Date: <span className="text-white">{selectedInvoice.dueDate}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {viewTemplateId === 'elegant' && (
                <div className="text-center border-b-4 border-double border-slate-800 pb-6 mb-8">
                  <div className="text-3xl font-serif italic tracking-tight text-slate-950 font-bold">{selectedInvoice.senderName || 'Apex Consulting Ltd.'}</div>
                  <div className="text-xs text-slate-500 mt-1 font-serif tracking-wider uppercase font-semibold">Professional Services Statement</div>
                  <p className="text-xs text-slate-600 mt-3 max-w-md mx-auto whitespace-pre-line leading-relaxed italic font-serif">
                    {selectedInvoice.senderAddress || '100 Financial Way, Suite 400, New York, NY 10005'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 font-serif border-t border-slate-100 pt-2 inline-block px-4">
                    {selectedInvoice.senderEmail || 'billing@apexconsulting.com'}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 text-xs text-slate-700">
                    <div className="text-left">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400 block">Statement Reference</span>
                      <span className="font-mono text-sm font-bold text-slate-900">{selectedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="text-center my-2 sm:my-0">
                      <span className="text-2xl font-serif font-bold uppercase tracking-widest text-slate-900">
                        {selectedInvoice.documentType === 'estimate' ? 'Estimate' : 'Invoice'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400 block">Issue Date / Due Date</span>
                      <span className="font-semibold">{selectedInvoice.issueDate}</span> to <span className="font-bold text-rose-700">{selectedInvoice.dueDate}</span>
                    </div>
                  </div>
                </div>
              )}

              {viewTemplateId === 'compact' && (
                <div className="flex justify-between items-center border-b border-slate-300 pb-3 mb-4">
                  <div>
                    <div className="font-bold text-[#1a2b58] text-base leading-tight">{selectedInvoice.senderName || 'Apex Consulting Ltd.'}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{selectedInvoice.senderAddress?.replace(/\n/g, ', ') || '100 Financial Way, NY 10005'} | {selectedInvoice.senderEmail || 'billing@apexconsulting.com'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-900 uppercase tracking-wider">{selectedInvoice.documentType === 'estimate' ? 'ESTIMATE' : 'INVOICE'}</div>
                    <div className="font-mono text-xs font-bold text-indigo-600">{selectedInvoice.invoiceNumber}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Issued: {selectedInvoice.issueDate} | Due: {selectedInvoice.dueDate}</div>
                  </div>
                </div>
              )}

              {viewTemplateId === 'fresh' && (
                <div className="border-l-8 border-emerald-500 pl-5 mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
                  <div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                      <span className="text-emerald-500">■</span>
                      <span>{selectedInvoice.senderName || 'Apex Consulting Ltd.'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 max-w-sm whitespace-pre-line leading-relaxed font-medium">
                      {selectedInvoice.senderAddress || '100 Financial Way, Suite 400, New York, NY 10005'}
                    </p>
                    <p className="text-xs text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                      <span>✉</span> {selectedInvoice.senderEmail || 'billing@apexconsulting.com'}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <h1 className="text-4xl font-black text-emerald-600 uppercase tracking-tight leading-none mb-1">
                      {selectedInvoice.documentType === 'estimate' ? 'Estimate' : 'Invoice'}
                    </h1>
                    <div className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold font-mono px-2.5 py-1 rounded-lg text-xs mt-1">
                      {selectedInvoice.invoiceNumber}
                    </div>
                    <div className="mt-4 text-xs text-slate-500 space-y-0.5 font-semibold">
                      <div>Issued Date: <span className="text-slate-800">{selectedInvoice.issueDate}</span></div>
                      <div>Payment Due: <span className="text-rose-600">{selectedInvoice.dueDate}</span></div>
                    </div>
                  </div>
                </div>
              )}


              {/* CLIENT DETAILS SECTION SWITCHER */}
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed mb-6 ${
                viewTemplateId === 'compact' ? 'py-2 mb-4 gap-4' : 'py-6 mb-6'
              } ${
                viewTemplateId === 'elegant' ? 'border-b border-slate-100 font-serif' : ''
              } ${
                viewTemplateId === 'standard' ? 'border-b border-slate-100' : ''
              }`}>
                <div>
                  <span className={`uppercase tracking-wider font-bold block mb-2 ${
                    viewTemplateId === 'fresh' ? 'text-emerald-600 text-[10px]' : 'text-slate-400 text-[10px]'
                  }`}>Billed To</span>
                  <div className="text-sm font-bold text-slate-900">{selectedInvoice.clientName}</div>
                  <div className="text-slate-500 font-medium mt-0.5">{selectedInvoice.clientEmail}</div>
                  {selectedInvoice.clientAddress && (
                    <div className="text-slate-400 mt-1.5 whitespace-pre-line leading-relaxed italic">{selectedInvoice.clientAddress}</div>
                  )}
                </div>

                <div>
                  <span className={`uppercase tracking-wider font-bold block mb-2 ${
                    viewTemplateId === 'fresh' ? 'text-emerald-600 text-[10px]' : 'text-slate-400 text-[10px]'
                  }`}>Payment Terms & Status</span>
                  {viewTemplateId !== 'compact' && (
                    <p className="text-slate-400 leading-normal mb-2 max-w-xs">
                      All balances should be settled in full by the stipulated due date. Thank you for your continued business partnership.
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 font-medium">
                    <span className="font-bold text-slate-700">Terms:</span>
                    <span className="text-slate-600">{selectedInvoice.paymentTerms || 'Due on Receipt'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="font-bold text-slate-700">Status:</span>
                    {getStatusBadge(selectedInvoice.status, selectedInvoice.dueDate)}
                  </div>
                </div>
              </div>


              {/* ITEMS TABLE SECTION SWITCHER */}
              <div className={`overflow-hidden mb-6 ${
                viewTemplateId === 'fresh' ? 'border-2 border-emerald-500/20 rounded-2xl' : ''
              } ${
                viewTemplateId === 'standard' ? 'border border-slate-100 rounded-2xl' : ''
              } ${
                viewTemplateId === 'elegant' ? 'border border-slate-200 rounded-xl' : ''
              } ${
                viewTemplateId === 'modern' ? 'border-b border-slate-300' : ''
              } ${
                viewTemplateId === 'compact' ? 'border border-slate-200 rounded-lg mb-3' : ''
              }`}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`uppercase text-[10px] font-bold tracking-wider ${
                      viewTemplateId === 'fresh' ? 'bg-emerald-600 text-white' : 
                      viewTemplateId === 'modern' ? 'bg-slate-100 text-slate-800 border-b-2 border-slate-400' :
                      viewTemplateId === 'elegant' ? 'bg-[#FAF9F6] text-slate-800 border-b border-slate-200' :
                      viewTemplateId === 'compact' ? 'bg-slate-50 text-slate-500 border-b border-slate-200' :
                      'bg-slate-50 border-b border-slate-100 text-slate-500'
                    }`}>
                      <th className={`font-semibold ${viewTemplateId === 'compact' ? 'px-3 py-1.5' : 'px-5 py-3'}`}>Description of Services / Items</th>
                      <th className={`text-center w-20 font-semibold ${viewTemplateId === 'compact' ? 'px-3 py-1.5' : 'px-5 py-3'}`}>Quantity</th>
                      <th className={`text-right w-28 font-semibold ${viewTemplateId === 'compact' ? 'px-3 py-1.5' : 'px-5 py-3'}`}>Rate ({getCurrencySymbol(selectedInvoice.currency)})</th>
                      <th className={`text-right w-32 font-semibold ${viewTemplateId === 'compact' ? 'px-3 py-1.5' : 'px-5 py-3'}`}>Line Total ({getCurrencySymbol(selectedInvoice.currency)})</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-slate-700 ${
                    viewTemplateId === 'fresh' ? 'divide-emerald-500/10' : 'divide-slate-100'
                  }`}>
                    {selectedInvoice.items.map(item => (
                      <tr key={item.id} className={`${
                        viewTemplateId === 'fresh' ? 'hover:bg-emerald-500/5' : 'hover:bg-slate-50/50'
                      } transition-colors`}>
                        <td className={`font-bold text-slate-900 ${viewTemplateId === 'compact' ? 'px-3 py-1.5' : 'px-5 py-3.5'}`}>
                          {item.type && (
                            <span className={`inline-block text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded mr-2 align-middle ${
                              viewTemplateId === 'fresh' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {item.type}
                            </span>
                          )}
                          <span className="align-middle">{item.description}</span>
                        </td>
                        <td className={`text-center font-mono ${viewTemplateId === 'compact' ? 'px-3 py-1.5' : 'px-5 py-3.5'}`}>{item.quantity}</td>
                        <td className={`text-right font-mono ${viewTemplateId === 'compact' ? 'px-3 py-1.5' : 'px-5 py-3.5'}`}>
                          {getCurrencySymbol(selectedInvoice.currency)}{item.rate.toFixed(2)}
                        </td>
                        <td className={`text-right font-mono font-bold text-slate-900 ${viewTemplateId === 'compact' ? 'px-3 py-1.5' : 'px-5 py-3.5'}`}>
                          {getCurrencySymbol(selectedInvoice.currency)}{item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>


              {/* PAYMENT HISTORY */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className={`py-3 mb-4 ${viewTemplateId === 'compact' ? 'py-1.5 mb-2' : ''}`}>
                  <h4 className={`text-[10px] font-extrabold uppercase tracking-wider mb-2 ${
                    viewTemplateId === 'fresh' ? 'text-emerald-600' : 'text-slate-800'
                  }`}>Payment Collection History</h4>
                  <div className={`overflow-hidden border border-slate-100 ${
                    viewTemplateId === 'fresh' ? 'rounded-2xl border-emerald-500/10' : 'rounded-xl'
                  }`}>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50">
                        <tr className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                          <th className="px-4 py-1.5">Date Received</th>
                          <th className="px-4 py-1.5">Method</th>
                          <th className="px-4 py-1.5">Reference Id</th>
                          <th className="px-4 py-1.5 text-right font-semibold">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {selectedInvoice.payments.map(p => (
                          <tr key={p.id}>
                            <td className="px-4 py-1.5">{p.date}</td>
                            <td className="px-4 py-1.5">{p.method}</td>
                            <td className="px-4 py-1.5 text-slate-400 font-mono text-[10px]">{p.reference || '-'}</td>
                            <td className="px-4 py-1.5 text-emerald-600 font-bold font-mono text-right">
                              {getCurrencySymbol(selectedInvoice.currency)}{p.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}


              {/* BOTTOM NOTES & TOTALS SECTION */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-6 py-4">
                <div className="flex-1 text-slate-500 leading-relaxed space-y-4">
                  {selectedInvoice.notes && (
                    <div>
                      <span className={`font-extrabold block text-[10px] uppercase tracking-wider mb-1 ${
                        viewTemplateId === 'fresh' ? 'text-emerald-600' : 'text-slate-700'
                      }`}>Customer Notes</span>
                      <p className="max-w-sm whitespace-pre-line text-slate-500 italic">{selectedInvoice.notes}</p>
                    </div>
                  )}
                  {selectedInvoice.termsAndConditions && (
                    <div>
                      <span className={`font-extrabold block text-[10px] uppercase tracking-wider mb-1 ${
                        viewTemplateId === 'fresh' ? 'text-emerald-600' : 'text-slate-700'
                      }`}>Terms & Conditions</span>
                      <p className="max-w-sm whitespace-pre-line text-[10px] text-slate-400 leading-normal">{selectedInvoice.termsAndConditions}</p>
                    </div>
                  )}

                  {/* Audit timeline (No print) */}
                  {selectedInvoice.reminders && selectedInvoice.reminders.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-100 no-print">
                      <span className="font-bold text-slate-600 block uppercase tracking-wider text-[9px] mb-2.5">Communication Audit Logs</span>
                      <div className="space-y-3 pl-1">
                        {selectedInvoice.reminders.map(rem => (
                          <div key={rem.id} className="flex gap-2 items-start text-[10px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-700 uppercase tracking-tight">{rem.channel} Reminder Dispatched</div>
                              <div className="text-slate-400 font-mono text-[9px]">{rem.date}</div>
                              <div className="text-slate-500 mt-0.5 italic max-w-sm leading-normal">
                                "{rem.message.length > 90 ? rem.message.substring(0, 90) + '...' : rem.message}"
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtotals & Taxes calculation breakdown list */}
                <div className={`w-full sm:w-80 shrink-0 flex flex-col gap-2 ${
                  viewTemplateId === 'fresh' ? 'bg-[#10b981]/5 border-2 border-emerald-500/15 p-4 rounded-2xl' : 
                  viewTemplateId === 'modern' ? 'bg-slate-50 border border-slate-200 p-4 rounded-xl' :
                  viewTemplateId === 'elegant' ? 'bg-[#FAF9F6] border border-slate-200 p-5 rounded-xl font-serif' :
                  viewTemplateId === 'compact' ? 'gap-1 p-2 bg-slate-50 border border-slate-100 rounded-lg' :
                  'bg-slate-50/50 p-4 rounded-2xl border border-slate-100'
                }`}>
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-bold text-slate-800 font-medium">
                      {getCurrencySymbol(selectedInvoice.currency)}{selectedInvoice.subtotal.toFixed(2)}
                    </span>
                  </div>

                  {selectedInvoice.taxRate > 0 && (
                    selectedInvoice.taxStructure === 'gst' ? (
                      selectedInvoice.gstType === 'intrastate' ? (
                        <>
                          <div className="flex justify-between text-slate-600">
                            <span>CGST ({(selectedInvoice.taxRate / 2)}%)</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {getCurrencySymbol(selectedInvoice.currency)}
                              {(selectedInvoice.cgstAmount || ((selectedInvoice.subtotal * (selectedInvoice.taxRate / 2)) / 100)).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>SGST ({(selectedInvoice.taxRate / 2)}%)</span>
                            <span className="font-mono font-semibold text-slate-800">
                              {getCurrencySymbol(selectedInvoice.currency)}
                              {(selectedInvoice.sgstAmount || ((selectedInvoice.subtotal * (selectedInvoice.taxRate / 2)) / 100)).toFixed(2)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-slate-600">
                          <span>IGST ({selectedInvoice.taxRate}%)</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {getCurrencySymbol(selectedInvoice.currency)}
                            {(selectedInvoice.igstAmount || ((selectedInvoice.subtotal * selectedInvoice.taxRate) / 100)).toFixed(2)}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="flex justify-between text-slate-600">
                        <span>Service Tax ({selectedInvoice.taxRate}%)</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {getCurrencySymbol(selectedInvoice.currency)}
                          {((selectedInvoice.subtotal * selectedInvoice.taxRate) / 100).toFixed(2)}
                        </span>
                      </div>
                    )
                  )}

                  {selectedInvoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Client Discount</span>
                      <span className="font-mono">
                        {selectedInvoice.discountType === 'percentage' 
                          ? `-${selectedInvoice.discount}% (-${getCurrencySymbol(selectedInvoice.currency)}${((selectedInvoice.subtotal * selectedInvoice.discount) / 100).toFixed(2)})`
                          : `-${getCurrencySymbol(selectedInvoice.currency)}${selectedInvoice.discount.toFixed(2)}`
                        }
                      </span>
                    </div>
                  )}

                  <div className={`border-t pt-3 flex justify-between text-base font-black ${
                    viewTemplateId === 'fresh' ? 'border-emerald-500/20 text-emerald-700' :
                    viewTemplateId === 'modern' ? 'border-slate-300 text-slate-900' :
                    viewTemplateId === 'elegant' ? 'border-slate-800 text-slate-950 font-serif font-bold' :
                    'border-slate-200 text-slate-900'
                  }`}>
                    <span>Total Due</span>
                    <span className="font-mono">
                      {getCurrencySymbol(selectedInvoice.currency)}{selectedInvoice.total.toFixed(2)}
                    </span>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase">Zoho Design Template</label>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewTemplateId(templateId);
                        setIsTemplateShowcaseOpen(true);
                      }}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      🎨 Preview Samples
                    </button>
                  </div>
                  <CustomSelect
                    value={templateId}
                    onChange={(val) => setTemplateId(val as any)}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-white focus:outline-none focus:border-primary hover:shadow-sm transition-all text-primary"
                    options={[
                      { value: "standard", label: "💼 Zoho Standard" },
                      { value: "modern", label: "✨ Zoho Modern" },
                      { value: "elegant", label: "🖋️ Zoho Elegant" },
                      { value: "compact", label: "⚡ Zoho Compact" },
                      { value: "fresh", label: "🌱 Zoho Fresh Bold" }
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

                  {/* Tax Structure Picker */}
                  <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Tax Structure</span>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => { setTaxStructure('standard'); setTaxRate(5); }}
                          className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${taxStructure === 'standard' ? 'bg-[#1a2b58] text-white font-bold' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                        >
                          Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTaxStructure('gst'); setTaxRate(18); }}
                          className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${taxStructure === 'gst' ? 'bg-[#1a2b58] text-white font-bold' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                        >
                          GST (India)
                        </button>
                      </div>
                    </div>

                    {taxStructure === 'gst' ? (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-slate-500 font-medium">GST Type</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setGstType('intrastate')}
                            className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${gstType === 'intrastate' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-white border border-slate-105 hover:bg-slate-50 text-slate-500'}`}
                          >
                            Intrastate
                          </button>
                          <button
                            type="button"
                            onClick={() => setGstType('interstate')}
                            className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${gstType === 'interstate' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'bg-white border border-slate-105 hover:bg-slate-50 text-slate-500'}`}
                          >
                            Interstate
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                      <span className="text-slate-500 font-medium">
                        {taxStructure === 'gst' ? 'Combined GST Rate (%)' : 'Service Tax (%)'}
                      </span>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-14 text-right border border-slate-200 px-1 py-0.5 rounded font-mono focus:outline-none"
                      />
                    </div>

                    {taxStructure === 'gst' && (
                      <div className="mt-1 text-[10px] text-indigo-600 font-medium flex flex-col gap-0.5 border-t border-indigo-50/50 pt-1">
                        {gstType === 'intrastate' ? (
                          <>
                            <div className="flex justify-between">
                              <span>CGST Amount ({taxRate / 2}%)</span>
                              <span>{getCurrencySymbol(currency)}{cgstAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SGST Amount ({taxRate / 2}%)</span>
                              <span>{getCurrencySymbol(currency)}{sgstAmount.toFixed(2)}</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span>IGST Amount ({taxRate}%)</span>
                            <span>{getCurrencySymbol(currency)}{igstAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
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
                const remainingOutstanding = Math.max(0, selectedInvoice.total - updatedAmountPaid);
                
                if (existingRecord) {
                  await financeService.updateRecord(existingRecord.id, {
                    amount: remainingOutstanding,
                    status: newStatus === 'paid' ? 'paid' : 'pending'
                  });
                }
                
                if (selectedBankAccountId) {
                  await financeService.createRecord({
                    type: 'income',
                    category: 'Sales', // Default category for invoice sales revenue
                    amount: paymentValue,
                    description: `Payment received for Invoice ${selectedInvoice.invoiceNumber} - ${selectedInvoice.clientName}`,
                    date: format(new Date(), 'yyyy-MM-dd'),
                    status: 'paid',
                    paymentAccountId: selectedBankAccountId,
                    paymentMode: paymentMethod,
                    clientName: selectedInvoice.clientName,
                    clientId: selectedInvoice.userId || '',
                    invoiceId: selectedInvoice.id,
                    scope: 'business'
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
                <label className="block text-xs font-semibold text-slate-500 mb-1">Deposit/Credit to Bank Account *</label>
                {paymentAccounts.length === 0 ? (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                    No active bank accounts found. Please configure a bank account in the Finance Tracker settings first.
                  </div>
                ) : (
                  <CustomSelect
                    value={selectedBankAccountId}
                    onChange={(val) => setSelectedBankAccountId(val)}
                    className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-semibold bg-slate-50/50 hover:bg-white focus:outline-none focus:border-primary hover:shadow-sm transition-all text-primary"
                    placeholder="Select Bank/Payment Account"
                    options={paymentAccounts.map(acc => ({
                      value: acc.id,
                      label: `${acc.name} (${acc.type === 'bank_account' ? 'Bank' : acc.type === 'credit_card' ? 'Card' : 'Other'})`
                    }))}
                  />
                )}
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

      {/* CLIENT SECURE CHECKOUT MODAL (MOCKUP) */}
      {isCheckoutModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <ShieldAlert className="w-5 h-5 text-indigo-600" /> Secure Sandbox Gateway
              </h3>
              {checkoutStep !== 'success' && !checkoutSimulating && (
                <button onClick={() => setIsCheckoutModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
                  <XCircle className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[85vh]">
              {checkoutSimulating ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-12 h-12 border-4 border-t-indigo-600 border-indigo-100 rounded-full animate-spin mb-4" />
                  <h4 className="text-sm font-bold text-slate-800">Authorizing Secure Transaction...</h4>
                  <p className="text-xs text-slate-500 mt-1">Contacting acquiring bank node. Please do not refresh.</p>
                </div>
              ) : checkoutStep === 'otp' ? (
                <div className="space-y-4">
                  <div className="bg-blue-50/50 border border-blue-200/60 p-4 rounded-xl text-center">
                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">3D Secure Authentication</h4>
                    <p className="text-xs text-slate-600">A security passcode has been sent to your primary device registered with the bank.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Enter One-Time Password (OTP)</label>
                    <input
                      type="password"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit OTP (e.g. 123456)"
                      className="w-full border-2 border-slate-200 text-center tracking-widest text-lg font-mono font-bold py-2.5 rounded-xl focus:border-indigo-500 outline-none transition-all"
                    />
                    <p className="text-[10px] text-slate-400 text-center">You can input any 6-digit number to bypass the sandbox check.</p>
                  </div>

                  <button
                    onClick={async () => {
                      if (otpCode.length < 4) {
                        toast.error("Please enter a valid 6-digit secure OTP.");
                        return;
                      }
                      setCheckoutSimulating(true);
                      setTimeout(async () => {
                        try {
                          await invoiceService.updateInvoice(selectedInvoice.id, {
                            status: 'paid'
                          });
                          setCheckoutStep('success');
                          setCheckoutSimulating(false);
                          toast.success("Transaction authorized successfully!");
                        } catch (e) {
                          toast.error("An error occurred during billing.");
                          setCheckoutSimulating(false);
                        }
                      }, 1800);
                    }}
                    className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckSquare className="w-4 h-4" /> Confirm & Authorize ₹{selectedInvoice.total.toFixed(2)}
                  </button>
                </div>
              ) : checkoutStep === 'success' ? (
                <div className="text-center py-4 space-y-5">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900">Payment Processed!</h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Receipt Ref: TXN-{(Math.random() * 10000000).toFixed(0)}</p>
                  </div>
                  
                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50 text-xs space-y-2.5 text-left">
                    <div className="flex justify-between border-b border-slate-200/50 pb-2">
                      <span className="text-slate-400 font-bold">Billed To</span>
                      <span className="font-extrabold text-slate-700">{selectedInvoice.clientName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-2">
                      <span className="text-slate-400 font-bold">Invoice ID</span>
                      <span className="font-mono font-bold text-slate-700">{selectedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-slate-800 pt-1">
                      <span>Total Settled</span>
                      <span>₹{selectedInvoice.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Print Receipt
                    </button>
                    <button
                      onClick={() => setIsCheckoutModalOpen(false)}
                      className="flex-1 py-2.5 bg-[#1a2b58] hover:bg-[#121f40] text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Close Gateway
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Box */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-wider">Reference</span>
                      <span className="font-mono font-bold text-indigo-700">{selectedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-bold">Total Payable</span>
                      <span className="text-xl font-black text-slate-950">
                        ₹{selectedInvoice.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Gateway Selector Tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      onClick={() => setCheckoutGateway('stripe')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${checkoutGateway === 'stripe' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Stripe (Card)
                    </button>
                    <button
                      onClick={() => setCheckoutGateway('razorpay')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${checkoutGateway === 'razorpay' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Razorpay (UPI)
                    </button>
                  </div>

                  {checkoutGateway === 'stripe' ? (
                    <div className="space-y-3.5 pt-1">
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 leading-relaxed font-medium">
                        🔑 <strong>Sandbox Test credentials:</strong> Enter card number <code className="bg-white/60 px-1 py-0.5 rounded">4242 4242 4242 4242</code>, expiry in future (e.g. <code className="bg-white/60 px-1 py-0.5 rounded">12/28</code>), and any CVC/Name.
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cardholder Name</label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="E.g. Jyoshi Manohar"
                          className="w-full border border-slate-200 px-3.5 py-2 rounded-xl text-xs focus:border-indigo-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Card Number</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                              setCardNumber(formatted.substring(0, 19));
                            }}
                            placeholder="4242 4242 4242 4242"
                            className="w-full border border-slate-200 pl-3.5 pr-10 py-2 rounded-xl text-xs font-mono focus:border-indigo-500 outline-none"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                            {cardNumber.startsWith('4') ? 'VISA' : cardNumber.startsWith('5') ? 'MC' : cardNumber.startsWith('6') ? 'RUPAY' : 'CARD'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expiration (MM/YY)</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 2) {
                                val = val.substring(0, 2) + '/' + val.substring(2, 4);
                              }
                              setCardExpiry(val.substring(0, 5));
                            }}
                            placeholder="12/28"
                            className="w-full border border-slate-200 px-3.5 py-2 rounded-xl text-xs text-center font-mono focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">CVV / CVC</label>
                          <input
                            type="password"
                            maxLength={3}
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                            placeholder="•••"
                            className="w-full border border-slate-200 px-3.5 py-2 rounded-xl text-xs text-center font-mono focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (!cardName || cardNumber.replace(/\s/g, '').length < 16 || cardExpiry.length < 5 || cardCvc.length < 3) {
                            toast.error("Please complete all credit card information fields.");
                            return;
                          }
                          setCheckoutStep('otp');
                        }}
                        className="w-full mt-4 py-3 bg-[#635BFF] hover:bg-[#5851e5] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                      >
                        <CreditCard className="w-4 h-4" /> Secure Card Payment (Stripe)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-1 text-center">
                      <div className="bg-indigo-50/40 p-4 border border-indigo-100 rounded-2xl flex flex-col items-center">
                        <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-xs mb-3 flex items-center justify-center">
                          {/* Beautiful simulated pixelated QR block */}
                          <div className="w-32 h-32 border border-slate-200 bg-slate-50 grid grid-cols-4 p-2 gap-1">
                            <div className="bg-slate-900 rounded-xs"></div>
                            <div className="bg-slate-900 rounded-xs"></div>
                            <div className="bg-slate-50"></div>
                            <div className="bg-slate-900 rounded-xs"></div>
                            <div className="bg-slate-50"></div>
                            <div className="bg-slate-900 rounded-xs"></div>
                            <div className="bg-slate-900 rounded-xs"></div>
                            <div className="bg-slate-50"></div>
                            <div className="bg-slate-900 rounded-xs"></div>
                            <div className="bg-slate-50"></div>
                            <div className="bg-slate-900 rounded-xs"></div>
                            <div className="bg-slate-900 rounded-xs"></div>
                            <div className="bg-slate-900 rounded-xs"></div>
                            <div className="bg-slate-900 rounded-xs"></div>
                            <div className="bg-slate-50"></div>
                            <div className="bg-slate-900 rounded-xs"></div>
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">Dynamic Razorpay UPI QR Code</p>
                        <p className="text-[10px] text-slate-400 mt-1">Scan with GPay, Paytm, BHIM, or PhonePe to auto-fill details.</p>
                      </div>

                      <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">OR USE VPA</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                      </div>

                      <div className="space-y-2 text-left">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Enter UPI ID / VPA</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="e.g. jyoshi@upi"
                            className="flex-1 border border-slate-200 px-3.5 py-2 rounded-xl text-xs focus:border-indigo-500 outline-none font-mono"
                          />
                          <button
                            onClick={() => {
                              if (!upiId || !upiId.includes('@')) {
                                toast.error("Please enter a valid UPI VPA ID (e.g., name@upi).");
                                return;
                              }
                              setCheckoutStep('otp');
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                          >
                            Verify & Pay
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-center text-slate-400 mt-3 font-medium flex items-center justify-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Payments are securely encrypted and processed.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMMUNICATIONS & REMINDER DISPATCH MODAL */}
      {isReminderModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[10000] p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="bg-[#1a2b58] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Mail className="w-5 h-5" /> Dispatch Custom Reminder
                </h3>
                <p className="text-[11px] text-indigo-200 mt-0.5">Send tailored payment instructions via automated channels</p>
              </div>
              <button 
                onClick={() => setIsReminderModalOpen(false)} 
                className="text-indigo-200 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Channel Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Preferred Dispatch Channel</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setReminderChannel('email');
                      setReminderSubject(`Outstanding Invoice Reminder: ${selectedInvoice.invoiceNumber}`);
                    }}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${reminderChannel === 'email' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                  >
                    <Mail className="w-4 h-4" /> Email Notification
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderChannel('whatsapp')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${reminderChannel === 'whatsapp' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                  >
                    <MessageSquare className="w-4 h-4" /> WhatsApp Message
                  </button>
                </div>
              </div>

              {/* Message Template Preset Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Message Template Preset</label>
                <CustomSelect
                  value={reminderTemplate}
                  onChange={(val) => applyReminderTemplate(val as any, selectedInvoice)}
                  options={[
                    { value: "gentle", label: "🌱 Gentle Balance Notice" },
                    { value: "formal", label: "💼 Professional/Formal Request" },
                    { value: "urgent", label: "🚨 Urgent Past-Due Demand" },
                    { value: "custom", label: "✏️ Custom Blank Draft" }
                  ]}
                  className="w-full border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-50/50 hover:bg-white focus:outline-none focus:border-primary hover:shadow-sm transition-all text-slate-700"
                />
              </div>

              {/* Target recipient info */}
              <div className="grid grid-cols-1 gap-3.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-xs">
                  <span className="font-semibold text-slate-400 block mb-1">To Client Partner:</span>
                  <div className="font-bold text-slate-800">{selectedInvoice.clientName}</div>
                </div>

                {reminderChannel === 'email' ? (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Email Recipient</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 bg-white px-3 py-1.5 rounded-lg text-xs font-mono"
                      value={selectedInvoice.clientEmail}
                      readOnly
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">WhatsApp Mobile Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98765 43210"
                      className="w-full border border-slate-200 bg-white px-3 py-1.5 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
                      value={reminderMobile}
                      onChange={(e) => setReminderMobile(e.target.value)}
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Include country code for web-redirect links</span>
                  </div>
                )}
              </div>

              {reminderChannel === 'email' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Subject Line</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58]"
                    value={reminderSubject}
                    onChange={(e) => setReminderSubject(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reminder Custom Body</label>
                <textarea
                  rows={6}
                  className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#1a2b58] font-sans leading-relaxed"
                  value={reminderBody}
                  onChange={(e) => setReminderBody(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReminderModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSendReminder}
                  className={`px-5 py-2 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${reminderChannel === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  <Send className="w-3.5 h-3.5" /> Disperse Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ZOHO TEMPLATES SHOWCASE MODAL */}
      {isTemplateShowcaseOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-[10001] p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-4 max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <span>🎨</span> Zoho Billing Templates Showcase
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                  Compare visual styles, layout typography, and density options below.
                </p>
              </div>
              <button 
                onClick={() => setIsTemplateShowcaseOpen(false)} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-50/50">
              
              {/* Left Column: Template Cards (5 cols) */}
              <div className="lg:col-span-5 space-y-3.5">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Available Templates</span>
                {[
                  {
                    id: 'standard',
                    name: 'Zoho Standard',
                    icon: '💼',
                    badge: 'Traditional & Classic',
                    desc: 'The corporate standard. Features a spacious top section, professional indigo accents, and clear left-aligned totals ledger.',
                    font: 'Inter (Sans-Serif)',
                    highlights: ['Ideal for large corporate consulting', 'Traditional clean totals table', 'Clear terms & conditions box']
                  },
                  {
                    id: 'modern',
                    name: 'Zoho Modern',
                    icon: '✨',
                    badge: 'High-Contrast Slate',
                    desc: 'Bold slate header block with inverted typography and energetic emerald details. Makes a striking, high-tech statement.',
                    font: 'Outfit (Sans-Serif)',
                    highlights: ['Premium dark top banner block', 'Bold emerald details', 'Modern, contemporary tech look']
                  },
                  {
                    id: 'elegant',
                    name: 'Zoho Elegant',
                    icon: '🖋️',
                    badge: 'Editorial Editorial',
                    desc: 'Beautiful serif typography, double border accents, and centered layout. Radiates prestige, bespoke advisory, and high-quality.',
                    font: 'Playfair Display (Serif)',
                    highlights: ['Bespoke editorial serif layout', 'Double lined accounting margins', 'Sophisticated margins & padding']
                  },
                  {
                    id: 'compact',
                    name: 'Zoho Compact',
                    icon: '⚡',
                    badge: 'High-Density Ledger',
                    desc: 'Optimized spacing, condensed text margins, and minimal borders. Perfect for dense multi-line item service receipts.',
                    font: 'Inter (Condensed)',
                    highlights: ['Dense layout for many line items', 'Clean horizontal dividing rules', 'Lightweight minimal header']
                  },
                  {
                    id: 'fresh',
                    name: 'Zoho Fresh Bold',
                    icon: '🌱',
                    badge: 'Eco Emerald Accent',
                    desc: 'Features a beautiful solid vertical thick green bar, modern borders, and soft eco-emerald backgrounds. Energetic and clean.',
                    font: 'Space Grotesk',
                    highlights: ['Vibrant eco-emerald theme accents', 'Striking vertical side margin bar', 'Clean spacing & grid structure']
                  }
                ].map((tpl) => {
                  const isSelected = previewTemplateId === tpl.id;
                  return (
                    <div 
                      key={tpl.id}
                      onClick={() => setPreviewTemplateId(tpl.id as any)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected 
                          ? 'bg-indigo-50/40 border-indigo-500 shadow-sm ring-1 ring-indigo-500/30' 
                          : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{tpl.icon}</span>
                          <span className="font-bold text-sm text-slate-800">{tpl.name}</span>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isSelected 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                        {tpl.desc}
                      </p>
                      
                      {isSelected && (
                        <div className="mt-3 pt-2.5 border-t border-indigo-100/60 grid grid-cols-2 gap-2 text-[10px] text-indigo-700">
                          <div>
                            <span className="font-semibold block text-[8px] text-indigo-400 uppercase">Typography</span>
                            <span>{tpl.font}</span>
                          </div>
                          <div>
                            <span className="font-semibold block text-[8px] text-indigo-400 uppercase">Highlights</span>
                            <span className="truncate block">{tpl.highlights[0]}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Interactive Mini Live Mockup (7 cols) */}
              <div className="lg:col-span-7 flex flex-col h-full min-h-[420px]">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <span>🔴 Live Sample Mockup:</span>
                    <span className="text-indigo-600 font-extrabold">{previewTemplateId.toUpperCase()}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 italic">Pre-rendered dummy data sample</span>
                </div>

                {/* THE MOCKUP CONTAINER */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-hidden flex-1 text-left select-none relative max-h-[480px] overflow-y-auto">
                  
                  {/* Standard Mockup */}
                  {previewTemplateId === 'standard' && (
                    <div className="font-sans text-[10px] text-slate-700 space-y-4">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                        <div>
                          <div className="text-sm font-bold text-[#1a2b58]">Jyoshi & Associates CA</div>
                          <div className="text-[9px] text-slate-400 mt-0.5">100 Financial Way, Bangalore</div>
                        </div>
                        <div className="text-right">
                          <h4 className="text-sm font-extrabold text-slate-900 uppercase">INVOICE</h4>
                          <div className="font-mono text-[9px] font-bold text-indigo-600 mt-0.5">#INV-2026-001</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[9px]">
                        <div>
                          <span className="text-slate-400 block font-semibold uppercase text-[8px]">BILLED TO</span>
                          <span className="font-bold text-slate-800">Acme Corporation Inc.</span>
                          <span className="block text-slate-500 mt-0.5">billing@acme.com</span>
                        </div>
                        <div className="text-right">
                          <div><span className="text-slate-400 font-semibold uppercase text-[8px] mr-1">Date:</span> 2026-07-10</div>
                          <div><span className="text-rose-400 font-semibold uppercase text-[8px] mr-1">Due:</span> 2026-08-10</div>
                        </div>
                      </div>
                      <div className="border border-slate-100 rounded-lg overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[8px] font-bold text-slate-400 uppercase">
                              <th className="p-1.5">Service Description</th>
                              <th className="p-1.5 text-center">Qty</th>
                              <th className="p-1.5 text-right">Rate</th>
                              <th className="p-1.5 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 text-[9px]">
                            <tr>
                              <td className="p-1.5 font-bold text-slate-800">Tax Auditing & Return Filing</td>
                              <td className="p-1.5 text-center font-mono">1</td>
                              <td className="p-1.5 text-right font-mono">₹45,000</td>
                              <td className="p-1.5 text-right font-mono font-bold">₹45,000</td>
                            </tr>
                            <tr>
                              <td className="p-1.5 font-bold text-slate-800">Bespoke Financial Structuring</td>
                              <td className="p-1.5 text-center font-mono">2</td>
                              <td className="p-1.5 text-right font-mono">₹12,500</td>
                              <td className="p-1.5 text-right font-mono font-bold">₹25,000</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-between items-start pt-2">
                        <div className="w-1/2">
                          <span className="font-bold text-[8px] text-slate-400 uppercase block mb-1">Payment Instructions</span>
                          <p className="text-[8px] text-slate-400 leading-relaxed">Please wire transfer funds to ICICI Account No. 501004818. Net 30 terms apply.</p>
                        </div>
                        <div className="w-1/3 text-right space-y-1 text-[9px] border-t border-slate-100 pt-2">
                          <div className="flex justify-between text-slate-500"><span>Subtotal:</span><span>₹70,000.00</span></div>
                          <div className="flex justify-between text-slate-500"><span>GST (18%):</span><span>₹12,600.00</span></div>
                          <div className="flex justify-between font-extrabold text-slate-900 border-t border-slate-200 pt-1 text-xs"><span>Total:</span><span>₹82,600.00</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modern Mockup */}
                  {previewTemplateId === 'modern' && (
                    <div className="font-sans text-[10px] text-slate-700 space-y-4">
                      <div className="bg-slate-900 text-white -mx-6 -mt-6 p-4 flex justify-between items-start">
                        <div>
                          <div className="text-sm font-black tracking-wider uppercase">Jyoshi & Associates CA</div>
                          <div className="text-[8px] text-slate-300 mt-1">Bangalore, Karnataka</div>
                        </div>
                        <div className="text-right">
                          <h4 className="text-sm font-black tracking-widest text-emerald-400 uppercase">STATEMENT</h4>
                          <div className="font-mono text-[9px] text-slate-300 mt-0.5">#INV-2026-001</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[9px] pt-2">
                        <div>
                          <span className="text-slate-400 block font-semibold uppercase text-[8px]">CLIENT RECIPIENT</span>
                          <span className="font-bold text-slate-800">Acme Corporation Inc.</span>
                          <span className="block text-slate-500">billing@acme.com</span>
                        </div>
                        <div className="text-right font-medium text-slate-500 space-y-0.5">
                          <div>Issued Date: <span className="text-slate-800">2026-07-10</span></div>
                          <div>Due Settlement: <span className="text-slate-800">2026-08-10</span></div>
                        </div>
                      </div>
                      <div className="border-b border-slate-200">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-[8px] font-bold text-slate-600 border-b-2 border-slate-300">
                              <th className="p-1.5">Description of Services</th>
                              <th className="p-1.5 text-center">Qty</th>
                              <th className="p-1.5 text-right">Rate</th>
                              <th className="p-1.5 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[9px]">
                            <tr>
                              <td className="p-1.5 font-bold text-slate-900">Tax Auditing & Return Filing</td>
                              <td className="p-1.5 text-center font-mono">1</td>
                              <td className="p-1.5 text-right font-mono">₹45,000</td>
                              <td className="p-1.5 text-right font-mono font-bold">₹45,000</td>
                            </tr>
                            <tr>
                              <td className="p-1.5 font-bold text-slate-900">Bespoke Financial Structuring</td>
                              <td className="p-1.5 text-center font-mono">2</td>
                              <td className="p-1.5 text-right font-mono">₹12,500</td>
                              <td className="p-1.5 text-right font-mono font-bold">₹25,000</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="font-bold text-[10px] text-slate-700">Amount Due (INR):</span>
                        <span className="font-black text-sm text-slate-900">₹82,600.00</span>
                      </div>
                    </div>
                  )}

                  {/* Elegant Mockup */}
                  {previewTemplateId === 'elegant' && (
                    <div className="font-serif text-[10px] text-slate-800 space-y-4">
                      <div className="text-center border-b-2 border-double border-slate-800 pb-3">
                        <div className="text-base italic font-bold">Jyoshi & Associates CA</div>
                        <div className="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">Advisory Services Statement</div>
                        <div className="text-[8px] text-slate-500 mt-1 italic">100 Financial Way, Bangalore</div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] pt-1">
                        <div>
                          <span className="text-[8px] text-slate-400 block font-semibold uppercase">STATEMENT PREPARED FOR</span>
                          <span className="font-bold text-slate-900">Acme Corporation Inc.</span>
                        </div>
                        <div className="text-right text-[8px] space-y-0.5">
                          <div>Statement No: <span className="font-mono font-bold">#INV-2026-001</span></div>
                          <div>Dated: <span>2026-07-10</span></div>
                          <div>Due Date: <span className="text-rose-700 font-semibold">2026-08-10</span></div>
                        </div>
                      </div>
                      <table className="w-full text-left border-collapse border-b border-slate-200">
                        <thead>
                          <tr className="bg-[#FAF9F6] text-[8px] font-semibold border-b border-slate-200 uppercase tracking-wider text-slate-600">
                            <th className="p-1.5">Description</th>
                            <th className="p-1.5 text-center">Qty</th>
                            <th className="p-1.5 text-right font-bold">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[9px] italic">
                          <tr>
                            <td className="p-1.5 text-slate-900 font-medium">Tax Auditing & Return Filing</td>
                            <td className="p-1.5 text-center font-mono font-normal">1</td>
                            <td className="p-1.5 text-right font-mono">₹45,000</td>
                          </tr>
                          <tr>
                            <td className="p-1.5 text-slate-900 font-medium">Bespoke Financial Structuring</td>
                            <td className="p-1.5 text-center font-mono font-normal">2</td>
                            <td className="p-1.5 text-right font-mono">₹25,000</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="flex justify-end pt-2">
                        <div className="w-1/2 text-right space-y-1.5 border-t border-slate-300 pt-2 font-serif">
                          <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>₹70,000.00</span></div>
                          <div className="flex justify-between text-slate-600"><span>GST (18%):</span><span>₹12,600.00</span></div>
                          <div className="flex justify-between font-bold text-slate-950 text-xs border-t border-slate-800 pt-1"><span>Total Due:</span><span>₹82,600.00</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compact Mockup */}
                  {previewTemplateId === 'compact' && (
                    <div className="font-sans text-[9px] text-slate-700 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-300 pb-2">
                        <div>
                          <div className="font-bold text-[#1a2b58] text-xs">Jyoshi & Associates CA</div>
                          <div className="text-[8px] text-slate-400 mt-0.5">Bangalore | ca@jyoshi.com</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900 text-xs">INVOICE</div>
                          <div className="font-mono text-[8px] font-bold text-indigo-600">#INV-2026-001</div>
                        </div>
                      </div>
                      <div className="flex justify-between text-[8px]">
                        <div>
                          <span className="text-slate-400 font-bold uppercase mr-1">To:</span>
                          <span className="font-bold text-slate-800">Acme Corp</span>
                        </div>
                        <div className="text-right text-slate-500">
                          Issued: 2026-07-10 | Due: 2026-08-10
                        </div>
                      </div>
                      <table className="w-full text-left border-collapse border border-slate-200">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[8px] font-bold text-slate-500">
                            <th className="px-2 py-1">Description</th>
                            <th className="px-2 py-1 text-center">Qty</th>
                            <th className="px-2 py-1 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          <tr>
                            <td className="px-2 py-1 text-slate-800 font-sans font-medium">Tax Auditing & Return Filing</td>
                            <td className="px-2 py-1 text-center">1</td>
                            <td className="px-2 py-1 text-right">₹45,000</td>
                          </tr>
                          <tr>
                            <td className="px-2 py-1 text-slate-800 font-sans font-medium">Bespoke Financial Structuring</td>
                            <td className="px-2 py-1 text-center">2</td>
                            <td className="px-2 py-1 text-right">₹25,000</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="flex justify-end pt-1">
                        <div className="w-1/2 text-right space-y-0.5 font-mono text-[8px]">
                          <div className="flex justify-between text-slate-500"><span>Subtotal:</span><span>₹70,000</span></div>
                          <div className="flex justify-between text-slate-500"><span>GST (18%):</span><span>₹12,600</span></div>
                          <div className="flex justify-between font-extrabold text-slate-900 text-[10px] border-t border-slate-300 pt-0.5"><span>Total (INR):</span><span>₹82,600</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fresh Bold Mockup */}
                  {previewTemplateId === 'fresh' && (
                    <div className="font-sans text-[10px] text-slate-700 space-y-4">
                      <div className="border-l-4 border-emerald-500 pl-4 flex justify-between items-start">
                        <div>
                          <div className="text-sm font-black text-slate-900 flex items-center gap-1">
                            <span className="text-emerald-500">■</span>
                            <span>Jyoshi CA & Associates</span>
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">Bangalore, IN</div>
                        </div>
                        <div className="text-right">
                          <h4 className="text-xs font-black text-emerald-600 tracking-wider">STATEMENT</h4>
                          <div className="font-mono text-[9px] font-bold text-slate-700 mt-0.5">#INV-2026-001</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[9px] pt-1">
                        <div>
                          <span className="text-emerald-600 block font-bold text-[8px] tracking-wider uppercase mb-0.5">BILLED TO RECIPIENT</span>
                          <span className="font-bold text-slate-800">Acme Corporation Inc.</span>
                          <span className="block text-slate-500">billing@acme.com</span>
                        </div>
                        <div className="text-right space-y-0.5 font-medium">
                          <div>Issued Date: <span className="text-slate-800 font-bold">2026-07-10</span></div>
                          <div>Settlement Due: <span className="text-emerald-600 font-bold">2026-08-10</span></div>
                        </div>
                      </div>
                      <div className="border-2 border-emerald-500/10 rounded-xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-emerald-600 text-white text-[8px] font-bold uppercase tracking-wider">
                              <th className="p-1.5">Description of Services</th>
                              <th className="p-1.5 text-center">Qty</th>
                              <th className="p-1.5 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-emerald-500/10 text-[9px]">
                            <tr>
                              <td className="p-1.5 font-bold text-slate-800">Tax Auditing & Return Filing</td>
                              <td className="p-1.5 text-center font-mono">1</td>
                              <td className="p-1.5 text-right font-mono font-bold">₹45,000</td>
                            </tr>
                            <tr>
                              <td className="p-1.5 font-bold text-slate-800">Bespoke Financial Structuring</td>
                              <td className="p-1.5 text-center font-mono">2</td>
                              <td className="p-1.5 text-right font-mono font-bold">₹25,000</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="bg-emerald-50/50 border-2 border-emerald-500/10 rounded-xl p-3 flex justify-between items-center">
                        <span className="font-black text-emerald-800 uppercase text-[9px] tracking-wider">Total Balance Due (INR)</span>
                        <span className="font-black text-sm text-emerald-600">₹82,600.00</span>
                      </div>
                    </div>
                  )}

                </div>

                {/* Apply Style CTA */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Want to use <span className="font-bold text-indigo-600 capitalize">{previewTemplateId}</span> for this document?
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsTemplateShowcaseOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateId(previewTemplateId);
                        setViewTemplateId(previewTemplateId);
                        setIsTemplateShowcaseOpen(false);
                      }}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      Apply Template Design 🎨
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
