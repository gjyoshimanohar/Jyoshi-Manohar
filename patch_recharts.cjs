const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const importRegex = /import \{ format, isAfter, parseISO \} from 'date-fns';/;
const importReplacement = `import { format, isAfter, parseISO } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';`;

content = content.replace(importRegex, importReplacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
