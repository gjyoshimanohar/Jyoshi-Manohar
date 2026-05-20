const fs = require('fs');
let c = fs.readFileSync('src/components/BlogCard.tsx', 'utf8');

c = c.replace(
  /className=\`group p-8 lg:p-10 rounded-3xl \$\{bgClass\} border border-white\/50 backdrop-blur-sm transition-all duration-500 hover:shadow-\[0_20px_40px_-15px_rgba\(0,0,0,0.05\)\] hover:-translate-y-2 hover:scale-\[1.01\] relative flex flex-col\`/,
  'className={`group relative overflow-hidden p-8 lg:p-10 rounded-3xl ${bgClass} border border-white/50 backdrop-blur-sm transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 hover:scale-[1.02] flex flex-col`}'
);
fs.writeFileSync('src/components/BlogCard.tsx', c);
