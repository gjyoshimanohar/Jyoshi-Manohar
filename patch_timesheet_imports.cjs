const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

code = 'import { timesheetService } from "../services/timesheetService";\nimport { TimesheetLog } from "../types";\n' + code;

fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
