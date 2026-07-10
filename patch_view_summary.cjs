const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /                      <\/span>\n                    <\/div>\n                  \)}\n\n                  <div className="pt-3 mt-1 border-t border-gray-150 flex justify-between items-baseline">/;

const replacement = `                      </span>
                    </div>
                  )}
                  
                  {selectedInvoice.amountPaid > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Amount Paid</span>
                      <span className="font-mono font-semibold">-{getCurrencySymbol(selectedInvoice.currency)}{selectedInvoice.amountPaid.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-3 mt-1 border-t border-gray-150 flex justify-between items-baseline">`;

content = content.replace(regex, replacement);

const totalRegex = /<span className="font-mono text-xl font-bold text-\[#1a2b58\]">\{getCurrencySymbol\(selectedInvoice\.currency\)\}\{selectedInvoice\.total\.toFixed\(2\)\}<\/span>/;

const totalReplacement = `<span className="font-mono text-xl font-bold text-[#1a2b58]">{getCurrencySymbol(selectedInvoice.currency)}{Math.max(0, selectedInvoice.total - (selectedInvoice.amountPaid || 0)).toFixed(2)}</span>`;

content = content.replace(totalRegex, totalReplacement);

fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
