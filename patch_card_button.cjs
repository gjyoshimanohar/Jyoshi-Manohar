const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace the handleExportAccountLedger call on the button to just open the ledger
code = code.replace(/onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleExportAccountLedger\(acc\); \}\}/g, 'onClick={(e) => { e.stopPropagation(); setGlInitialSearch(acc.name); setActiveTab("gl"); }}');

fs.writeFileSync(file, code);
console.log("Patched card buttons");
