const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\`html \+= \`<div class="header-meta">Generated on \$\{new Date\(\)\.toLocaleDateString\(\)\} \| Filter: \$\{selectedMonth\}\/\$\{selectedYear\} \| Total Records: \$\{recordsToExport\.length\}<\/div>\`;\`/g,
  'html += `<div class="header-meta">Generated on ${new Date().toLocaleDateString()} | Filter: ${selectedMonth}/${selectedYear} | Total Records: ${recordsToExport.length}</div>`;'
);

fs.writeFileSync(file, content);
console.log("Fixed syntax error");
