const fs = require('fs');
let code = fs.readFileSync('src/components/EisenhowerMatrix.tsx', 'utf-8');

code = code.replace(/text-xs text-gray-800 font-semibold truncate/g, 'text-sm font-bold text-gray-800 tracking-tight truncate');
code = code.replace(/text-base text-gray-400 font-medium mb-3 italic/g, 'text-xs text-gray-500 font-medium mb-3 italic');
fs.writeFileSync('src/components/EisenhowerMatrix.tsx', code);
