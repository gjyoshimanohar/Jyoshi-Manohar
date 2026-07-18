const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetRegex = /const generateEmis = async \(\) => \{[\s\S]*?generateEmis\(\);/m;

const newGenerateEmis = `const generateEmis = async () => {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const currentDay = today.getDate();

      for (const acc of paymentAccounts) {
        if (acc.type === 'loan' && acc.isEmiPayable && acc.emiAmount) {
          const dueDay = acc.emiDueDate ? parseInt(acc.emiDueDate, 10) : 1;
          
          let targetMonth = currentMonth;
          let targetYear = currentYear;
          
          if (acc.createdAt) {
            const createdDate = new Date(acc.createdAt);
            const isCreatedThisMonth = createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
            
            // Start EMI from next month if due date is before the creation date in the current month
            if (isCreatedThisMonth && dueDay < createdDate.getDate()) {
              targetMonth = currentMonth + 1;
              if (targetMonth > 11) {
                targetMonth = 0;
                targetYear++;
              }
            }
          }

          const hasEmiTargetMonth = records.some(rec => 
            rec.paymentAccountId === acc.id && 
            rec.category === 'Loan EMI' && 
            new Date(rec.date).getMonth() === targetMonth &&
            new Date(rec.date).getFullYear() === targetYear
          );

          if (!hasEmiTargetMonth) {
            const dueDateStr = \`\${targetYear}-\${String(targetMonth + 1).padStart(2, '0')}-\${String(dueDay).padStart(2, '0')}\`;

            try {
              await financeService.createRecord({
                type: 'expense',
                amount: acc.emiAmount,
                category: 'Loan EMI',
                description: \`EMI for \${acc.name}\`,
                date: dueDateStr,
                status: 'pending',
                scope: 'business',
                paymentAccountId: acc.id
              });
            } catch (err) {
              console.error("Failed to auto-generate EMI", err);
            }
          }
        }
      }
    };

    generateEmis();`;

code = code.replace(targetRegex, newGenerateEmis);
fs.writeFileSync(file, code);
console.log('Patched EMI generation rule v2');
