const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

code = code.replace(
  'return d >= filterDate && d <= end;',
  'return filterDate ? d >= filterDate && d <= end : false;'
);

fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
