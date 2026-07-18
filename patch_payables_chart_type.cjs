const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  `formatter={(value) => [\`₹\${value.toLocaleString("en-IN")}\`, 'Amount']}`,
  `formatter={(value: any) => [\`₹\${Number(value).toLocaleString("en-IN")}\`, 'Amount']}`
);
fs.writeFileSync(file, code);
