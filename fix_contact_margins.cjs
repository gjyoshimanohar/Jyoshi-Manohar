const fs = require('fs');
let content = fs.readFileSync('src/components/Contact.tsx', 'utf8');
content = content.replace('rounded-full mb-8 shadow-sm', 'rounded-full mb-6 shadow-sm');
content = content.replace('tracking-tight mb-8', 'tracking-tight mb-4');
content = content.replace('max-w-sm mb-12', 'max-w-sm mb-8');
fs.writeFileSync('src/components/Contact.tsx', content);
