const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /              \{\/\* Math summary breakdown \*\/\}/;

const replacement = `              {/* Payment History */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="py-4 border-t border-gray-150">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Payment History</h4>
                  <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-150">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100/50">
                        <tr>
                          <th className="px-4 py-2 font-semibold text-gray-500">Date</th>
                          <th className="px-4 py-2 font-semibold text-gray-500">Method</th>
                          <th className="px-4 py-2 font-semibold text-gray-500">Reference</th>
                          <th className="px-4 py-2 font-semibold text-gray-500 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150">
                        {selectedInvoice.payments.map(p => (
                          <tr key={p.id}>
                            <td className="px-4 py-2 text-gray-600">{p.date}</td>
                            <td className="px-4 py-2 text-gray-600">{p.method}</td>
                            <td className="px-4 py-2 text-gray-400">{p.reference || '-'}</td>
                            <td className="px-4 py-2 text-emerald-600 font-bold font-mono text-right">{getCurrencySymbol(selectedInvoice.currency)}{p.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Math summary breakdown */}`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
