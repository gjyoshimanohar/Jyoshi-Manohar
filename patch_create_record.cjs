const fs = require('fs');
const file = 'src/services/financeService.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `      await setDoc(newDocRef, newRecord);`;
const replacement = `      await setDoc(newDocRef, newRecord);

      // Create a task if it's a CC bill or EMI
      try {
        if (newRecord.category === 'Credit Card Bill' || newRecord.category === 'Loan EMI' || newRecord.category === 'EMI') {
          let dueDateMillis = null;
          if (newRecord.ccBillDetails && newRecord.ccBillDetails.dueDate) {
            dueDateMillis = new Date(newRecord.ccBillDetails.dueDate).getTime();
          } else if (newRecord.date) {
            dueDateMillis = new Date(newRecord.date).getTime();
          }

          if (dueDateMillis && auth.currentUser) {
            await todoService.createTodo({
              userId: auth.currentUser.uid,
              title: \`Pay \${newRecord.category}: \${newRecord.description || newRecord.amount}\`,
              description: \`Amount: ₹\${newRecord.amount.toLocaleString("en-IN")}\\nCategory: \${newRecord.category}\`,
              completed: false,
              dueDate: dueDateMillis,
              projectId: 'inbox',
              priority: 1
            });
          }
        }
      } catch (taskErr) {
        console.error("Failed to sync finance record to Tasks", taskErr);
      }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Patched createRecord');
} else {
  console.log('Target not found');
}
