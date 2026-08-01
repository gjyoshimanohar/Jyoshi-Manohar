const fs = require('fs');
const file = 'src/components/GeneralLedger.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Import XLSX
if (!code.includes("import * as XLSX")) {
    code = code.replace("import jsPDF from 'jspdf';", "import jsPDF from 'jspdf';\nimport * as XLSX from 'xlsx';");
}

// 2. Add handleDownloadExcel function
const excelFn = `
  const handleDownloadExcel = (account: GLAccount) => {
    try {
      const headerRow = [
        ["Account Name", account.name],
        ["Account Type", account.type],
        ["Generated on", format(new Date(), 'MMM dd, yyyy')],
        ["Period", startDate || endDate ? \`\${startDate ? format(new Date(startDate), 'MMM dd, yyyy') : 'All Time'} - \${endDate ? format(new Date(endDate), 'MMM dd, yyyy') : 'Current'}\` : "All Time"],
        [],
        ["Total Debit", account.totalDebit],
        ["Total Credit", account.totalCredit],
        ["Closing Balance", account.closingBalance],
        [],
        ["Date", "Description", "Reference", "Debit (Dr)", "Credit (Cr)", "Balance"]
      ];

      const dataRows = account.entries.map(t => [
        t.date ? format(new Date(t.date), 'yyyy-MM-dd') : '-',
        t.description,
        t.reference,
        t.debit > 0 ? t.debit : '',
        t.credit > 0 ? t.credit : '',
        t.balance
      ]);

      const ws = XLSX.utils.aoa_to_sheet([...headerRow, ...dataRows]);
      
      // Auto-size columns slightly
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
  };
`;

if (!code.includes("const handleDownloadExcel")) {
    code = code.replace("return (", excelFn + "\n  return (");
}

// 3. Update the button to have both PDF and Excel
const oldButton = `                  <button
                    onClick={() => handleDownloadPDF(account as GLAccount)}
                    className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                    title="Download Statement (PDF)"
                  >
                    <Download className="w-5 h-5" />
                  </button>`;

const newButtons = `                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadExcel(account as GLAccount)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all shadow-sm text-xs font-semibold"
                      title="Download Statement (Excel)"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(account as GLAccount)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-all shadow-sm text-xs font-semibold"
                      title="Download Statement (PDF)"
                    >
                      <Download className="w-4 h-4" /> PDF
                    </button>
                  </div>`;

if (code.includes(oldButton)) {
    code = code.replace(oldButton, newButtons);
} else {
    console.log("Could not find the old button to replace.");
}

fs.writeFileSync(file, code);
console.log("Patched GeneralLedger.tsx");
