const fs = require('fs');
let content = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

content = content.replace(/text-slate-900/g, 'text-primary');
content = content.replace(/text-slate-950/g, 'text-primary');

fs.writeFileSync('src/pages/ClientDashboard.tsx', content);
