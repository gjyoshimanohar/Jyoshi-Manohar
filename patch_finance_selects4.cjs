const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

code = code.replace(/<select[\s\S]*?<\/select>/g, (match) => {
  if (match.includes('value={formPaymentAccountId}')) {
    return `<CustomSelect
              value={formPaymentAccountId}
              onChange={setFormPaymentAccountId}
              placeholder="Select account"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={paymentAccounts.filter(a => a.id !== 'virtual_pending_reimbursements').map(a => ({ value: a.id, label: a.name }))}
            />`;
  }
  if (match.includes('value={formTransferToAccountId}')) {
    return `<CustomSelect
              value={formTransferToAccountId}
              onChange={setFormTransferToAccountId}
              placeholder="Select destination account"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={paymentAccounts.filter(a => a.id !== 'virtual_pending_reimbursements' && a.id !== formPaymentAccountId).map(a => ({ value: a.id, label: a.name }))}
            />`;
  }
  if (match.includes('value={formPaymentMode}')) {
    return `<CustomSelect
              value={formPaymentMode}
              onChange={setFormPaymentMode}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={[
                { value: "Bank Transfer", label: "Bank Transfer" },
                { value: "UPI", label: "UPI" },
                { value: "Credit Card", label: "Credit Card" },
                { value: "Debit Card", label: "Debit Card" },
                { value: "Cash", label: "Cash" },
                { value: "Cheque", label: "Cheque" }
              ]}
            />`;
  }
  if (match.includes('value={accountType}')) {
    return `<CustomSelect
              value={accountType}
              onChange={(val) => setAccountType(val as any)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={[
                { value: "bank", label: "Bank Account" },
                { value: "upi", label: "UPI Wallet" },
                { value: "credit_card", label: "Credit Card" },
                { value: "cash", label: "Cash on Hand" }
              ]}
            />`;
  }
  return match;
});

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
