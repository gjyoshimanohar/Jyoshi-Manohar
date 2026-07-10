const fs = require('fs');
const file = 'src/components/InvoiceManagement.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex1 = /<div className="bg-white p-6 rounded-2xl border border-slate-100\/60 shadow-sm flex items-center gap-4">/g;

const repl1 = `<div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all hover:-translate-y-0.5 cursor-pointer">`;

content = content.replace(regex1, repl1);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated tiles with hover effect");
