const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const targetStr = `{/* Record Payment */}
                <button 
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <DollarSign className="w-3.5 h-3.5" /> Record Payment
                </button>

                {/* Email Client mockup */}
                <button 
                  onClick={() => alert(\`Email dispatch queued successfully for \${selectedInvoice.clientEmail}\`)}
                  className="flex items-center gap-1.5 bg-[#1a2b58] hover:bg-[#121f40] text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" /> Email Client
                </button>`;

const replacement = `{/* Admin Actions */}
                {isAdmin ? (
                  <>
                    <button 
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Record Payment
                    </button>
                    <button 
                      onClick={() => alert(\`Email dispatch queued successfully for \${selectedInvoice.clientEmail}\`)}
                      className="flex items-center gap-1.5 bg-[#1a2b58] hover:bg-[#121f40] text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" /> Email Client
                    </button>
                  </>
                ) : (
                  <>
                    {selectedInvoice.status !== 'paid' && (
                      <button 
                        onClick={() => {
                          alert("Redirecting to secure Stripe checkout gateway...");
                        }}
                        className="flex items-center gap-1.5 bg-[#635BFF] hover:bg-[#5851e5] text-white px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> Pay Now
                      </button>
                    )}
                  </>
                )}`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
