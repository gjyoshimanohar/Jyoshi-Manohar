const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

code = code.replace(
  'let data = [];',
  'let data: { name: string, "Time (Hours)": number }[] = [];'
);

fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
