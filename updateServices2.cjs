const fs = require('fs');
let c = fs.readFileSync('src/components/Services.tsx', 'utf8');

c = c.replace(
  /className=\{`block p-8 lg:p-10 rounded-3xl h-full  border border-white\/50 backdrop-blur-sm transition-all duration-500 hover:shadow-\[0_20px_40px_-15px_rgba\(0,0,0,0\.05\)\] hover:-translate-y-2 hover:scale-\[1\.01\]`\}/,
  'className={`group relative overflow-hidden block p-8 lg:p-10 rounded-3xl h-full ${bgClass} shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-slate-200/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02]`}'
);

fs.writeFileSync('src/components/Services.tsx', c);
