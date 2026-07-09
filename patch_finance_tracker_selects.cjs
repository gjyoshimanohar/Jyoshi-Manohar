const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

// Replace standard selects with CustomSelect
const imports = `import CustomSelect from "./CustomSelect";\n`;
if (!code.includes('import CustomSelect')) {
  code = code.replace(/import \{ motion.*\} from "motion\/react";/, match => imports + match);
}

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
