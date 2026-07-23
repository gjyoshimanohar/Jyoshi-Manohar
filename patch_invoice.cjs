const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const target1 = `<select
                              value={item.type || 'service'}
                              onChange={(e) => handleItemChange(item.id, 'type', e.target.value)}
                              className="w-full border-none bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 p-1 text-[10px] focus:outline-none rounded font-semibold uppercase cursor-pointer"
                            >
                              <option value="service">Service</option>
                              <option value="time">Time</option>
                              <option value="expense">Expense</option>
                            </select>`;
                            
const rep1 = `<CustomSelect
                              value={item.type || 'service'}
                              onChange={(val) => handleItemChange(item.id, 'type', val)}
                              className="w-full border-none bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 p-1.5 text-[10px] focus:outline-none rounded font-semibold uppercase cursor-pointer"
                              options={[{value: 'service', label: 'Service'}, {value: 'time', label: 'Time'}, {value: 'expense', label: 'Expense'}]}
                            />`;

const target2 = `<select
                                className="w-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors p-1 text-[10px] focus:outline-none rounded text-slate-600 cursor-pointer"
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
                              </select>`;

const rep2 = `<CustomSelect
                                value=""
                                placeholder="Or select from predefined products..."
                                className="w-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors p-1.5 text-[10px] focus:outline-none rounded text-slate-600 cursor-pointer"
                                onChange={(val) => {
                                  const selectedProd = products.find(p => p.id === val);
                                  if (selectedProd) {
                                    handleItemChange(item.id, 'description', selectedProd.name + (selectedProd.description ? ' - ' + selectedProd.description : ''));
                                    handleItemChange(item.id, 'rate', selectedProd.price);
                                  }
                                }}
                                options={products.map(p => ({value: p.id, label: \`\${p.name} - \${getCurrencySymbol(currency)}\${p.price}\`}))}
                              />`;

const target3 = `<select 
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                        className="text-[10px] border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors rounded px-1 py-0.5 focus:outline-none cursor-pointer"
                      >
                        <option value="fixed">Fixed ({getCurrencySymbol(currency)})</option>
                        <option value="percentage">Percentage (%)</option>
                      </select>`;
                      
const rep3 = `<CustomSelect 
                        value={discountType}
                        onChange={(val) => setDiscountType(val as 'percentage' | 'fixed')}
                        className="text-[10px] border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors rounded px-2 py-1 focus:outline-none cursor-pointer"
                        options={[{value: 'fixed', label: \`Fixed (\${getCurrencySymbol(currency)})\`}, {value: 'percentage', label: 'Percentage (%)'}]}
                      />`;

code = code.replace(target1, rep1).replace(target2, rep2).replace(target3, rep3);
fs.writeFileSync('src/components/InvoiceManagement.tsx', code);
