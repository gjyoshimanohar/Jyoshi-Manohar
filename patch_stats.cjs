const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /  const paidInvoiced = invoices\.reduce\(\(sum, i\) => sum \+ \(i\.status === 'paid' \? i\.total : 0\), 0\);\n  const outstandingInvoiced = invoices\.reduce\(\(sum, i\) => sum \+ \(i\.status === 'sent' \|\| i\.status === 'overdue' \? i\.total : 0\), 0\);/;

const replacement = `  const paidInvoiced = invoices.reduce((sum, i) => sum + (i.amountPaid || 0), 0);
  const outstandingInvoiced = invoices.reduce((sum, i) => sum + (i.status !== 'draft' && i.status !== 'cancelled' ? Math.max(0, i.total - (i.amountPaid || 0)) : 0), 0);`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
