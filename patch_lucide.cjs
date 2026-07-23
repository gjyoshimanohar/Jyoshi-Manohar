const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');
code = code.replace(
  'Copy,',
  'Copy,\n  Square,'
);
fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
