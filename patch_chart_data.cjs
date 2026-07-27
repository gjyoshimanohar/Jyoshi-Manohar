const fs = require('fs');
const content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

let newContent = content.replace(
  `        if (recYear === selectedYear && recMonth === monthStr) {
          if (rec.type === "income") {
            if (rec.category !== "Reimbursement" && rec.category !== "Advance Received") {
              income += rec.amount;
              if (rec.status === "pending" || rec.status === "overdue") {
                pendingInvoices += rec.amount;
              }
            }
          }
          else if (rec.type === "expense") {
            if (!rec.isReceivableFromClient && !rec.isReimbursed && rec.category !== "Payment from Advance") {
              expense += rec.amount;
            }
            if (rec.isReceivableFromClient) {
              pendingReimbursements += rec.amount;
            }
          }`,
  `        if (recYear === selectedYear && recMonth === monthStr) {
          if (rec.type === "income") {
            if (rec.category !== "Reimbursement" && rec.category !== "Advance Received" && rec.category !== "Internal Transfer") {
              income += rec.amount;
              if (rec.status === "pending" || rec.status === "overdue") {
                pendingInvoices += rec.amount;
              }
            }
          }
          else if (rec.type === "expense") {
            if (!rec.isReceivableFromClient && !rec.isReimbursed && rec.category !== "Payment from Advance" && rec.category !== "Internal Transfer") {
              expense += rec.amount;
            }
            if (rec.isReceivableFromClient) {
              pendingReimbursements += rec.amount;
            }
          }`
);

fs.writeFileSync('src/components/FinanceTracker.tsx', newContent);
