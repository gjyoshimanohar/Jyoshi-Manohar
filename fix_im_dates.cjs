const fs = require('fs');
const file = 'src/components/InvoiceManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /<input\s+type="date"\s+required\s+value={issueDate}\s+onChange={\(e\) => setIssueDate\(e\.target\.value\)}\s+className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-\[#1a2b58\]"\s*\/>/,
  `<div className="relative">
                    <input 
                      type="date"
                      required
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1a2b58]/20 focus:border-[#1a2b58]"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>`
);

code = code.replace(
  /<input\s+type="date"\s+required\s+value={dueDate}\s+onChange={\(e\) => setDueDate\(e\.target\.value\)}\s+className="w-full border border-slate-200 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-\[#1a2b58\]"\s*\/>/,
  `<div className="relative">
                    <input 
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1a2b58]/20 focus:border-[#1a2b58]"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>`
);

fs.writeFileSync(file, code);
console.log('Patched InvoiceManagement dates');
