const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

// Add "Payment from Advance" to DEFAULT_CATEGORIES.businessExpense
code = code.replace(
  /"Miscellaneous"\n  \],/,
  '"Miscellaneous",\n    "Payment from Advance"\n  ],'
);

// Add to localStorage initialization
const oldInit = `if (parsed.businessIncome && !parsed.businessIncome.includes("Advance Received")) {
            parsed.businessIncome.push("Advance Received");
        }`;
const newInit = `if (parsed.businessIncome && !parsed.businessIncome.includes("Advance Received")) {
            parsed.businessIncome.push("Advance Received");
        }
        if (parsed.businessExpense && !parsed.businessExpense.includes("Payment from Advance")) {
            parsed.businessExpense.push("Payment from Advance");
        }`;
code = code.replace(oldInit, newInit);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
