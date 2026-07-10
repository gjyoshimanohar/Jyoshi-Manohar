const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

const regex = /export interface Invoice \{\n  id: string;/;
const replacement = `export interface Invoice {
  id: string;
  documentType?: 'invoice' | 'estimate';`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/types.ts', content);
