const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

// Assets card wrapper replacement
content = content.replace(
  /<div key=\{acc\.id\} className="border border-slate-100 p-4 rounded-xl hover:border-slate-300 transition-all group relative overflow-hidden bg-gradient-to-br from-white to-slate-50\/30 shadow-xs">/g,
  '<div key={acc.id} onClick={() => { setGlInitialSearch(acc.name); setActiveTab("gl"); }} className="cursor-pointer border border-slate-100 p-4 rounded-xl hover:border-slate-300 transition-all group relative overflow-hidden bg-gradient-to-br from-white to-slate-50/30 shadow-xs hover:shadow-md">'
);

// Inner button replacements
content = content.replace(
  /onClick=\{\(\) => handleOpenEditAccountModal\(acc\)\}/g,
  'onClick={(e) => { e.stopPropagation(); handleOpenEditAccountModal(acc); }}'
);
content = content.replace(
  /onClick=\{\(\) => handleExportAccountLedger\(acc\)\}/g,
  'onClick={(e) => { e.stopPropagation(); handleExportAccountLedger(acc); }}'
);
content = content.replace(
  /onClick=\{\(\) => handleDeleteAccount\(acc\.id, acc\.name\)\}/g,
  'onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.id, acc.name); }}'
);
content = content.replace(
  /onClick=\{\(\) => handleAdjustCcBalance\(acc, outstandingDebt\)\}/g,
  'onClick={(e) => { e.stopPropagation(); handleAdjustCcBalance(acc, outstandingDebt); }}'
);
content = content.replace(
  /onClick=\{\(\) => handleSettleCcBill\(acc\)\}/g,
  'onClick={(e) => { e.stopPropagation(); handleSettleCcBill(acc); }}'
);

fs.writeFileSync('src/components/FinanceTracker.tsx', content);
