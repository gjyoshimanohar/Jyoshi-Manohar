const fs = require('fs');
let content = fs.readFileSync('src/components/GeneralLedger.tsx', 'utf8');

const search = `        if (toAcc) {
          const glType: GLAccountType = ['bank_account', 'investment', 'other_asset'].includes(toAcc.type) ? 'Asset' : 'Liability';
          const glAcc = getAccount(toAcc.id, toAcc.name, glType);
          glAcc.entries.push({
            id: \`\${rec.id}-dr\`, date: rec.date, description: \`Transfer from \${fromAcc?.name || 'Unknown'}\`, reference: rec.id.slice(-6), debit: rec.amount, credit: 0, balance: 0
          });
          glAcc.totalDebit += rec.amount;
        }
      }
      }
        const resolveGLAccount = (id) => {`;

const replace = `        if (toAcc) {
          const glType: GLAccountType = ['bank_account', 'investment', 'other_asset'].includes(toAcc.type) ? 'Asset' : 'Liability';
          const glAcc = getAccount(toAcc.id, toAcc.name, glType);
          glAcc.entries.push({
            id: \`\${rec.id}-dr\`, date: rec.date, description: \`Transfer from \${fromAcc?.name || 'Unknown'}\`, reference: rec.id.slice(-6), debit: rec.amount, credit: 0, balance: 0
          });
          glAcc.totalDebit += rec.amount;
        }
      }
      else if (rec.type === 'journal' && rec.transferToAccountId && rec.paymentAccountId) {
        const resolveGLAccount = (id) => {`;

content = content.replace(search, replace);
fs.writeFileSync('src/components/GeneralLedger.tsx', content);
