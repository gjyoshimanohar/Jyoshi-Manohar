import React, { useState, useMemo } from 'react';
import { X, Download, Calendar, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { Invoice, InvoicePayment } from '../types';
import CustomSelect from './CustomSelect';
import CustomDatePicker from './CustomDatePicker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ClientType {
  uid: string;
  email: string;
  displayName?: string;
  address?: string;
  mobile?: string;
}

interface StatementGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  clients?: ClientType[];
  isEmbedded?: boolean;
}

export default function StatementGeneratorModal({ isOpen, onClose, invoices, clients, isEmbedded }: StatementGeneratorModalProps) {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  // Extract unique clients from invoices if clients array is empty
  const availableClients = useMemo(() => {
    if (clients && clients.length > 0) {
      return clients.map(c => ({ value: c.email, label: c.displayName || c.email }));
    }
    const uniqueEmails = new Set<string>();
    const clientList: {value: string, label: string}[] = [];
    invoices.forEach(inv => {
      if (!uniqueEmails.has(inv.clientEmail)) {
        uniqueEmails.add(inv.clientEmail);
        clientList.push({ value: inv.clientEmail, label: inv.clientName || inv.clientEmail });
      }
    });
    return clientList;
  }, [invoices, clients]);

  const filteredData = useMemo(() => {
    if (!selectedClient) return { invoices: [], payments: [], openingBalance: 0, closingBalance: 0, totalInvoiced: 0, totalPaid: 0 };

    let openingBalance = 0;
    let totalInvoiced = 0;
    let totalPaid = 0;

    const clientInvoices = invoices.filter(inv => inv.clientEmail === selectedClient && inv.documentType !== 'estimate' && inv.status !== 'cancelled' && inv.status !== 'draft');

    const sDate = startDate ? new Date(startDate) : null;
    const eDate = endDate ? new Date(endDate) : null;
    
    if (eDate) eDate.setHours(23, 59, 59, 999);

    const statementInvoices: Invoice[] = [];
    const statementPayments: (InvoicePayment & { invoiceId: string, invoiceNumber: string })[] = [];

    clientInvoices.forEach(inv => {
      const invDate = new Date(inv.issueDate);
      
      // Calculate opening balance (invoices before start date)
      if (sDate && isBefore(invDate, sDate)) {
        openingBalance += inv.total;
        
        inv.payments?.forEach(p => {
          if (isBefore(new Date(p.date), sDate)) {
            openingBalance -= p.amount;
          } else if (!eDate || !isAfter(new Date(p.date), eDate)) {
             statementPayments.push({ ...p, invoiceId: inv.id, invoiceNumber: inv.invoiceNumber });
             totalPaid += p.amount;
          }
        });
      } else if ((!sDate || !isBefore(invDate, sDate)) && (!eDate || !isAfter(invDate, eDate))) {
        statementInvoices.push(inv);
        totalInvoiced += inv.total;
        
        inv.payments?.forEach(p => {
          if (!eDate || !isAfter(new Date(p.date), eDate)) {
            statementPayments.push({ ...p, invoiceId: inv.id, invoiceNumber: inv.invoiceNumber });
            totalPaid += p.amount;
          }
        });
      }
    });

    const closingBalance = openingBalance + totalInvoiced - totalPaid;

    return {
      invoices: statementInvoices.sort((a,b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()),
      payments: statementPayments.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      openingBalance,
      closingBalance,
      totalInvoiced,
      totalPaid
    };

  }, [invoices, selectedClient, startDate, endDate]);

  const handleGenerate = () => {
    if (!selectedClient) return;
    setGenerating(true);

    try {
      const doc = new jsPDF();
      const clientName = availableClients.find(c => c.value === selectedClient)?.label || selectedClient;
      
      doc.setFontSize(20);
      doc.text('Statement of Account', 14, 22);
      
      doc.setFontSize(10);
      doc.text(`Client: ${clientName}`, 14, 30);
      doc.text(`Email: ${selectedClient}`, 14, 35);
      
      let dateRangeStr = 'All Time';
      if (startDate && endDate) dateRangeStr = `${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`;
      else if (startDate) dateRangeStr = `From ${format(new Date(startDate), 'MMM dd, yyyy')}`;
      else if (endDate) dateRangeStr = `Until ${format(new Date(endDate), 'MMM dd, yyyy')}`;
      
      doc.text(`Period: ${dateRangeStr}`, 14, 40);
      doc.text(`Generated On: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 45);

      // Summary Box
      doc.setDrawColor(200);
      doc.setFillColor(248, 250, 252);
      doc.rect(120, 22, 75, 28, 'FD');
      
      doc.setFontSize(9);
      doc.text('Opening Balance:', 125, 28);
      doc.text(`Rs. ${filteredData.openingBalance.toLocaleString('en-IN')}`, 190, 28, { align: 'right' });
      
      doc.text('Total Invoiced:', 125, 34);
      doc.text(`Rs. ${filteredData.totalInvoiced.toLocaleString('en-IN')}`, 190, 34, { align: 'right' });
      
      doc.text('Total Paid:', 125, 40);
      doc.text(`-Rs. ${filteredData.totalPaid.toLocaleString('en-IN')}`, 190, 40, { align: 'right' });
      
      doc.setFont(undefined, 'bold');
      doc.text('Closing Balance:', 125, 46);
      doc.text(`Rs. ${filteredData.closingBalance.toLocaleString('en-IN')}`, 190, 46, { align: 'right' });
      doc.setFont(undefined, 'normal');

      // Transactions Table
      const tableData: any[] = [];
      
      // Combine and sort all transactions (invoices and payments)
      const allTrans: any[] = [
        ...filteredData.invoices.map(i => ({ date: new Date(i.issueDate), type: 'Invoice', ref: i.invoiceNumber, amount: i.total, balanceChange: i.total })),
        ...filteredData.payments.map(p => ({ date: new Date(p.date), type: 'Payment', ref: `Inv ${p.invoiceNumber}`, amount: p.amount, balanceChange: -p.amount }))
      ].sort((a, b) => a.date.getTime() - b.date.getTime());

      let currentBal = filteredData.openingBalance;
      
      tableData.push([
        startDate ? format(new Date(startDate), 'yyyy-MM-dd') : '-',
        'Opening Balance',
        '-',
        '-',
        '-',
        `Rs. ${currentBal.toLocaleString('en-IN')}`
      ]);

      allTrans.forEach(t => {
        currentBal += t.balanceChange;
        tableData.push([
          format(t.date, 'yyyy-MM-dd'),
          t.type,
          t.ref,
          t.type === 'Invoice' ? `Rs. ${t.amount.toLocaleString('en-IN')}` : '-',
          t.type === 'Payment' ? `Rs. ${t.amount.toLocaleString('en-IN')}` : '-',
          `Rs. ${currentBal.toLocaleString('en-IN')}`
        ]);
      });

      autoTable(doc, {
        startY: 60,
        head: [['Date', 'Description', 'Reference', 'Amount (Dr)', 'Amount (Cr)', 'Balance']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`Statement_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={isEmbedded ? "w-full h-full" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"}>
      <div className={`bg-white rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isEmbedded ? "border border-slate-200" : "shadow-xl"} max-h-[90vh] overflow-y-auto no-scrollbar`}>
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Generate Statement</h2>
              <p className="text-xs text-slate-500">Create client account statement PDF</p>
            </div>
          </div>
          {!isEmbedded && (<button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>)}
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Select Client *</label>
            <CustomSelect
              value={selectedClient}
              onChange={setSelectedClient}
              options={[{value: '', label: 'Select a client...'}, ...availableClients]}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:border-blue-500 transition-colors"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Start Date</label>
              <CustomDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Start Date"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">End Date</label>
              <CustomDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="End Date"
              />
            </div>
          </div>
          
          {selectedClient && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
               <div className="flex justify-between items-center mb-1">
                 <span className="text-slate-500">Opening Balance:</span>
                 <span className="font-semibold text-slate-700">₹{filteredData.openingBalance.toLocaleString('en-IN')}</span>
               </div>
               <div className="flex justify-between items-center mb-1">
                 <span className="text-slate-500">Invoiced in Period:</span>
                 <span className="font-semibold text-slate-700">₹{filteredData.totalInvoiced.toLocaleString('en-IN')}</span>
               </div>
               <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200">
                 <span className="text-slate-500">Paid in Period:</span>
                 <span className="font-semibold text-emerald-600">-₹{filteredData.totalPaid.toLocaleString('en-IN')}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="font-bold text-slate-700">Closing Balance:</span>
                 <span className={`font-bold ${filteredData.closingBalance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                   ₹{filteredData.closingBalance.toLocaleString('en-IN')}
                 </span>
               </div>
            </div>
          )}

        </div>
        
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleGenerate}
            disabled={!selectedClient || generating}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
          >
            {generating ? (
              <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</span>
            ) : (
              <><Download className="w-4 h-4" /> Download PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
