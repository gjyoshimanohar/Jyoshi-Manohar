const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

// Patch metrics
code = code.replace(
  /if \(rec.type === "income"\) \{\n\s*totalIncome \+= rec.amount;\n\s*if \(rec.status === "pending" \|\| rec.status === "overdue"\) \{\n\s*pendingInvoicesVal \+= rec.amount;\n\s*\}\n\s*\}/g,
  `if (rec.type === "income") {
          if (rec.category !== "Reimbursement") {
            totalIncome += rec.amount;
            if (rec.status === "pending" || rec.status === "overdue") {
              pendingInvoicesVal += rec.amount;
            }
          }
        }`
);

// Patch chartData
code = code.replace(
  /if \(rec.type === "income"\) \{\n\s*income \+= rec.amount;\n\s*if \(rec.status === "pending" \|\| rec.status === "overdue"\) \{\n\s*pendingInvoices \+= rec.amount;\n\s*\}\n\s*\}/g,
  `if (rec.type === "income") {
            if (rec.category !== "Reimbursement") {
              income += rec.amount;
              if (rec.status === "pending" || rec.status === "overdue") {
                pendingInvoices += rec.amount;
              }
            }
          }`
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
