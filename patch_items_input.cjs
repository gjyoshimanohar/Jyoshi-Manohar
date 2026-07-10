const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /<td className="p-2">\s*<input \s*type="text"\s*required\s*placeholder="e\.g\. Service or Engagement details"\s*value={item\.description}\s*onChange={\(e\) => handleItemChange\(item\.id, 'description', e\.target\.value\)}\s*className="w-full border-none bg-transparent p-1 focus:outline-none focus:bg-gray-50 rounded"\s*\/>\s*<\/td>/;

const replacement = `<td className="p-2 relative flex flex-col gap-1">
                            <input 
                              type="text"
                              required
                              placeholder="e.g. Service or Engagement details"
                              value={item.description}
                              onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                              className="w-full border border-gray-200 bg-transparent p-1.5 focus:outline-none focus:border-indigo-400 rounded"
                            />
                            {products.length > 0 && (
                              <select
                                className="w-full border border-gray-200 bg-gray-50 p-1 text-[10px] focus:outline-none rounded text-gray-500"
                                onChange={(e) => {
                                  const selectedProd = products.find(p => p.id === e.target.value);
                                  if (selectedProd) {
                                    handleItemChange(item.id, 'description', selectedProd.name + (selectedProd.description ? ' - ' + selectedProd.description : ''));
                                    handleItemChange(item.id, 'rate', selectedProd.price);
                                  }
                                  e.target.value = "";
                                }}
                              >
                                <option value="">Or select from predefined products...</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>{p.name} - {getCurrencySymbol(currency)}{p.price}</option>
                                ))}
                              </select>
                            )}
                          </td>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
