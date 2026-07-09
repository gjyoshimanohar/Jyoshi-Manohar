const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

// Replace badge stylings
code = code.replace(/text-xs text-gray-400 font-semibold bg-gray-100 px-1\.5 py-0\.2 rounded-full/g, 'text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full');
code = code.replace(/text-xs font-semibold text-gray-400 bg-gray-100 px-1 py-0\.2 rounded-full/g, 'text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full');
code = code.replace(/text-xs text-gray-500 font-medium bg-white\/65 px-1\.5 py-0\.2 rounded/g, 'text-[10px] font-bold text-slate-800 bg-white/65 px-2 py-0.5 rounded-full');
code = code.replace(/text-xs bg-gray-100 px-1\.5 py-0\.2 rounded font-medium text-gray-400/g, 'text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-800');

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
