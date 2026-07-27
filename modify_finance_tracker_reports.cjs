const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

// fix state type
content = content.replace(
  'const [activeTab, setActiveTab] = useState<"dashboard" | "incomes" | "expenses" | "transfers" | "account" | "settings" | "receivables" | "payables" | "ai_insights" | "coa" | "ap_ar" | "gl" | "statements">("dashboard");',
  'const [activeTab, setActiveTab] = useState<"dashboard" | "incomes" | "expenses" | "transfers" | "account" | "settings" | "receivables" | "payables" | "ai_insights" | "coa" | "ap_ar" | "gl" | "statements" | "reports">("dashboard");'
);

// add reports to map
const mapStr = '{ id: "coa", label: "Chart of Accounts"';
if (content.includes(mapStr) && !content.includes('{ id: "reports"')) {
  content = content.replace(
    mapStr,
    '{ id: "reports", label: "Formal Reports", icon: BookOpen, desc: "P&L, Balance Sheet" },\n              ' + mapStr
  );
}

// add reports render
const settingsRender = '{/* Settings Tab Content */}';
if (content.includes(settingsRender) && !content.includes('activeTab === "reports"')) {
  content = content.replace(
    settingsRender,
    '{activeTab === "reports" && <FinancialReports records={records} accounts={paymentAccounts} />}\n\n      ' + settingsRender
  );
}

// imports
if (!content.includes('import FinancialReports')) {
  content = content.replace(
    'import StatementsTab from "./StatementsTab";',
    'import StatementsTab from "./StatementsTab";\nimport FinancialReports from "./FinancialReports";'
  );
}

fs.writeFileSync('src/components/FinanceTracker.tsx', content);
