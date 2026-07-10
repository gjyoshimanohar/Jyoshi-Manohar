const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

const regex = /export interface InvoiceItem \{\n  id: string;/;
const replacement = `export interface InvoiceItem {
  id: string;
  taxable?: boolean;`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/types.ts', content);
