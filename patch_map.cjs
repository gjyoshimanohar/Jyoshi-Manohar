const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

code = code.replace(
  'const map = {};',
  'const map: Record<string, { name: string, "Time (Hours)": number }> = {};'
);
code = code.replace(
  'const map = {};',
  'const map: Record<string, { name: string, "Time (Hours)": number }> = {};'
);

fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
