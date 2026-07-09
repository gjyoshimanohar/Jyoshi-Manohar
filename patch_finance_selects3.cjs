const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

// Replace standard selects manually using regex where the class has 'bg-slate-50/50' etc.

// Instead of regex, I'll find "<select" and do a targeted replace for each occurrence.
// Since there's about 8 left, I can do it easily.

code = code.replace(/<select[\s\S]*?<\/select>/g, (match) => {
  if (match.includes('value={formCategory}')) {
    return `<CustomSelect
              value={formCategory}
              onChange={setFormCategory}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={formScope === "business"
                ? (formType === "income" ? customCategories.businessIncome : customCategories.businessExpense).map(c => ({value: c, label: c}))
                : (formType === "income" ? customCategories.personalIncome : customCategories.personalExpense).map(c => ({value: c, label: c}))
              }
            />`;
  }
  if (match.includes('value={formStatus}')) {
    return `<CustomSelect
              value={formStatus}
              onChange={(val) => setFormStatus(val as any)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={formType === "income"
                ? [
                    {value: "paid", label: "Paid"},
                    {value: "pending", label: "Pending Receipt"},
                    {value: "overdue", label: "Overdue Invoicing"}
                  ]
                : [
                    {value: "paid", label: "Paid (Settled)"},
                    {value: "pending", label: "Pending"}
                  ]
              }
            />`;
  }
  if (match.includes('value={formClientId}')) {
    return `<CustomSelect
              value={formClientId}
              onChange={setFormClientId}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={[
                { value: "", label: "No specific client" },
                ...clients.map(c => ({ value: c.id, label: c.name }))
              ]}
            />`;
  }
  if (match.includes('value={formIsReceivableFromClient')) {
    return `<CustomSelect
              value={formIsReceivableFromClient ? "yes" : "no"}
              onChange={(val) => setFormIsReceivableFromClient(val === "yes")}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={[
                { value: "no", label: "No" },
                { value: "yes", label: "Yes" }
              ]}
            />`;
  }
  if (match.includes('value={formAccountId}')) {
    return `<CustomSelect
              value={formAccountId}
              onChange={setFormAccountId}
              placeholder="Select account"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={paymentAccounts.filter(a => a.id !== 'virtual_pending_reimbursements').map(a => ({ value: a.id, label: a.name }))}
            />`;
  }
  if (match.includes('value={formDestinationAccountId}')) {
    return `<CustomSelect
              value={formDestinationAccountId}
              onChange={setFormDestinationAccountId}
              placeholder="Select destination account"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={paymentAccounts.filter(a => a.id !== 'virtual_pending_reimbursements' && a.id !== formAccountId).map(a => ({ value: a.id, label: a.name }))}
            />`;
  }
  if (match.includes('value={formPaymentMethod}')) {
    return `<CustomSelect
              value={formPaymentMethod}
              onChange={setFormPaymentMethod}
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
  if (match.includes('value={editingAccount.type}')) {
    return `<CustomSelect
              value={editingAccount.type}
              onChange={(val) => setEditingAccount({ ...editingAccount, type: val as any })}
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
