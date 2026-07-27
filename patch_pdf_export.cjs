const fs = require('fs');
const content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

let newContent = content.replace(
  `    filteredRecords.forEach(rec => {
      if (rec.type === "income") totalIncome += Number(rec.amount);
      if (rec.type === "expense") totalExpense += Number(rec.amount);`,
  `    filteredRecords.forEach(rec => {
      if (rec.type === "income" && rec.category !== "Internal Transfer") totalIncome += Number(rec.amount);
      if (rec.type === "expense" && rec.category !== "Internal Transfer") totalExpense += Number(rec.amount);`
);

fs.writeFileSync('src/components/FinanceTracker.tsx', newContent);
