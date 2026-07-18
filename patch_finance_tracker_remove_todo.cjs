const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace('import { todoService } from "../services/todoService";\n', '');

fs.writeFileSync(file, code);
console.log('Removed todoService import');
