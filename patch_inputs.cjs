const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const docTypeRegex = /                <div>\n                  <label className="block text-\[11px\] font-semibold text-gray-400 uppercase mb-1">Invoice number <span className="text-gray-300 normal-case font-normal">\(Auto\)<\/span><\/label>\n                  <input /;

const docTypeReplacement = `                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Type</label>
                  <select 
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as any)}
                    className="w-full border border-gray-200 px-3 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[#1a2b58]"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="estimate">Estimate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Document number <span className="text-gray-300 normal-case font-normal">(Auto)</span></label>
                  <input `;

content = content.replace(docTypeRegex, docTypeReplacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
