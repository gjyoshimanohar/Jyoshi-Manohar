const fs = require('fs');
const content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

let newContent = content.replace(
  `    filteredRecords.forEach(rec => {
      if (rec.type === "transfer") return;
      if (rec.type === "income") {
        if (rec.category !== "Reimbursement" && rec.category !== "Advance Received") {
          incomeTotals[rec.category] = (incomeTotals[rec.category] || 0) + rec.amount;
        }
      } else if (rec.type === "expense") {
        if (!rec.isReceivableFromClient && !rec.isReimbursed && rec.category !== "Payment from Advance") {
          expenseTotals[rec.category] = (expenseTotals[rec.category] || 0) + rec.amount;
        }
      }`,
  `    filteredRecords.forEach(rec => {
      if (rec.type === "transfer" || rec.category === "Internal Transfer") return;
      if (rec.type === "income") {
        if (rec.category !== "Reimbursement" && rec.category !== "Advance Received") {
          incomeTotals[rec.category] = (incomeTotals[rec.category] || 0) + rec.amount;
        }
      } else if (rec.type === "expense") {
        if (!rec.isReceivableFromClient && !rec.isReimbursed && rec.category !== "Payment from Advance") {
          expenseTotals[rec.category] = (expenseTotals[rec.category] || 0) + rec.amount;
        }
      }`
);

fs.writeFileSync('src/components/FinanceTracker.tsx', newContent);
