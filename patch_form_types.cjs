const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /const form = e\.target;/;
const replacement = `const form = e.currentTarget as HTMLFormElement;`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
