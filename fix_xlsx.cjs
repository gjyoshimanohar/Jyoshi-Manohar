const fs = require('fs');
const file = 'src/components/GeneralLedger.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("import * as XLSX from 'xlsx';")) {
    code = "import * as XLSX from 'xlsx';\n" + code;
    fs.writeFileSync(file, code);
}
console.log("XLSX imported");
