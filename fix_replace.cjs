const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the useMemo part
content = content.replace(
  'const { incomeChartData, expenseChartData } = useMemo(() => {\n    const incomeTotals: { [name: string]: number } = {};\n    const expenseTotals: { [name: string]: number } = {};\n    recordsToExport.forEach(rec => {',
  'const { incomeChartData, expenseChartData } = useMemo(() => {\n    const incomeTotals: { [name: string]: number } = {};\n    const expenseTotals: { [name: string]: number } = {};\n    filteredRecords.forEach(rec => {'
);

fs.writeFileSync(file, content);
console.log("Fixed useMemo");
