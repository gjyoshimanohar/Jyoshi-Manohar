const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

// Replace standard font sizes in tasks list
code = code.replace(/text-xs font-medium text-gray-800 break-words/g, 'text-sm font-bold text-gray-800 break-words tracking-tight');
code = code.replace(/text-base text-gray-400 font-medium leading-relaxed mt-0\.5 line-clamp-2/g, 'text-xs text-gray-500 font-medium leading-relaxed mt-0.5 line-clamp-2');
code = code.replace(/text-base text-gray-400 line-clamp-1 leading-normal font-medium mt-0\.5/g, 'text-xs text-gray-500 line-clamp-1 leading-normal font-medium mt-0.5');

// Find and replace sidebar buttons (using standard string replacement to avoid regex quoting hell)
const todayStr = "className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'today' ? 'bg-[#FFEFEE] text-[#e53935] ' : 'hover:bg-gray-100 text-gray-700 font-semibold'}`}";
const todayRep = "className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === 'today' ? 'bg-[#FFEFEE] text-[#e53935] shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}";
code = code.replace(todayStr, todayRep);

const upcStr = "className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'upcoming' ? 'bg-primary/5 text-[#1a2b58] ' : 'hover:bg-gray-100 text-gray-700 font-semibold'}`}";
const upcRep = "className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === 'upcoming' ? 'bg-primary/5 text-[#1a2b58] shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}";
code = code.replace(upcStr, upcRep);

const inbStr = "className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'inbox' ? 'bg-blue-50 text-blue-800 ' : 'hover:bg-gray-100 text-gray-700 font-semibold'}`}";
const inbRep = "className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === 'inbox' ? 'bg-blue-50 text-blue-800 shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}";
code = code.replace(inbStr, inbRep);

const cmpStr = "className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'completed' ? 'bg-gray-200/50 text-gray-900 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}";
const cmpRep = "className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === 'completed' ? 'bg-gray-200/50 text-gray-900 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`}";
code = code.replace(cmpStr, cmpRep);

const trhStr = "className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${viewMode === 'trash' ? 'bg-red-50 text-red-600 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}";
const trhRep = "className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === 'trash' ? 'bg-red-50 text-red-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`}";
code = code.replace(trhStr, trhRep);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
