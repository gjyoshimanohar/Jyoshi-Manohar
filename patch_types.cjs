const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');
content = content.replace(
  "type: 'income' | 'expense' | 'transfer';",
  "type: 'income' | 'expense' | 'transfer' | 'journal';"
);
fs.writeFileSync('src/types.ts', content);
