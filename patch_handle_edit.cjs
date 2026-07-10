const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /setItems\(invoice\.items\);\s*setFormStatus\(invoice\.status as any\);/;

const replacement = `setItems(invoice.items);
    setFormStatus(invoice.status as any);
    setIsRecurring(invoice.isRecurring || false);
    setRecurringInterval(invoice.recurringInterval || 'monthly');
    setAmountPaid(invoice.amountPaid || 0);
    setPayments(invoice.payments || []);`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
