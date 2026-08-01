const fs = require('fs');
const content = fs.readFileSync('src/components/GeneralLedger.tsx', 'utf-8');

const target = `import React, { useMemo, useState } from 'react';
import { FinanceRecord, PaymentAccount } from '../types';
import { FileSpreadsheet, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  allRecords: FinanceRecord[];
  accounts: PaymentAccount[];
  defaultSearchTerm?: string;
}`;

const replacement = `import React, { useMemo, useState } from 'react';
import { FinanceRecord, PaymentAccount } from '../types';
import { FileSpreadsheet, Search, Filter, Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  allRecords: FinanceRecord[];
  accounts: PaymentAccount[];
  defaultSearchTerm?: string;
}`;

const target2 = `export default function GeneralLedger({ allRecords, accounts, defaultSearchTerm = '' }: Props) {
  const [searchTerm, setSearchTerm] = useState(defaultSearchTerm);
  const [selectedType, setSelectedType] = useState<GLAccountType | 'All'>('All');

  React.useEffect(() => {
    setSearchTerm(defaultSearchTerm);
  }, [defaultSearchTerm]);`;

const replacement2 = `export default function GeneralLedger({ allRecords, accounts, defaultSearchTerm = '' }: Props) {
  const [searchTerm, setSearchTerm] = useState(defaultSearchTerm);
  const [selectedType, setSelectedType] = useState<GLAccountType | 'All'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  React.useEffect(() => {
    setSearchTerm(defaultSearchTerm);
  }, [defaultSearchTerm]);`;

const target3 = `    });
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
  }, [glData, selectedType, searchTerm]);`;

const replacement3 = `    });
    // Calculate balances and sort
    const result = Array.from(glAccounts.values());
    result.forEach(acc => {
      acc.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
    const sDate = startDate ? new Date(startDate).getTime() : 0;
    const eDate = endDate ? new Date(endDate).getTime() : Infinity;

    return glData
      .filter(acc => {
        if (selectedType !== 'All' && acc.type !== selectedType) return false;
        if (searchTerm && !acc.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .map(acc => {
        let periodOpeningBalance = 0;
        let periodDebit = 0;
        let periodCredit = 0;
        const filteredEntries = [];

        acc.entries.forEach(entry => {
          const t = new Date(entry.date).getTime();
          if (t < sDate) {
            if (acc.type === 'Asset' || acc.type === 'Expense') {
              periodOpeningBalance += (entry.debit - entry.credit);
            } else {
              periodOpeningBalance += (entry.credit - entry.debit);
            }
          } else if (t >= sDate && t <= eDate) {
            filteredEntries.push({ ...entry });
            periodDebit += entry.debit;
            periodCredit += entry.credit;
          }
        });

        if (startDate) {
          filteredEntries.unshift({
            id: \`period-open-\${acc.id}\`,
            date: startDate,
            description: 'Opening Balance',
            reference: '-',
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
      })
      .filter(acc => acc.entries.length > 0);
  }, [glData, selectedType, searchTerm, startDate, endDate]);

  const handleDownloadPDF = (account: GLAccount) => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text(account.name, 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(\`Account Type: \${account.type}\`, 14, 30);
      doc.text(\`Generated on: \${format(new Date(), 'MMM dd, yyyy')}\`, 14, 36);

      if (startDate || endDate) {
         doc.text(\`Period: \${startDate ? format(new Date(startDate), 'MMM dd, yyyy') : 'All Time'} - \${endDate ? format(new Date(endDate), 'MMM dd, yyyy') : 'Current'}\`, 14, 42);
      }
      
      doc.setDrawColor(200);
      doc.setFillColor(248, 250, 252);
      doc.rect(120, 16, 75, 28, 'FD');
      
      doc.setFontSize(9);
      doc.text('Total Debit:', 125, 22);
      doc.text(\`Rs. \${account.totalDebit.toLocaleString('en-IN')}\`, 190, 22, { align: 'right' });
      
      doc.text('Total Credit:', 125, 28);
      doc.text(\`Rs. \${account.totalCredit.toLocaleString('en-IN')}\`, 190, 28, { align: 'right' });
      
      doc.setFont(undefined, 'bold');
      doc.text('Closing Balance:', 125, 36);
      doc.text(\`Rs. \${account.closingBalance.toLocaleString('en-IN')}\`, 190, 36, { align: 'right' });
      doc.setFont(undefined, 'normal');

      const tableData = account.entries.map(t => [
        t.date ? format(new Date(t.date), 'yyyy-MM-dd') : '-',
        t.description,
        t.reference,
        t.debit > 0 ? \`Rs. \${t.debit.toLocaleString('en-IN')}\` : '-',
        t.credit > 0 ? \`Rs. \${t.credit.toLocaleString('en-IN')}\` : '-',
        \`Rs. \${t.balance.toLocaleString('en-IN')}\`
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

      doc.save(\`Statement_\${account.name.replace(/\\s+/g, '_')}_\${format(new Date(), 'yyyyMMdd')}.pdf\`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    }
  };`;

