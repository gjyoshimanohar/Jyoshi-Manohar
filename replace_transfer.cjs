const fs = require('fs');
let text = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

const regex = /\{formType === "transfer" \? \([\s\S]*?<\/div>\n\s*<\/div>\n\s*\) : formStatus === "paid" && \(/;

const replacement = `{(formType === "transfer" || formType === "journal") ? (
                <div className={\`\${formType === "journal" ? "bg-indigo-50/40 border-indigo-100" : "bg-blue-50/40 border-blue-100"} border p-4 rounded-xl space-y-4\`}>
                  <div className={\`text-xs font-bold flex items-center gap-1.5 \${formType === "journal" ? "text-indigo-800" : "text-blue-800"}\`}>
                    {formType === "journal" ? <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> : <ArrowLeftRight className="w-4 h-4 text-blue-600" />}
                    <span>{formType === "journal" ? "Journal Entry (Double Entry)" : "Configure Transfer Route"}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                        {formType === "journal" ? "Credit (Cr) Account *" : "Source Account (From) *"}
                      </label>
                      <CustomSelect
              value={formPaymentAccountId}
              onChange={setFormPaymentAccountId}
              placeholder="Select account"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={formType === "journal" ? journalOptions : paymentAccounts.filter(a => a.id !== 'virtual_pending_reimbursements').map(a => ({ value: a.id, label: \`\${a.name} (₹\${(accountBalances[a.id]?.current ?? a.openingBalance).toLocaleString("en-IN")})\` }))}
            />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                        {formType === "journal" ? "Debit (Dr) Account *" : "Destination Account (To) *"}
                      </label>
                      <CustomSelect
              value={formTransferToAccountId}
              onChange={setFormTransferToAccountId}
              placeholder="Select destination account"
              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"
              options={formType === "journal" ? journalOptions : paymentAccounts.filter(a => a.id !== 'virtual_pending_reimbursements' && a.id !== formPaymentAccountId).map(a => ({ value: a.id, label: \`\${a.name} (₹\${(accountBalances[a.id]?.current ?? a.openingBalance).toLocaleString("en-IN")})\` }))}
            />
                    </div>
                  </div>

                  {formType === "transfer" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Transfer Payment Mode *
                    </label>
                    <CustomSelect
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
            />
                  </div>
                  )}
                </div>
              ) : formStatus === "paid" && (`;

const match = text.match(regex);
if (match) {
  text = text.replace(regex, replacement);
  fs.writeFileSync('src/components/FinanceTracker.tsx', text);
  console.log("Replaced successfully!");
} else {
  console.log("No match found!");
}
