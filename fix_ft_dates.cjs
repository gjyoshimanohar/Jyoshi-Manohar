const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace standard date inputs with relative container + Calendar icon
code = code.replace(
  /<input\s+type="date"\s+value={addCcBillDueDate}\s+onChange={\(e\) => setAddCcBillDueDate\(e\.target\.value\)}\s+className="w-full bg-white border border-slate-200 rounded-xl py-2\.5 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:border-primary transition shadow-sm"\s*\/>/,
  `<div className="relative">
                    <input
                      type="date"
                      value={addCcBillDueDate}
                      onChange={(e) => setAddCcBillDueDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-primary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>`
);

code = code.replace(
  /<input\s+type="date"\s+required\s+value={formDate}\s+onChange={\(e\) => setFormDate\(e\.target\.value\)}\s+className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500 transition-colors"\s*\/>/,
  `<div className="relative">
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>`
);

code = code.replace(
  /<input\s+type="date"\s+required\s+value={convertAdvDate}\s+onChange={\(e\) => setConvertAdvDate\(e\.target\.value\)}\s+className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"\s*\/>/,
  `<div className="relative">
                  <input
                    type="date"
                    required
                    value={convertAdvDate}
                    onChange={(e) => setConvertAdvDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>`
);

fs.writeFileSync(file, code);
console.log('Patched FinanceTracker dates');
