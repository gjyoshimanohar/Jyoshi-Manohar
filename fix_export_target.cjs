const fs = require('fs');
const file = 'src/components/GeneralLedger.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "if (exportFormat === 'excel') handleDownloadExcel(exportTargetAccount, exportStartDate, exportEndDate);\\n                  else handleDownloadPDF(exportTargetAccount, exportStartDate, exportEndDate);",
  "if (!exportTargetAccount) return;\\n                  if (exportFormat === 'excel') handleDownloadExcel(exportTargetAccount, exportStartDate, exportEndDate);\\n                  else handleDownloadPDF(exportTargetAccount, exportStartDate, exportEndDate);"
);

fs.writeFileSync(file, code);
console.log("Patched export target");
