const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /const form = e\.currentTarget as HTMLFormElement;\s*const name = form\.name\.value;\s*const desc = form\.desc\.value;\s*const price = parseFloat\(form\.price\.value\);/;
const replacement = `const form = e.currentTarget as HTMLFormElement;
                const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                const desc = (form.elements.namedItem('desc') as HTMLTextAreaElement).value;
                const price = parseFloat((form.elements.namedItem('price') as HTMLInputElement).value);`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
