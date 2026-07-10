const fs = require('fs');
const file = 'src/components/InvoiceManagement.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex1 = /<div className="bg-white border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:bg-slate-50\/50 transition-colors">\s*<div className="absolute top-0 left-0 w-1\.5 h-full bg-slate-500" \/>\s*<div>\s*<span className="text-xs text-slate-400 uppercase tracking-wider font-bold block mb-1">Total Invoiced<\/span>\s*<span className="text-2xl font-bold text-slate-900 block mt-1\.5">\s*₹\{totalInvoiced\.toLocaleString\('en-US', \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)\}\s*<\/span>\s*<\/div>\s*<div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">\s*<FileText className="w-6 h-6 text-slate-500" \/>\s*<\/div>\s*<\/div>/;

const repl1 = `<div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center border border-slate-100">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Invoiced
            </span>
            <h4 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              ₹{totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>
        </div>`;

const regex2 = /<div className="bg-white border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:bg-emerald-50\/50 transition-colors">\s*<div className="absolute top-0 left-0 w-1\.5 h-full bg-emerald-500" \/>\s*<div>\s*<span className="text-xs text-slate-400 uppercase tracking-wider font-bold block mb-1">Received Payments<\/span>\s*<span className="text-2xl font-bold text-emerald-600 block mt-1\.5">\s*₹\{paidInvoiced\.toLocaleString\('en-US', \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)\}\s*<\/span>\s*<\/div>\s*<div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">\s*<CheckCircle className="w-6 h-6 text-emerald-600" \/>\s*<\/div>\s*<\/div>/;

const repl2 = `<div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Received Payments
            </span>
            <h4 className="text-xl font-bold text-emerald-600 tracking-tight mt-0.5">
              ₹{paidInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>
        </div>`;

const regex3 = /<div className="bg-white border border-border p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:bg-blue-50\/50 transition-colors">\s*<div className="absolute top-0 left-0 w-1\.5 h-full bg-blue-500" \/>\s*<div>\s*<span className="text-xs text-slate-400 uppercase tracking-wider font-bold block mb-1">Outstanding Balances<\/span>\s*<span className="text-2xl font-bold text-blue-600 block mt-1\.5">\s*₹\{outstandingInvoiced\.toLocaleString\('en-US', \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)\}\s*<\/span>\s*<\/div>\s*<div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">\s*<Clock className="w-6 h-6 text-blue-600" \/>\s*<\/div>\s*<\/div>/;

const repl3 = `<div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Outstanding Balances
            </span>
            <h4 className="text-xl font-bold text-blue-600 tracking-tight mt-0.5">
              ₹{outstandingInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>
        </div>`;

const regex4 = /<div className="bg-white border border-rose-100 p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:bg-rose-50 transition-colors bg-rose-50\/30">\s*<div className="absolute top-0 left-0 w-1\.5 h-full bg-rose-500" \/>\s*<div>\s*<span className="text-xs text-rose-500 uppercase tracking-wider font-bold flex items-center gap-1 mb-1">\s*Overdue Balances\s*<\/span>\s*<span className="text-2xl font-bold text-rose-600 block mt-1\.5">\s*₹\{overdueInvoiced\.toLocaleString\('en-US', \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)\}\s*<\/span>\s*<\/div>\s*<div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">\s*<ShieldAlert className="w-6 h-6 text-rose-600" \/>\s*<\/div>\s*<\/div>/;

const repl4 = `<div className="bg-white p-6 rounded-2xl border border-slate-100/60 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Overdue Balances
            </span>
            <h4 className="text-xl font-bold text-rose-600 tracking-tight mt-0.5">
              ₹{overdueInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
          </div>
        </div>`;

content = content.replace(regex1, repl1);
content = content.replace(regex2, repl2);
content = content.replace(regex3, repl3);
content = content.replace(regex4, repl4);

fs.writeFileSync(file, content, 'utf8');
console.log("Updated tiles to match Portal Dashboard");
