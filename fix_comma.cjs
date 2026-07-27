const fs = require('fs');
let content = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf-8');
content = content.replace('Copy,, BookOpen', 'Copy, BookOpen');
fs.writeFileSync('src/pages/ClientDashboard.tsx', content);
