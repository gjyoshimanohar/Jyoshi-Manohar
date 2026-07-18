const fs = require('fs');
const file = 'src/services/financeService.ts';
let code = fs.readFileSync(file, 'utf8');

const targetRegex = /await todoService\.createTodo\(\{\n              userId: auth\.currentUser\.uid,\n              title: `Pay \$\{newRecord\.category\}: \$\{newRecord\.description \|\| newRecord\.amount\}`,\n              description: `Amount: ₹\$\{newRecord\.amount\.toLocaleString\("en-IN"\)\}\\nCategory: \$\{newRecord\.category\}`,\n              completed: false,\n              dueDate: dueDateMillis,\n              projectId: 'inbox',\n              priority: 1\n            \}\);/m;
const replacement = `await todoService.createTodo({
              userId: auth.currentUser.uid,
              title: \`Pay \${newRecord.category}: \${newRecord.description || newRecord.amount}\`,
              description: \`Amount: ₹\${newRecord.amount.toLocaleString("en-IN")}\\nCategory: \${newRecord.category}\`,
              completed: false,
              dueDate: dueDateMillis,
              projectId: 'inbox',
              priority: 1,
              tags: ['payable'],
              metadata: {
                payableAmount: newRecord.amount,
                paidAmount: 0
              }
            });`;

if (targetRegex.test(code)) {
  code = code.replace(targetRegex, replacement);
  fs.writeFileSync(file, code);
  console.log('Patched financeService v3 successfully');
} else {
  console.log('Target not found in financeService v3 patch');
}
