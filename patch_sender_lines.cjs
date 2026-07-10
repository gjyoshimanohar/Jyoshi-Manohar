const fs = require('fs');
let lines = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8').split('\n');

const replacement = `              {/* Sender Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Corporate Sender</span>
                  <button 
                    type="button" 
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    Edit Organization Details
                  </button>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs">
                  <div className="font-bold text-gray-900">{senderName}</div>
                  <div className="text-gray-500 mt-0.5">{senderEmail}</div>
                  {senderAddress && <div className="text-gray-400 mt-1 whitespace-pre-wrap">{senderAddress}</div>}
                </div>
              </div>`;

lines.splice(874, 31, replacement); // 874 is 0-indexed line 875
fs.writeFileSync('src/components/InvoiceManagement.tsx', lines.join('\n'));
