const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

// For customStartDate
code = code.replace(
  /<input\s*type="date"\s*value=\{customStartDate\}\s*onChange=\{\(e\) => setCustomStartDate\(e\.target\.value\)\}\s*className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2\.5 py-1 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"\s*\/>/g,
  `<div className="relative">
      <input
        type="date"
        value={customStartDate}
        onChange={(e) => setCustomStartDate(e.target.value)}
        className="w-full pl-7 pr-2 py-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
      />
      <Calendar className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
   </div>`
);

// For customEndDate
code = code.replace(
  /<input\s*type="date"\s*value=\{customEndDate\}\s*onChange=\{\(e\) => setCustomEndDate\(e\.target\.value\)\}\s*className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2\.5 py-1 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"\s*\/>/g,
  `<div className="relative">
      <input
        type="date"
        value={customEndDate}
        onChange={(e) => setCustomEndDate(e.target.value)}
        className="w-full pl-7 pr-2 py-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
      />
      <Calendar className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
   </div>`
);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
console.log('Patched WorkspaceApp dates 2');
