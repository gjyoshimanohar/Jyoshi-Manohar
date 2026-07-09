const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

const t1 = `  // Category Breakdown for Pie Charts (Current Filters applied)
  const categoryChartData = useMemo(() => {
    const categoryTotals: { [name: string]: number } = {};
    filteredRecords.forEach(rec => {
      if (rec.type === "transfer") return;
      categoryTotals[rec.category] = (categoryTotals[rec.category] || 0) + rec.amount;
    });

    return Object.keys(categoryTotals).map(catName => ({
      name: catName,
      value: categoryTotals[catName]
    }));
  }, [filteredRecords]);`;

const r1 = `  // Category Breakdown for Pie Charts (Current Filters applied)
  const { incomeChartData, expenseChartData } = useMemo(() => {
    const incomeTotals: { [name: string]: number } = {};
    const expenseTotals: { [name: string]: number } = {};

    filteredRecords.forEach(rec => {
      if (rec.type === "transfer") return;
      if (rec.type === "income") {
        incomeTotals[rec.category] = (incomeTotals[rec.category] || 0) + rec.amount;
      } else if (rec.type === "expense") {
        expenseTotals[rec.category] = (expenseTotals[rec.category] || 0) + rec.amount;
      }
    });

    return {
      incomeChartData: Object.keys(incomeTotals).map(name => ({ name, value: incomeTotals[name] })),
      expenseChartData: Object.keys(expenseTotals).map(name => ({ name, value: expenseTotals[name] }))
    };
  }, [filteredRecords]);`;

code = code.replace(t1, r1);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
