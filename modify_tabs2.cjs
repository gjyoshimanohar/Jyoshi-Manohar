const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');
content = content.replace(
  '<StatementsTab invoices={invoices} clients={clients} />',
  '<StatementsTab />'
);
if (!content.includes('import StatementsTab')) {
  content = content.replace(
    'import GeneralLedger from "./GeneralLedger";',
    'import GeneralLedger from "./GeneralLedger";\nimport StatementsTab from "./StatementsTab";'
  );
}
fs.writeFileSync('src/components/FinanceTracker.tsx', content);
