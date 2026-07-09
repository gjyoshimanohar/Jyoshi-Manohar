const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

code = code.replace(
  /if \(activeTab === "dashboard"\) \{\n\s*if \(selectedType !== "all" && rec\.type !== selectedType\) return false;\n\s*\}/g,
  `if (activeTab === "dashboard") {
        if (selectedType !== "all" && rec.type !== selectedType) return false;
        if (selectedType === "income" && rec.category === "Reimbursement") return false;
      }`
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
