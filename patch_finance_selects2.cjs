const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

// 2. Settings - Category manage type
code = code.replace(
  /<select\s+value=\{categoryManageType\}\s+onChange=\{\(e\) => setCategoryManageType\(e\.target\.value as any\)\}\s+className="w-full bg-white border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary hover:border-slate-300 hover:shadow-sm cursor-pointer transition"\s*>\s*<option value="businessIncome">Office \/ Corporate - Income<\/option>\s*<option value="businessExpense">Office \/ Corporate - Expense<\/option>\s*<option value="personalIncome">Personal - Income<\/option>\s*<option value="personalExpense">Personal - Expense<\/option>\s*<\/select>/s,
  `<CustomSelect
                    value={categoryManageType}
                    onChange={(val) => setCategoryManageType(val as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary hover:border-slate-300 hover:shadow-sm transition"
                    options={[
                      { value: "businessIncome", label: "Office / Corporate - Income" },
                      { value: "businessExpense", label: "Office / Corporate - Expense" },
                      { value: "personalIncome", label: "Personal - Income" },
                      { value: "personalExpense", label: "Personal - Expense" }
                    ]}
                  />`
);

// 3. Receive pending
code = code.replace(
  /<select\s+value=\{receiveModalAccountId\}\s+onChange=\{\(e\) => setReceiveModalAccountId\(e\.target\.value\)\}\s+className="w-full bg-slate-50\/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary outline-none focus:ring-1 focus:ring-primary focus:bg-white transition hover:border-slate-300 hover:shadow-sm"\s*>\s*<option value="" disabled>Select receiving account\.\.\.<\/option>\s*\{paymentAccounts\.filter\(a => a\.id !== 'virtual_pending_reimbursements'\)\.map\(acc => \(\s*<option key=\{acc\.id\} value=\{acc\.id\}>\s*\{acc\.name\} \(₹\{acc\.openingBalance\.toLocaleString\("en-IN"\)\}\)\s*<\/option>\s*\)\)\}\s*<\/select>/s,
  `<CustomSelect
                    value={receiveModalAccountId}
                    onChange={(val) => setReceiveModalAccountId(val)}
                    placeholder="Select receiving account..."
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 px-3 text-sm font-semibold text-primary transition hover:border-slate-300 hover:shadow-sm"
                    options={paymentAccounts.filter(a => a.id !== 'virtual_pending_reimbursements').map(acc => ({
                      value: acc.id,
                      label: \`\${acc.name} (₹\${acc.openingBalance.toLocaleString("en-IN")})\`
                    }))}
                  />`
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
