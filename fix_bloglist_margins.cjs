const fs = require('fs');
let content = fs.readFileSync('src/pages/BlogList.tsx', 'utf8');
content = content.replace('header className="mb-16"', 'header className="mb-8"');
content = content.replace('rounded-full mb-8', 'rounded-full mb-6');
content = content.replace('tracking-tighter mb-8', 'tracking-tighter mb-6');
content = content.replace('gap-3 mb-16', 'gap-3 mb-8');
fs.writeFileSync('src/pages/BlogList.tsx', content);
