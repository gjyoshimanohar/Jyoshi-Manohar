const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');
if(!content.includes('const [paymentReference')) {
    content = content.replace(`const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');`, `const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');\n  const [paymentReference, setPaymentReference] = useState('');`);
    fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
}
