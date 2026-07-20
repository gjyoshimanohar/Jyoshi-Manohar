const fs = require('fs');
let content = fs.readFileSync('/app/applet/src/components/FinanceTracker.tsx', 'utf-8');

const targetContainer = '<div className="flex flex-col bg-slate-50/50 border border-slate-200 rounded-xl p-4 overflow-hidden">';
const newContainer = '<div className="flex flex-col bg-slate-50/50 border border-slate-200 rounded-xl p-4 overflow-y-auto max-h-[320px] custom-scrollbar">';

content = content.replace(targetContainer, newContainer);

fs.writeFileSync('/app/applet/src/components/FinanceTracker.tsx', content);
console.log("Updated DatePicker container");
