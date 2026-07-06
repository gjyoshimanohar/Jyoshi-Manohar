const fs = require('fs');
let content = fs.readFileSync('src/components/Services.tsx', 'utf8');
content = content.replace('mb-6 lg:mb-8', 'mb-4 lg:mb-6');
content = content.replace('tracking-tight mb-8', 'tracking-tight mb-4');
content = content.replace('relaxed mb-8', 'relaxed mb-4');
content = content.replace('w-fit mb-6', 'w-fit mb-4');
content = content.replace('text-primary mb-3', 'text-primary mb-2');
fs.writeFileSync('src/components/Services.tsx', content);
