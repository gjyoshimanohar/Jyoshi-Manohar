const fs = require('fs');
let content = fs.readFileSync('src/components/GeneralLedger.tsx', 'utf8');

// Insert journal processing logic
const journalLogic = `
      else if (rec.type === 'journal' && rec.transferToAccountId && rec.paymentAccountId) {
        const resolveGLAccount = (id) => {
            if (id.startsWith('rev-')) {
               const name = id.replace('rev-', '');
               return getAccount(id, name, 'Revenue');
            } else if (id.startsWith('exp-')) {
               const name = id.replace('exp-', '');
               return getAccount(id, name, 'Expense');
            } else {
               const acc = accounts.find(a => a.id === id);
               if (acc) {
                 const glType = ['bank_account', 'investment', 'other_asset'].includes(acc.type) ? 'Asset' : 'Liability';
                 return getAccount(acc.id, acc.name, glType);
               }
            }
            return null;
        };

        const fromAcc = resolveGLAccount(rec.paymentAccountId); // Credit
        const toAcc = resolveGLAccount(rec.transferToAccountId); // Debit
        
        if (fromAcc) {
          fromAcc.entries.push({
            id: \`\${rec.id}-cr\`, date: rec.date, description: \`\${rec.description} (Journal Cr)\`, reference: rec.id.slice(-6), debit: 0, credit: rec.amount, balance: 0
          });
          fromAcc.totalCredit += rec.amount;
        }
        if (toAcc) {
          toAcc.entries.push({
            id: \`\${rec.id}-dr\`, date: rec.date, description: \`\${rec.description} (Journal Dr)\`, reference: rec.id.slice(-6), debit: rec.amount, credit: 0, balance: 0
          });
          toAcc.totalDebit += rec.amount;
        }
      }
`;

content = content.replace(
  "// Calculate balances and sort",
  journalLogic + "\n    // Calculate balances and sort"
);

fs.writeFileSync('src/components/GeneralLedger.tsx', content);
