const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

code = code.replace(
  /if \(!rec\.isReceivableFromClient && !rec\.isReimbursed\) {/g,
  'if (!rec.isReceivableFromClient && !rec.isReimbursed && rec.category !== "Payment from Advance") {'
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
