const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

const funcRegex = /const handleSyncPayables = async \(\) => \{[\s\S]*?    \} finally \{\n      setSyncing\(false\);\n    \}\n  \};\n/m;
code = code.replace(funcRegex, '');

const btnRegex = /<button \n                onClick=\{handleSyncPayables\}[\s\S]*?<\/button>\n              /m;
code = code.replace(btnRegex, '');

fs.writeFileSync(file, code);
console.log('Removed handleSyncPayables and Sync button from FinanceTracker');
