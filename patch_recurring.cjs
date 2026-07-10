const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /                  <\/input>\n                <\/div>\n              <\/div>\n\n              \{\/\* Line Items Editor Spreadsheet \*\/\}/;

const replacement = `                  </input>
                </div>
              </div>
              
              {/* Recurring Settings */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-150">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isRecurring" 
                    checked={isRecurring} 
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 text-[#1a2b58] rounded border-gray-300 focus:ring-[#1a2b58]"
                  />
                  <label htmlFor="isRecurring" className="text-xs font-semibold text-gray-700">Make this a recurring invoice</label>
                </div>
                {isRecurring && (
                  <select
                    value={recurringInterval}
                    onChange={(e) => setRecurringInterval(e.target.value as any)}
                    className="border border-gray-200 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:border-[#1a2b58]"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                )}
              </div>

              {/* Line Items Editor Spreadsheet */}`;

content = content.replace(/                <\/div>\n              <\/div>\n\n              \{\/\* Line Items Editor Spreadsheet \*\/\}/, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
