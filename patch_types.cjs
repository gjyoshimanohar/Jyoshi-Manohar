const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace(
  'priority?: number; // 1, 2, 3, 4',
  'priority?: number; // 1, 2, 3, 4\n\ttimeSpentSeconds?: number;'
);
fs.writeFileSync('src/types.ts', code);
