const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');

content = content.replace(/tracking-tight mb-8">\\s*About Me/, 'tracking-tight mb-4">\\n  About Me');
content = content.replace('text-justify mb-10', 'text-justify mb-8');
content = content.replace('gap-5 mb-12', 'gap-5 mb-8');
content = content.replace('text-justify mb-12', 'text-justify mb-8');

fs.writeFileSync('src/pages/Home.tsx', content);
