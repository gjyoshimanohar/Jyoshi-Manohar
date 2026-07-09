const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

code = code.replace(/<\/div><\/div>\n        <\/div>\n      \)}\n\n      {\/\* Pending Receivables Analytics Row \*\//g, '</div>\n        </div>\n      )}\n\n      {/* Pending Receivables Analytics Row */}');

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
