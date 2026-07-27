const fs = require('fs');
const content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

let newContent = content.replace(
  `        } else if (rec.type === "transfer") {
          // Transfer acts as an outflow from source account
          balances[rec.paymentAccountId].expense += rec.amount;
          balances[rec.paymentAccountId].current -= rec.amount;
        }
      }
      if (rec.type === "transfer" && rec.transferToAccountId && balances[rec.transferToAccountId]) {
          balances[rec.transferToAccountId].income += rec.amount;
          balances[rec.transferToAccountId].current += rec.amount;
      }`,
  `        } else if (rec.type === "transfer") {
          // Transfer acts as an outflow from source account, but NOT an expense/outflow in reporting
          balances[rec.paymentAccountId].current -= rec.amount;
        }
      }
      if (rec.type === "transfer" && rec.transferToAccountId && balances[rec.transferToAccountId]) {
          // Transfer acts as an inflow to destination account, but NOT income in reporting
          balances[rec.transferToAccountId].current += rec.amount;
      }`
);

fs.writeFileSync('src/components/FinanceTracker.tsx', newContent);
