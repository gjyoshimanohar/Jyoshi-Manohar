const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

code = code.replace(/title="Focus Timer Space"/g, 'title="Time Tracker & Focus"');
code = code.replace(/Timer Space/g, 'Time Tracker');

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
