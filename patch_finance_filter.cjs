const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

// Patch filteredRecords incomes tab exclusion
code = code.replace(
  /if \(activeTab === "incomes" && rec.type !== "income"\) return false;/g,
  `if (activeTab === "incomes" && (rec.type !== "income" || rec.category === "Reimbursement")) return false;`
);

// We should also patch the pending invoices logic in receivables just in case they aren't meant to be income:
code = code.replace(
  /const isPendingInvoice = rec.type === "income" && \(rec.status === "pending" \|\| rec.status === "overdue"\);/g,
  `const isPendingInvoice = rec.type === "income" && rec.category !== "Reimbursement" && (rec.status === "pending" || rec.status === "overdue");`
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
