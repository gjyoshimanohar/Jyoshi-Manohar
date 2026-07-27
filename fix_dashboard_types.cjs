const fs = require('fs');
let content = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf-8');

const target = '    | "book-consultation"\n  >("overview");';
const replacement = '    | "book-consultation"\n    | "statements"\n    | "gl"\n    | "ap_ar"\n    | "coa"\n  >("overview");';

content = content.replace(target, replacement);

fs.writeFileSync('src/pages/ClientDashboard.tsx', content);
