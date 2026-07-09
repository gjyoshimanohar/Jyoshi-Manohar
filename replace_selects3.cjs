const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

// Replace formPaymentAccountId
code = code.replace(
  /<select\s+value=\{formPaymentAccountId\}\s+onChange=\{\(e\) => setFormPaymentAccountId\(e\.target\.value\)\}\s+className="([^"]+)"\s*>\s*<option value="">None<\/option>\s*\{paymentAccounts\.map\(acc => \(\s*<option key=\{acc\.id\} value=\{acc\.id\}>\{acc\.name\} \(₹\{acc\.openingBalance\}\)<\/option>\s*\)\)\}\s*<\/select>/g,
  (m, c) => `<CustomSelect value={formPaymentAccountId} onChange={(val) => setFormPaymentAccountId(val)} className="${c}" options={[{value: "", label: "None"}, ...paymentAccounts.map(acc => ({value: acc.id, label: \`\${acc.name} (₹\${acc.openingBalance})\`}))]} />`
);

// Replace formTransferToAccountId
code = code.replace(
  /<select\s+value=\{formTransferToAccountId\}\s+onChange=\{\(e\) => setFormTransferToAccountId\(e\.target\.value\)\}\s+className="([^"]+)"\s*>\s*<option value="">None<\/option>\s*\{paymentAccounts\.map\(acc => \(\s*<option key=\{acc\.id\} value=\{acc\.id\}>\{acc\.name\} \(₹\{acc\.openingBalance\}\)<\/option>\s*\)\)\}\s*<\/select>/g,
  (m, c) => `<CustomSelect value={formTransferToAccountId} onChange={(val) => setFormTransferToAccountId(val)} className="${c}" options={[{value: "", label: "None"}, ...paymentAccounts.map(acc => ({value: acc.id, label: \`\${acc.name} (₹\${acc.openingBalance})\`}))]} />`
);

// Replace receiveModalAccountId
code = code.replace(
  /<select\s+value=\{receiveModalAccountId\}\s+onChange=\{\(e\) => setReceiveModalAccountId\(e\.target\.value\)\}\s+className="([^"]+)"\s*>\s*\{paymentAccounts\.map\(acc => \(\s*<option key=\{acc\.id\} value=\{acc\.id\}>\{acc\.name\} \(₹\{acc\.openingBalance\}\)<\/option>\s*\)\)\}\s*<\/select>/g,
  (m, c) => `<CustomSelect value={receiveModalAccountId} onChange={(val) => setReceiveModalAccountId(val)} className="${c}" options={paymentAccounts.map(acc => ({value: acc.id, label: \`\${acc.name} (₹\${acc.openingBalance})\`}))} />`
);

// Replace formPaymentMode
code = code.replace(
  /<select\s+value=\{formPaymentMode\}\s+onChange=\{\(e\) => setFormPaymentMode\(e\.target\.value\)\}\s+className="([^"]+)"\s*>\s*<option value="UPI">UPI<\/option>\s*<option value="Bank Transfer">Bank Transfer<\/option>\s*<option value="Cash">Cash<\/option>\s*<option value="Credit Card">Credit Card<\/option>\s*<option value="Debit Card">Debit Card<\/option>\s*<\/select>/g,
  (m, c) => `<CustomSelect value={formPaymentMode} onChange={(val) => setFormPaymentMode(val)} className="${c}" options={[{value: "UPI", label: "UPI"}, {value: "Bank Transfer", label: "Bank Transfer"}, {value: "Cash", label: "Cash"}, {value: "Credit Card", label: "Credit Card"}, {value: "Debit Card", label: "Debit Card"}]} />`
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
