const fs = require('fs');
const content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');
const newContent = content.replace('  Printer', '  Printer,\n  ArrowUp,\n  ArrowDown,\n  ArrowUpDown');
fs.writeFileSync('src/components/FinanceTracker.tsx', newContent);
