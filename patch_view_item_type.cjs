const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /<td className="px-5 py-3\.5 font-medium text-gray-900">\{item\.description\}<\/td>/;

const replacement = `<td className="px-5 py-3.5 font-medium text-gray-900">
                          {item.type && (
                            <span className="inline-block bg-gray-100 text-gray-500 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded mr-2 align-middle">
                              {item.type}
                            </span>
                          )}
                          <span className="align-middle">{item.description}</span>
                        </td>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
