const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `  // Aggregate Metrics based on ALL records for selected month, year, and scope`;
const replacement = `  const payablesChartData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();

    const result = [];
    for (let i = 0; i < 6; i++) {
      result.push({
        name: \`\${monthNames[currentMonth]} \${currentYear}\`,
        amount: 0,
        monthStr: String(currentMonth + 1).padStart(2, '0'),
        yearStr: String(currentYear)
      });

      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    }

    records.forEach(rec => {
      if (rec.type === 'expense' && (rec.status === 'pending' || rec.status === 'overdue') && !rec.isReimbursed && !rec.isReceivableFromClient) {
        const recScope = rec.scope || "business";
        if (selectedScope !== "all" && recScope !== selectedScope) return;
        
        const recYear = rec.date.split("-")[0];
        const recMonth = rec.date.split("-")[1];
        
        const targetObj = result.find(r => r.monthStr === recMonth && r.yearStr === recYear);
        if (targetObj) {
          targetObj.amount += rec.amount;
        }
      }
    });

    return result;
  }, [records, selectedScope]);

  // Aggregate Metrics based on ALL records for selected month, year, and scope`;

if (code.includes(target) && !code.includes('payablesChartData')) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Added payablesChartData');
} else {
  console.log('Target not found or already added');
}
