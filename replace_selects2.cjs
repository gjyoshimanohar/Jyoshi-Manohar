const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

// We have many <select ...> tags. Let's just find them and replace them.
// Instead of complex AST, let's just do them one by one.

const replaces = [
  {
    regex: /<select\s+value=\{formStatus\}\s+onChange=\{\(e\) => setFormStatus\(e\.target\.value as any\)\}\s+className="([^"]+)"\s*>\s*<option value="paid">Paid \(Settled\)<\/option>\s*<option value="pending">Pending<\/option>\s*<\/select>/g,
    repl: (match, c) => `<CustomSelect value={formStatus} onChange={(val) => setFormStatus(val as any)} className="${c}" options={[{value: "paid", label: "Paid (Settled)"}, {value: "pending", label: "Pending"}]} />`
  },
  {
    regex: /<select\s+value=\{formIsReceivableFromClient \? "yes" : "no"\}\s+onChange=\{\(e\) => setFormIsReceivableFromClient\(e\.target\.value === "yes"\)\}\s+className="([^"]+)"\s*>\s*<option value="no">No<\/option>\s*<option value="yes">Yes<\/option>\s*<\/select>/g,
    repl: (match, c) => `<CustomSelect value={formIsReceivableFromClient ? "yes" : "no"} onChange={(val) => setFormIsReceivableFromClient(val === "yes")} className="${c}" options={[{value: "no", label: "No"}, {value: "yes", label: "Yes"}]} />`
  },
  {
    regex: /<select\s+value=\{accountType\}\s+onChange=\{\(e\) => setAccountType\(e\.target\.value as any\)\}\s+className="([^"]+)"\s*>\s*<option value="asset_bank">Bank Account \(Asset\)<\/option>\s*<option value="asset_cash">Cash in Hand \(Asset\)<\/option>\s*<option value="liability_credit">Credit Card \(Liability\)<\/option>\s*<option value="liability_loan">Loan Account \(Liability\)<\/option>\s*<\/select>/g,
    repl: (match, c) => `<CustomSelect value={accountType} onChange={(val) => setAccountType(val as any)} className="${c}" options={[{value: "asset_bank", label: "Bank Account (Asset)"}, {value: "asset_cash", label: "Cash in Hand (Asset)"}, {value: "liability_credit", label: "Credit Card (Liability)"}, {value: "liability_loan", label: "Loan Account (Liability)"}]} />`
  }
];

replaces.forEach(r => {
  code = code.replace(r.regex, r.repl);
});

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
