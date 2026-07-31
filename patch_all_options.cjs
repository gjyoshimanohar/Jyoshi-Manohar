const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

const allOptionsCode = `
  const journalOptions = useMemo(() => {
    return [
      {
        label: "Assets & Liabilities",
        options: paymentAccounts.map(a => ({ value: a.id, label: a.name }))
      },
      {
        label: "Income (Revenue)",
        options: [...customCategories.businessIncome, ...customCategories.personalIncome].map(c => ({ value: \`rev-\${c}\`, label: c }))
      },
      {
        label: "Expenses",
        options: [...customCategories.businessExpense, ...customCategories.personalExpense].map(c => ({ value: \`exp-\${c}\`, label: c }))
      }
    ];
  }, [paymentAccounts, customCategories]);
`;

content = content.replace(
  '  // Category Breakdown for Pie Charts',
  allOptionsCode + '\n  // Category Breakdown for Pie Charts'
);

fs.writeFileSync('src/components/FinanceTracker.tsx', content);
