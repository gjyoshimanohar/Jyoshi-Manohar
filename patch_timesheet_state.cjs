const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

const targetStateStr = 'const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);';
const newStateStr = targetStateStr + '\n  const [timesheets, setTimesheets] = useState<TimesheetLog[]>([]);\n  const [timeReportFilter, setTimeReportFilter] = useState<"week" | "month" | "project">("week");';

code = code.replace(targetStateStr, newStateStr);
fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
