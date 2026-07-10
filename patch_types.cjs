const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

const paymentInterface = `export interface InvoicePayment {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
}

`;

if (!content.includes('InvoicePayment')) {
    content = content.replace('export interface InvoiceItem', paymentInterface + 'export interface InvoiceItem');
}

const itemUpdate = `export interface InvoiceItem {
  id: string;
  type?: 'service' | 'product' | 'time' | 'expense';
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}`;

content = content.replace(/export interface InvoiceItem \{[\s\S]*?\}/, itemUpdate);

const invoiceUpdate = `  notes?: string;
  createdAt: number;
  isRecurring?: boolean;
  recurringInterval?: 'weekly' | 'monthly' | 'yearly';
  amountPaid?: number;
  payments?: InvoicePayment[];
}`;

content = content.replace(/  notes\?: string;\n  createdAt: number;\n\}/, invoiceUpdate);

fs.writeFileSync('src/types.ts', content);
