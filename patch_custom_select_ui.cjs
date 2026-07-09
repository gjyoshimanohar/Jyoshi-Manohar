const fs = require('fs');
let code = fs.readFileSync('src/components/CustomSelect.tsx', 'utf-8');

// Update the wrapper
code = code.replace(
  /className="absolute z-50 w-full min-w-max mt-1 bg-white rounded-2xl shadow-\[0_20px_40px_-15px_rgba\(0,0,0,0\.1\)\] border-none overflow-hidden max-h-60 overflow-y-auto left-0"/g,
  'className="absolute z-50 w-full min-w-max mt-1 bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100/60 overflow-hidden max-h-60 overflow-y-auto left-0 p-1.5"'
);
code = code.replace(/<div className="py-2">/g, '<div className="space-y-0.5">');

// Update groups
code = code.replace(/<div key=\{'group-' \+ index\} className="mb-2">/g, '<div key={\'group-\' + index} className="mb-1">');
code = code.replace(/className="px-5 py-1\.5 text-\[10px\] font-bold text-slate-400 uppercase tracking-widest"/g, 'className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest"');

// Update buttons
const oldBtnRegex = /className=\{`w-full px-5 py-2\.5 text-sm text-left font-semibold transition-colors block \$\{value === optValue \? 'text-primary bg-slate-50' : 'text-slate-700 hover:bg-slate-50 hover:text-primary'\}`\}/g;
const newBtn = 'className={`w-full px-3 py-2 text-sm text-left font-medium transition-colors rounded-lg block ${value === optValue ? \'text-primary bg-primary/5\' : \'text-slate-700 hover:bg-slate-50 hover:text-primary\'}`}';

code = code.replace(oldBtnRegex, newBtn);

fs.writeFileSync('src/components/CustomSelect.tsx', code);
