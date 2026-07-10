const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /  const subtotal = items\.reduce\(\(sum, item\) => sum \+ item\.amount, 0\);\n  const taxAmount = \(subtotal \* taxRate\) \/ 100;/;

const replacement = `  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxableSubtotal = items.reduce((sum, item) => sum + (item.taxable !== false ? item.amount : 0), 0);
  const taxAmount = (taxableSubtotal * taxRate) / 100;`;

content = content.replace(regex, replacement);

const newItemRegex = /      type: 'service',\n      description: '',/;
const newItemReplacement = `      type: 'service',
      taxable: true,
      description: '',`;

content = content.replace(newItemRegex, newItemReplacement);

fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
