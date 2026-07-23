const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

code = code.replace(
  'import { Link } from "react-router-dom";',
  'import { Link } from "react-router-dom";\nimport { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";\nimport { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, format, subMonths } from "date-fns";'
);

code = code.replace(
  'import { invoiceService } from "../services/invoiceService";',
  'import { invoiceService } from "../services/invoiceService";\nimport { timesheetService } from "../services/timesheetService";\nimport { TimesheetLog } from "../types";'
);

fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
