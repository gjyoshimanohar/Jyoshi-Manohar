const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

code = code.replace('{/* Pending Receivables Analytics Row */}}', '{/* Pending Receivables Analytics Row */}');

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
