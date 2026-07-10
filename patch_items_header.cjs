const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /<div className="flex items-center justify-between">\s*<span className="block text-\[11px\] font-bold text-gray-400 uppercase tracking-wider">Line Items<\/span>\s*<button \s*type="button"\s*onClick={handleAddItem}/;

const replacement = `<div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Line Items</span>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsProductsModalOpen(true)}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                    >
                      Manage Products
                    </button>
                    <button 
                      type="button"
                      onClick={handleAddItem}`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
