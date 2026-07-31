const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

const oldCode = '              {formType === "transfer" ? (\n' +
'                <div className="bg-blue-50/40 border border-blue-100 p-4 rounded-xl space-y-4">\n' +
'                  <div className="text-xs font-bold text-blue-800 flex items-center gap-1.5">\n' +
'                    <ArrowLeftRight className="w-4 h-4 text-blue-600" />\n' +
'                    <span>Configure Transfer Route</span>\n' +
'                  </div>\n' +
'                  \n' +
'                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">\n' +
'                    <div>\n' +
'                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">\n' +
'                        Source Account (From) *\n' +
'                      </label>\n' +
'                      <CustomSelect\n' +
'              value={formPaymentAccountId}\n' +
'              onChange={setFormPaymentAccountId}\n' +
'              placeholder="Select account"\n' +
'              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"\n' +
'              options={paymentAccounts.filter(a => a.id !== \'virtual_pending_reimbursements\').map(a => ({ value: a.id, label: `${a.name} (₹${(accountBalances[a.id]?.current ?? a.openingBalance).toLocaleString("en-IN")})` }))}\n' +
'            />\n' +
'                    </div>\n' +
'                    <div>\n' +
'                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">\n' +
'                        Destination Account (To) *\n' +
'                      </label>\n' +
'                      <CustomSelect\n' +
'              value={formTransferToAccountId}\n' +
'              onChange={setFormTransferToAccountId}\n' +
'              placeholder="Select destination account"\n' +
'              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"\n' +
'              options={paymentAccounts.filter(a => a.id !== \'virtual_pending_reimbursements\' && a.id !== formPaymentAccountId).map(a => ({ value: a.id, label: `${a.name} (₹${(accountBalances[a.id]?.current ?? a.openingBalance).toLocaleString("en-IN")})` }))}\n' +
'            />\n' +
'                    </div>\n' +
'                  </div>\n' +
'                </div>';

const replacement = '              {(formType === "transfer" || formType === "journal") ? (\n' +
'                <div className={`${formType === "journal" ? "bg-indigo-50/40 border-indigo-100" : "bg-blue-50/40 border-blue-100"} border p-4 rounded-xl space-y-4`}>\n' +
'                  <div className={`text-xs font-bold flex items-center gap-1.5 ${formType === "journal" ? "text-indigo-800" : "text-blue-800"}`}>\n' +
'                    {formType === "journal" ? <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> : <ArrowLeftRight className="w-4 h-4 text-blue-600" />}\n' +
'                    <span>{formType === "journal" ? "Journal Entry (Double Entry)" : "Configure Transfer Route"}</span>\n' +
'                  </div>\n' +
'                  \n' +
'                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">\n' +
'                    <div>\n' +
'                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">\n' +
'                        {formType === "journal" ? "Credit (Cr) Account *" : "Source Account (From) *"}\n' +
'                      </label>\n' +
'                      <CustomSelect\n' +
'              value={formPaymentAccountId}\n' +
'              onChange={setFormPaymentAccountId}\n' +
'              placeholder="Select account"\n' +
'              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"\n' +
'              options={formType === "journal" ? journalOptions : paymentAccounts.filter(a => a.id !== \'virtual_pending_reimbursements\').map(a => ({ value: a.id, label: `${a.name} (₹${(accountBalances[a.id]?.current ?? a.openingBalance).toLocaleString("en-IN")})` }))}\n' +
'            />\n' +
'                    </div>\n' +
'                    <div>\n' +
'                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">\n' +
'                        {formType === "journal" ? "Debit (Dr) Account *" : "Destination Account (To) *"}\n' +
'                      </label>\n' +
'                      <CustomSelect\n' +
'              value={formTransferToAccountId}\n' +
'              onChange={setFormTransferToAccountId}\n' +
'              placeholder="Select destination account"\n' +
'              className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm"\n' +
'              options={formType === "journal" ? journalOptions : paymentAccounts.filter(a => a.id !== \'virtual_pending_reimbursements\' && a.id !== formPaymentAccountId).map(a => ({ value: a.id, label: `${a.name} (₹${(accountBalances[a.id]?.current ?? a.openingBalance).toLocaleString("en-IN")})` }))}\n' +
'            />\n' +
'                    </div>\n' +
'                  </div>\n' +
'                </div>';

content = content.replace(oldCode, replacement);
fs.writeFileSync('src/components/FinanceTracker.tsx', content);
