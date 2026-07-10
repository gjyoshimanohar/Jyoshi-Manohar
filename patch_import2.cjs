const fs = require('fs');
const file = 'src/pages/ClientDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('CreditCard,')) {
    content = content.replace('Calendar,', 'Calendar,\n  CreditCard,');
}

fs.writeFileSync(file, content, 'utf8');
console.log("Patched imports");
