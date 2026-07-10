const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /                          <td className="p-2 text-right font-mono font-semibold text-gray-800 p-3">\n                            \$\{item.amount.toFixed\(2\)\}\n                          <\/td>/;

const replacement = `                          <td className="p-2 text-right font-mono font-semibold text-gray-800 p-3">
                            \${item.amount.toFixed(2)}
                            <div className="mt-1 flex items-center justify-end gap-1">
                              <input 
                                type="checkbox" 
                                checked={item.taxable !== false} 
                                onChange={(e) => handleItemChange(item.id, 'taxable', e.target.checked)}
                                className="w-3 h-3 text-[#1a2b58] rounded border-gray-300"
                                title="Taxable"
                              />
                              <span className="text-[9px] text-gray-400">Tax</span>
                            </div>
                          </td>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
