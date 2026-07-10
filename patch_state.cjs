const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

content = content.replace("const [invoiceNumber, setInvoiceNumber] = useState('');", "const [invoiceNumber, setInvoiceNumber] = useState('');\n  const [documentType, setDocumentType] = useState<'invoice' | 'estimate'>('invoice');");

content = content.replace(/    setInvoiceNumber\(''\);\n/, "    setInvoiceNumber('');\n    setDocumentType('invoice');\n");

content = content.replace(/    setInvoiceNumber\(invoice\.invoiceNumber\);\n/, "    setInvoiceNumber(invoice.invoiceNumber);\n    setDocumentType(invoice.documentType || 'invoice');\n");

content = content.replace(/      invoiceNumber,\n/, "      invoiceNumber,\n      documentType,\n");

fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
