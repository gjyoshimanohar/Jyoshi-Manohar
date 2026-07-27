const fs = require('fs');
const content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

let newContent = content.replace(
  `        if (rec.type === "income") {
          if (rec.category !== "Reimbursement" && rec.category !== "Advance Received") {
            totalIncome += rec.amount;
            if (rec.status === "pending" || rec.status === "overdue") {
              pendingInvoicesVal += rec.amount;
            }
          }
        } else if (rec.type === "expense") {
          if (!rec.isReceivableFromClient && !rec.isReimbursed && rec.category !== "Payment from Advance") {
            totalExpense += rec.amount;
          }
        }`,
  `        if (rec.type === "income") {
          if (rec.category !== "Reimbursement" && rec.category !== "Advance Received" && rec.category !== "Internal Transfer") {
            totalIncome += rec.amount;
            if (rec.status === "pending" || rec.status === "overdue") {
              pendingInvoicesVal += rec.amount;
            }
          }
        } else if (rec.type === "expense") {
          if (!rec.isReceivableFromClient && !rec.isReimbursed && rec.category !== "Payment from Advance" && rec.category !== "Internal Transfer") {
            totalExpense += rec.amount;
          }
        }`
);

fs.writeFileSync('src/components/FinanceTracker.tsx', newContent);