const target4 = `      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
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
      </div>`;

const replacement4 = `      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col xl:flex-row gap-4 items-center">
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
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 flex-1 sm:flex-none">
             <Calendar className="w-4 h-4 text-slate-400" />
             <input
               type="date"
               value={startDate}
               onChange={(e) => setStartDate(e.target.value)}
               className="bg-transparent text-sm outline-none text-slate-600 w-full sm:w-auto"
               title="Start Date"
             />
             <span className="text-slate-400 text-xs">to</span>
             <input
               type="date"
               value={endDate}
               onChange={(e) => setEndDate(e.target.value)}
               className="bg-transparent text-sm outline-none text-slate-600 w-full sm:w-auto"
               title="End Date"
             />
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none w-full"
            >
              <option value="All">All Types</option>
              <option value="Asset">Assets</option>
              <option value="Liability">Liabilities</option>
              <option value="Revenue">Revenue</option>
              <option value="Expense">Expenses</option>
            </select>
          </div>
        </div>
      </div>`;

const target5 = `              <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{account.name}</h4>
                  <span className={\`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block
                    \${account.type === 'Asset' ? 'bg-emerald-100 text-emerald-700' : 
                      account.type === 'Liability' ? 'bg-rose-100 text-rose-700' : 
                      account.type === 'Revenue' ? 'bg-blue-100 text-blue-700' : 
                      'bg-amber-100 text-amber-700'}\`}>
                    {account.type}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Closing Balance</span>
                  <span className={\`font-extrabold text-lg \${account.closingBalance < 0 ? 'text-rose-600' : 'text-slate-800'}\`}>
                    ₹{account.closingBalance.toLocaleString('en-IN')}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      {account.type === 'Asset' || account.type === 'Expense' ? 'Dr' : 'Cr'}
                    </span>
                  </span>
                </div>
              </div>`;

const replacement5 = `              <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-base">{account.name}</h4>
                  <span className={\`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block
                    \${account.type === 'Asset' ? 'bg-emerald-100 text-emerald-700' : 
                      account.type === 'Liability' ? 'bg-rose-100 text-rose-700' : 
                      account.type === 'Revenue' ? 'bg-blue-100 text-blue-700' : 
                      'bg-amber-100 text-amber-700'}\`}>
                    {account.type}
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Closing Balance</span>
                    <span className={\`font-extrabold text-lg \${account.closingBalance < 0 ? 'text-rose-600' : 'text-slate-800'}\`}>
                      ₹{account.closingBalance.toLocaleString('en-IN')}
                      <span className="text-xs font-normal text-slate-500 ml-1">
                        {account.type === 'Asset' || account.type === 'Expense' ? 'Dr' : 'Cr'}
                      </span>
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadPDF(account as GLAccount)}
                    className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                    title="Download Statement (PDF)"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>`;

const target6 = `<tr key={idx} className="hover:bg-slate-50/50 transition-colors">`;
const replacement6 = `<tr key={idx} className={\`hover:bg-slate-50/50 transition-colors \${entry.id.startsWith('period-open-') ? 'bg-slate-50/50 font-medium' : ''}\`}>`;

let newContent = content.replace(target, replacement);
newContent = newContent.replace(target2, replacement2);
newContent = newContent.replace(target3, replacement3);
newContent = newContent.replace(target4, replacement4);
newContent = newContent.replace(target5, replacement5);
newContent = newContent.replace(target6, replacement6);

if (newContent === content) {
    console.error("Replacement failed.");
    process.exit(1);
}

fs.writeFileSync('src/components/GeneralLedger.tsx', newContent);
console.log("Successfully patched GeneralLedger.tsx");
