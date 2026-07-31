const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const [exportReportType, setExportReportType] = useState<"expenses" | "income" | "payable" | "receivables">("expenses");',
  'const [exportReportType, setExportReportType] = useState<"expenses" | "income" | "payable" | "receivables" | "bankwise">("expenses");'
);

content = content.replace(
  '{ value: "receivables", label: "Receivables" },',
  '{ value: "receivables", label: "Receivables" },\n                      { value: "bankwise", label: "Bankwise Transactions" },'
);

content = content.replace(
  '} else if (exportReportType === "receivables") {\n      recordsToExport = recordsToExport.filter(r => r.type === "income" && r.status !== "paid");\n    }',
  `} else if (exportReportType === "receivables") {
      recordsToExport = recordsToExport.filter(r => r.type === "income" && r.status !== "paid");
    } else if (exportReportType === "bankwise") {
      recordsToExport = recordsToExport.filter(r => r.status === "paid" || r.type === "transfer");
      recordsToExport.sort((a, b) => {
        const accAName = paymentAccounts.find(acc => acc.id === a.paymentAccountId)?.name || "";
        const accBName = paymentAccounts.find(acc => acc.id === b.paymentAccountId)?.name || "";
        if (accAName !== accBName) return accAName.localeCompare(accBName);
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    }`
);

// Fix handleExportExcel
content = content.replace(
  /html \+= `<div class="header-meta">Generated on \$\{new Date\(\)\.toLocaleDateString\(\)\} \| Filter: \$\{selectedMonth\}\/\$\{selectedYear\} \| Total Records: \$\{filteredRecords\.length\}<\/div>`;/g,
  '`html += \`<div class="header-meta">Generated on ${new Date().toLocaleDateString()} | Filter: ${selectedMonth}/${selectedYear} | Total Records: ${recordsToExport.length}</div>\`;`'
);

content = content.replace(
  /filteredRecords\.forEach\(rec => {/g,
  'recordsToExport.forEach(rec => {'
);

// handleExportPDF has:
// let totalIncome = 0;
// let totalExpense = 0;
// filteredRecords.forEach(rec => {

// Actually I just did filteredRecords.forEach to recordsToExport.forEach, that replaces in both functions.

fs.writeFileSync(file, content);
console.log("Patched FinanceTracker");
