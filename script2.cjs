const fs = require('fs');
let content = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

// Fix remaining font-serif
content = content.replace(/font-serif /g, '');
content = content.replace(/font-serif/g, '');

fs.writeFileSync('src/pages/ClientDashboard.tsx', content);
