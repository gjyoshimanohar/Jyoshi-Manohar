const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const paymentRegex = /                \{\/\* Email Client mockup \*\/\}/;

const paymentReplace = `                {/* Record Payment */}
                <button 
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Record Payment
                </button>

                {/* Email Client mockup */}`;

content = content.replace(paymentRegex, paymentReplace);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
