const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');
content = content.replace(
  'const [activeTab, setActiveTab] = useState<"dashboard"',
  'const [glInitialSearch, setGlInitialSearch] = useState("");\n  const [activeTab, setActiveTab] = useState<"dashboard"'
);
content = content.replace(
  '<GeneralLedger allRecords={records} accounts={paymentAccounts} />',
  '<GeneralLedger allRecords={records} accounts={paymentAccounts} defaultSearchTerm={glInitialSearch} />'
);
fs.writeFileSync('src/components/FinanceTracker.tsx', content);
