const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

// 1. Month select
code = code.replace(
  /<select\s+value=\{selectedMonth\}\s+onChange=\{\(e\) => setSelectedMonth\(e\.target\.value\)\}\s+className="bg-accent border border-slate-200 rounded-lg py-1\.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary hover:border-slate-300 hover:shadow-sm cursor-pointer"\s*>\s*<option value="All">All Months<\/option>\s*\{\["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"\]\.map\(m => \(\s*<option key=\{m\} value=\{m\}>\{m\}<\/option>\s*\)\)\}\s*<\/select>/s,
  `<CustomSelect
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="bg-accent border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={[
                { value: "All", label: "All Months" },
                ...["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => ({ value: m, label: m }))
              ]}
            />`
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
