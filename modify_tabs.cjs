const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

// fix state type
content = content.replace(
  'const [activeTab, setActiveTab] = useState<"dashboard" | "incomes" | "expenses" | "transfers" | "account" | "settings" | "receivables" | "payables" | "ai_insights">("dashboard");',
  'const [activeTab, setActiveTab] = useState<"dashboard" | "incomes" | "expenses" | "transfers" | "account" | "settings" | "receivables" | "payables" | "ai_insights" | "coa" | "ap_ar" | "gl" | "statements">("dashboard");'
);

// add statements to map
const mapStr = '{ id: "gl", label: "General Ledger", icon: FileSpreadsheet, desc: "Debits & Credits" },';
if (content.includes(mapStr) && !content.includes('{ id: "statements"')) {
  content = content.replace(
    mapStr,
    mapStr + '\n              { id: "statements", label: "Statements", icon: FileText, desc: "Account Statements" },'
  );
}

// add statements render
const settingsRender = '{/* Settings Tab Content */}';
if (content.includes(settingsRender) && !content.includes('activeTab === "statements"')) {
  content = content.replace(
    settingsRender,
    '{activeTab === "statements" && <StatementsTab invoices={invoices} clients={clients} />}\n\n      ' + settingsRender
  );
}

fs.writeFileSync('src/components/FinanceTracker.tsx', content);
