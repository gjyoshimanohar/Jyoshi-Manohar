const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

// 1. Update formType state
content = content.replace(
  'const [formType, setFormType] = useState<"income" | "expense" | "transfer">("income");',
  'const [formType, setFormType] = useState<"income" | "expense" | "transfer" | "journal">("income");'
);

// 2. Add Journal tab
content = content.replace(
  '                  <span>Transfer</span>\n                </button>\n              </div>',
  `                  <span>Transfer</span>\n                </button>\n                <button\n                  type="button"\n                  onClick={() => setFormType("journal")}\n                  className={\`py-2.5 rounded-lg text-xs font-bold transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1.5 \${\n                    formType === "journal"\n                      ? "bg-white text-indigo-700 shadow-sm border border-slate-100"\n                      : "text-slate-600 hover:text-primary"\n                  }\`}\n                >\n                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />\n                  <span>Journal Entry</span>\n                </button>\n              </div>`
);

// 3. Fix handleSaveRecord for Journal
// category: formType === "transfer" ? "Internal Transfer" : formType === "journal" ? "Manual Journal" : formCategory,
content = content.replace(
  'category: formType === "transfer" ? "Internal Transfer" : formCategory,',
  'category: formType === "transfer" ? "Internal Transfer" : formType === "journal" ? "Manual Journal" : formCategory,'
);
// clientName: formType === "transfer" ? "" : clientName,
content = content.replace(
  'clientName: formType === "transfer" ? "" : clientName,',
  'clientName: (formType === "transfer" || formType === "journal") ? "" : clientName,'
);
// clientId: formType === "transfer" ? "" : (formClientId || ""),
content = content.replace(
  'clientId: formType === "transfer" ? "" : (formClientId || ""),',
  'clientId: (formType === "transfer" || formType === "journal") ? "" : (formClientId || ""),'
);
// paymentMode: (formStatus === "paid" || formType === "transfer") ? formPaymentMode : "",
content = content.replace(
  'paymentMode: (formStatus === "paid" || formType === "transfer") ? formPaymentMode : "",',
  'paymentMode: (formStatus === "paid" || formType === "transfer" || formType === "journal") ? formPaymentMode : "",'
);
// paymentAccountId: (formStatus === "paid" || formType === "transfer") ? formPaymentAccountId : "",
content = content.replace(
  'paymentAccountId: (formStatus === "paid" || formType === "transfer") ? formPaymentAccountId : "",',
  'paymentAccountId: (formStatus === "paid" || formType === "transfer" || formType === "journal") ? formPaymentAccountId : "",'
);
// transferToAccountId: formType === "transfer" ? formTransferToAccountId : "",
content = content.replace(
  'transferToAccountId: formType === "transfer" ? formTransferToAccountId : "",',
  'transferToAccountId: (formType === "transfer" || formType === "journal") ? formTransferToAccountId : "",'
);

fs.writeFileSync('src/components/FinanceTracker.tsx', content);
