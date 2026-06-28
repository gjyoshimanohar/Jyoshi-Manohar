const fs = require('fs');
let content = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

content = content.replace(/bg-emerald-600 hover:bg-emerald-700/g, 'bg-primary hover:bg-secondary text-white');
content = content.replace(/bg-primary hover:bg-slate-900/g, 'bg-primary hover:bg-secondary text-white');
content = content.replace(/hover:bg-slate-900/g, 'hover:bg-secondary');
content = content.replace(/bg-emerald-600/g, 'bg-primary');

// typography
content = content.replace(/font-serif font-medium text-slate-900/g, 'font-medium text-primary tracking-tight');
content = content.replace(/font-serif font-semibold text-slate-900/g, 'font-semibold text-primary tracking-tight');
content = content.replace(/font-serif font-bold text-slate-900/g, 'font-bold text-primary tracking-tight');
content = content.replace(/font-serif text-slate-900/g, 'text-primary tracking-tight');

// borders and shadows for cards
content = content.replace(/shadow-sm hover:shadow-xs/g, 'shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1');
content = content.replace(/shadow-xs hover:shadow-md/g, 'shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1');
content = content.replace(/shadow-sm hover:shadow-md/g, 'shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1');
content = content.replace(/border-slate-100/g, 'border-slate-100/60');
content = content.replace(/border-slate-150/g, 'border-slate-100/60');
content = content.replace(/border-slate-350/g, 'border-slate-200');

fs.writeFileSync('src/pages/ClientDashboard.tsx', content);
