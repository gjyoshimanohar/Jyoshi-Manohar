const fs = require('fs');
const file = 'src/components/GeneralLedger.tsx';
let code = fs.readFileSync(file, 'utf8');

// We need to add state for the modal
const stateRegex = /const \[endDate, setEndDate\] = useState\(''\);/;
const modalStates = `const [endDate, setEndDate] = useState('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportTargetAccount, setExportTargetAccount] = useState<GLAccount | null>(null);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');`;
code = code.replace(stateRegex, modalStates);

// Add the modal UI at the end of the return statement
const modalUI = `
      {exportModalOpen && exportTargetAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center">
                <Download className="w-4 h-4 mr-2 text-primary" />
                Export Ledger Statement
              </h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"
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
                    <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Leave blank to export all available records.</p>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (exportFormat === 'excel') handleDownloadExcel(exportTargetAccount, exportStartDate, exportEndDate);
                  else handleDownloadPDF(exportTargetAccount, exportStartDate, exportEndDate);
                  setExportModalOpen(false);
                }}
                className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition shadow-sm flex items-center"
              >
                <Download className="w-4 h-4 mr-1.5" /> Generate Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
`;

code = code.replace(/    <\/div>\n  \);\n\}/, modalUI + "\n}");

// Replace the two buttons with a single export button
const oldButtonsRegex = /<div className="flex items-center gap-2">[\s\S]*?<\/div>/;
const newExportButton = `<button
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
                  </button>`;

code = code.replace(oldButtonsRegex, newExportButton);

// We need to modify handleDownloadExcel and handleDownloadPDF to accept date filters
// Let's just rewrite them to use the passed dates to filter entries.
// To keep things simple, we'll replace the existing function definitions with ones that take dates.

const excelFnRegex = /const handleDownloadExcel = \(account: GLAccount\) => \{[\s\S]*?catch \(err\) \{\s*console\.error\("Error generating Excel:", err\);\s*\}\s*\};/;
const newExcelFn = `const handleDownloadExcel = (account: GLAccount, sDateStr: string, eDateStr: string) => {
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
        ["Period", sDateStr || eDateStr ? \`\${sDateStr ? format(new Date(sDateStr), 'MMM dd, yyyy') : 'All Time'} - \${eDateStr ? format(new Date(eDateStr), 'MMM dd, yyyy') : 'Current'}\` : "All Time"],
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

      XLSX.writeFile(wb, \`Statement_\${account.name.replace(/\\s+/g, '_')}_\${format(new Date(), 'yyyyMMdd')}.xlsx\`);
    } catch (err) {
      console.error("Error generating Excel:", err);
    }
  };`;
code = code.replace(excelFnRegex, newExcelFn);

const pdfFnRegex = /const handleDownloadPDF = \(account: GLAccount\) => \{[\s\S]*?catch \(err\) \{\s*console\.error\("Error generating PDF:", err\);\s*\}\s*\};/;
const newPdfFn = `const handleDownloadPDF = (account: GLAccount, sDateStr: string, eDateStr: string) => {
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
      doc.text(\`Account Type: \${account.type}\`, 14, 30);
      doc.text(\`Generated on: \${format(new Date(), 'MMM dd, yyyy')}\`, 14, 36);

      if (sDateStr || eDateStr) {
         doc.text(\`Period: \${sDateStr ? format(new Date(sDateStr), 'MMM dd, yyyy') : 'All Time'} - \${eDateStr ? format(new Date(eDateStr), 'MMM dd, yyyy') : 'Current'}\`, 14, 42);
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

      const tableData = filteredEntries.map(t => [
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
code = code.replace(pdfFnRegex, newPdfFn);

fs.writeFileSync(file, code);
console.log("Patched general ledger to use an export modal");
