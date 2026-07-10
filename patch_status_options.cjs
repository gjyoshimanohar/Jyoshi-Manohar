const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /                    <option value="paid">Paid \(Settled\)<\/option>/;

const replacement = `                    <option value="paid">Paid (Settled)</option>
                    <option value="partial">Partial Payment</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
