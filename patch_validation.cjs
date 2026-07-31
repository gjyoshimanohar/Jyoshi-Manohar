const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

const journalValidation = `    if (formType === "journal") {
      if (!formTransferToAccountId) {
        toast.error("Please select a Debit Account.");
        return;
      }
      if (!formPaymentAccountId) {
        toast.error("Please select a Credit Account.");
        return;
      }
      if (formPaymentAccountId === formTransferToAccountId) {
        toast.error("Debit and Credit accounts cannot be the same.");
        return;
      }
    }
`;

content = content.replace(
  '    if (formType === "transfer") {',
  journalValidation + '\n    if (formType === "transfer") {'
);

fs.writeFileSync('src/components/FinanceTracker.tsx', content);
