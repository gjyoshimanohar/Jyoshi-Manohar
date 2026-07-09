const fs = require('fs');
let code = fs.readFileSync('src/components/ProfileDropdown.tsx', 'utf-8');

code = code.replace(/<div className="p-2 space-y-1">/g, '<div className="py-2">');
code = code.replace(/<div className="p-2 border-t border-slate-100">/g, '<div className="py-2 border-t border-slate-100">');

const oldBtn = 'className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors font-medium"';
const newBtn = 'className="w-full flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold transition-colors text-slate-700 hover:text-primary hover:bg-slate-50"';
code = code.replace(new RegExp(oldBtn, 'g'), newBtn);

const oldRedBtn = 'className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"';
const newRedBtn = 'className="w-full flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold transition-colors text-red-600 hover:bg-red-50 hover:text-red-700"';
code = code.replace(new RegExp(oldRedBtn, 'g'), newRedBtn);

fs.writeFileSync('src/components/ProfileDropdown.tsx', code);
