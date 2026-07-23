const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

// We already hid Advance Received from incomes tab, wait no, let's allow it in incomes tab so they can see the record, but exclude it from revenue.
// Wait, my previous regex hid it from incomes tab! Let's revert the hiding from the incomes tab, but keep it excluded from total income.
// I'll rewrite the patch correctly.

code = code.replace(
  /if \(activeTab === "incomes" && \(rec\.type !== "income" \|\| rec\.category === "Reimbursement" \|\| rec\.category === "Advance Received"\)\) return false;/g,
  'if (activeTab === "incomes" && (rec.type !== "income" || rec.category === "Reimbursement")) return false;' // Actually, if we want them to see it in incomes tab, we shouldn't return false for Advance Received. But wait, earlier I replaced Reimbursement with Reimbursement || Advance Received. Let me change it back to just Reimbursement. Wait, if it's an income, it should be visible in incomes tab. Why was Reimbursement hidden from incomes tab? Because it's tracked in receivables. Advances are not tracked anywhere else yet!
);

code = code.replace(
  /if \(selectedType === "income" && \(rec\.category === "Reimbursement" \|\| rec\.category === "Advance Received"\)\) return false;/g,
  'if (selectedType === "income" && (rec.category === "Reimbursement" || rec.category === "Advance Received")) return false;' // keep it out of dashboard income metrics.
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
