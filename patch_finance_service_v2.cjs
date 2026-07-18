const fs = require('fs');
const file = 'src/services/financeService.ts';
let code = fs.readFileSync(file, 'utf8');

const targetRegex = /\/\/ Create a task if it's a CC bill or EMI[\s\S]*?\} catch \(taskErr\) \{/;
const replacement = `// Auto-create a task if it's a pending expense (payable)
      try {
        if (newRecord.type === 'expense' && (newRecord.status === 'pending' || newRecord.status === 'overdue') && !newRecord.isReimbursed && !newRecord.isReceivableFromClient) {
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
      } catch (taskErr) {`;

if (targetRegex.test(code)) {
  code = code.replace(targetRegex, replacement);
  fs.writeFileSync(file, code);
  console.log('Patched financeService successfully');
} else {
  console.log('Target not found');
}
