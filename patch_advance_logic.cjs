const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

// Exclude Advance Received from Dashboard's Income Chart / Totals
// In PnL calculations, we exclude Reimbursement. We should also exclude Advance Received.
code = code.replace(
  /rec\.category !== "Reimbursement"/g,
  'rec.category !== "Reimbursement" && rec.category !== "Advance Received"'
);

// We should also add pending advances to liabilities?
// Actually, tracking advance received as a liability might be complex if we don't have a clear "pending vs paid" status for advance.
// For an advance, they pay us first. So it's "paid".
// It's a liability until we spend it. This app doesn't have double-entry tracking for it, so we'll just exclude it from income PnL.

// Wait, let's look at `if (activeTab === "incomes" && (rec.type !== "income" || rec.category === "Reimbursement")) return false;`
// Should we hide Advance Received from incomes tab?
// Let's modify it to hide both, or maybe leave it visible?
code = code.replace(
  /if \(activeTab === "incomes" && \(rec\.type !== "income" \|\| rec\.category === "Reimbursement"\)\) return false;/g,
  'if (activeTab === "incomes" && (rec.type !== "income" || rec.category === "Reimbursement" || rec.category === "Advance Received")) return false;'
);

code = code.replace(
  /if \(selectedType === "income" && rec\.category === "Reimbursement"\) return false;/g,
  'if (selectedType === "income" && (rec.category === "Reimbursement" || rec.category === "Advance Received")) return false;'
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
