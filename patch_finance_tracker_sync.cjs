const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

// First, add import for todoService
if (!code.includes('import { todoService } from')) {
  code = code.replace(
    `import { financeService } from '../services/financeService';`,
    `import { financeService } from '../services/financeService';\nimport { todoService } from '../services/todoService';\nimport { auth } from '../lib/firebase';`
  );
}

// Add the sync function
const target1 = `const [addCcBillAccountId, setAddCcBillAccountId] = useState("");`;
const replacement1 = `const [addCcBillAccountId, setAddCcBillAccountId] = useState("");

  const handleSyncPayables = async () => {
    if (!auth.currentUser) return;
    try {
      setSyncing(true);
      const pendingPayables = records.filter(r => r.type === 'expense' && r.status !== 'paid');
      const allTodos = await todoService.getTodosOnce(auth.currentUser.uid);
      
      let added = 0;
      for (const payable of pendingPayables) {
        const title = \`Pay \${payable.category}: \${payable.description || payable.amount}\`;
        let dueDateMillis = null;
        if (payable.ccBillDetails && payable.ccBillDetails.dueDate) {
          dueDateMillis = new Date(payable.ccBillDetails.dueDate).getTime();
        } else if (payable.date) {
          dueDateMillis = new Date(payable.date).getTime();
        }

        const exists = allTodos.some(t => t.title === title && t.dueDate === dueDateMillis);
        if (!exists && dueDateMillis) {
          await todoService.createTodo({
            userId: auth.currentUser.uid,
            title,
            description: \`Amount: ₹\${payable.amount.toLocaleString("en-IN")}\\nCategory: \${payable.category}\`,
            completed: false,
            dueDate: dueDateMillis,
            projectId: 'inbox',
            priority: 1
          });
          added++;
        }
      }
      
      if (added > 0) {
        toast.success(\`Synced \${added} payables to tasks!\`);
      } else {
        toast.success(\`All payables are already synced.\`);
      }
    } catch (err) {
      toast.error("Failed to sync payables");
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };
`;
if (code.includes(target1) && !code.includes('handleSyncPayables')) {
  code = code.replace(target1, replacement1);
}

// Add the button to the UI
const target2 = `              <button 
                onClick={() => setAddCcBillModalOpen(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" /> Add CC Bill
              </button>`;
const replacement2 = `              <button 
                onClick={handleSyncPayables}
                disabled={syncing}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={\`w-4 h-4 \${syncing ? 'animate-spin' : ''}\`} /> Sync to Tasks
              </button>
              <button 
                onClick={() => setAddCcBillModalOpen(true)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" /> Add CC Bill
              </button>`;
if (code.includes(target2)) {
  code = code.replace(target2, replacement2);
  fs.writeFileSync(file, code);
  console.log('Patched FinanceTracker UI');
} else {
  console.log('Target2 not found');
}

