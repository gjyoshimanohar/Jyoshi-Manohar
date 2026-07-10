const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /const newItem: InvoiceItem = {\s*id: Math\.random\(\)\.toString\(36\)\.substring\(2, 9\),\s*description: '',\s*quantity: 1,\s*rate: 0,\s*amount: 0\s*};/;

const replacement = `const newItem: InvoiceItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'service',
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
