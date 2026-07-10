const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /  const overdueInvoiced = invoices\.reduce\(\(sum, i\) => \{\n    const isOverdue = \(i\.status === 'sent' \|\| i\.status === 'overdue'\) && isAfter\(new Date\(\), parseISO\(i\.dueDate\)\);\n    return sum \+ \(isOverdue \? i\.total : 0\);\n  \}, 0\);/;

const replacement = `  const overdueInvoiced = invoices.reduce((sum, i) => {
    const isOverdue = (i.status === 'sent' || i.status === 'overdue' || i.status === 'partial') && isAfter(new Date(), parseISO(i.dueDate));
    return sum + (isOverdue ? Math.max(0, i.total - (i.amountPaid || 0)) : 0);
  }, 0);`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
