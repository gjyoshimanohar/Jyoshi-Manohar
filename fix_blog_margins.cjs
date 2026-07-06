const fs = require('fs');
let content = fs.readFileSync('src/pages/BlogPost.tsx', 'utf8');
content = content.replace('tracking-tight mb-12', 'tracking-tight mb-6');
content = content.replace('gap-10 py-10 border-y border-border mb-16', 'gap-10 py-6 border-y border-border mb-8');
content = content.replace('prose-a:text-secondary mb-24', 'prose-a:text-secondary mb-12');
fs.writeFileSync('src/pages/BlogPost.tsx', content);
