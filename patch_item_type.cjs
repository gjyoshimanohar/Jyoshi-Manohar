const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const itemRegex = /                          <td className="p-2 relative flex flex-col gap-1">\n                            <input /;

const itemReplacement = `                          <td className="p-2 relative flex flex-col gap-1">
                            <select
                              value={item.type || 'service'}
                              onChange={(e) => handleItemChange(item.id, 'type', e.target.value)}
                              className="w-full border-none bg-gray-50 text-gray-500 p-1 text-[10px] focus:outline-none rounded font-semibold uppercase"
                            >
                              <option value="service">Service</option>
                              <option value="time">Time</option>
                              <option value="expense">Expense</option>
                            </select>
                            <input `;

content = content.replace(itemRegex, itemReplacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
