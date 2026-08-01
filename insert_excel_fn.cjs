const fs = require('fs');
const file = 'src/components/GeneralLedger.tsx';
let code = fs.readFileSync(file, 'utf8');

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

code = code.replace("  return (", excelFn + "\n  return (");
fs.writeFileSync(file, code);
