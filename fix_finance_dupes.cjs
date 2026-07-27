const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');
content = content.replace('  FileSpreadsheet,\n', '');
content = content.replace('              { id: "coa", label: "Chart of Accounts", icon: BookOpen, desc: "Double-Entry Ledgers" },\n', '');
content = content.replace('              { id: "ap_ar", label: "AP/AR Dashboard", icon: Briefcase, desc: "Invoices & Bills" },\n', '');
content = content.replace('              { id: "gl", label: "General Ledger", icon: FileSpreadsheet, desc: "Debits & Credits" },\n', '');
fs.writeFileSync('src/components/FinanceTracker.tsx', content);
