const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `          const hasEmiThisMonth = records.some(rec => 
            rec.paymentAccountId === acc.id && 
            rec.category === 'Loan EMI' && 
            new Date(rec.date).getMonth() === currentMonth &&
            new Date(rec.date).getFullYear() === currentYear
          );

          if (!hasEmiThisMonth) {
            const dueDay = acc.emiDueDate ? parseInt(acc.emiDueDate, 10) : 1;`;

const replacement = `          const hasEmiThisMonth = records.some(rec => 
            rec.paymentAccountId === acc.id && 
            rec.category === 'Loan EMI' && 
            new Date(rec.date).getMonth() === currentMonth &&
            new Date(rec.date).getFullYear() === currentYear
          );

          if (!hasEmiThisMonth) {
            const dueDay = acc.emiDueDate ? parseInt(acc.emiDueDate, 10) : 1;
            
            // Start EMI from next month if due date is before the creation date in the current month
            const createdDate = new Date(acc.createdAt);
            const isCreatedThisMonth = createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
            
            if (isCreatedThisMonth && dueDay < createdDate.getDate()) {
              continue;
            }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Patched EMI generation rule');
} else {
  console.log('Target not found');
}
