const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `import {  financeService } from "../services/financeService";`;
const replacement = `import {  financeService } from "../services/financeService";
import { todoService } from "../services/todoService";`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Patched FinanceTracker UI Import');
} else {
  console.log('Target not found');
}
