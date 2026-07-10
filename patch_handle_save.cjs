const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /      total,\n      notes\n    };/;

const replacement = `      total,
      notes,
      isRecurring,
      recurringInterval,
      amountPaid,
      payments
    };`;

content = content.replace(regex, replacement);

const resetRegex = /const resetForm = \(\) => {[\s\S]*?setFormStatus\('draft'\);\n  };/;

const resetReplacement = `const resetForm = () => {
    setSelectedInvoice(null);
    setInvoiceNumber('');
    setClientName('');
    setClientEmail('');
    setClientAddress('');
    setIssueDate(format(new Date(), 'yyyy-MM-dd'));
    setDueDate(format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    setTaxRate(5);
    setDiscount(0);
    setDiscountType('fixed');
    setPaymentTerms('Net 15');
    setTermsAndConditions('');
    setNotes('');
    setItems([{ id: '1', type: 'service', description: 'Consulting Services', quantity: 1, rate: 150, amount: 150 }]);
    setFormStatus('draft');
    setIsRecurring(false);
    setRecurringInterval('monthly');
    setAmountPaid(0);
    setPayments([]);
  };`;

content = content.replace(resetRegex, resetReplacement);

fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
