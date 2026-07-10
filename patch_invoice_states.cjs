const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const importsAdd = `import { InvoicePayment } from '../types';\n`;
if (!content.includes('InvoicePayment')) {
    content = content.replace(`import { Invoice, InvoiceItem }`, `import { Invoice, InvoiceItem, InvoicePayment }`);
}

const statesAdd = `  const [formStatus, setFormStatus] = useState<'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled'>('draft');

  // Recurring & Payment States
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  
  // Payment Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');`;

content = content.replace(/const \[formStatus, setFormStatus\] = useState\w*<[^>]+>\('draft'\);/, statesAdd);

fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
