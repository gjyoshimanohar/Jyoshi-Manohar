const fs = require('fs');
const file = 'src/components/WorkspaceApp.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `                        </div>

                        {/* Notes / Descriptions and subtasks checklist inside Drawer */}`;

const replacement = `                        </div>

                        {/* Payable Tracker Widget */}
                        {todo.tags?.includes("payable") && (
                          <div className="mt-5 p-4 bg-rose-50/50 border border-rose-100 rounded-xl space-y-3 relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-1">
                              <Wallet className="w-4 h-4 text-rose-600" />
                              <h4 className="text-xs font-bold text-rose-900 uppercase tracking-widest">Payable Tracker</h4>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-white/60 p-3 rounded-lg border border-rose-100/50">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-rose-500 uppercase tracking-wider font-bold">Total Payable</span>
                                <span className="text-lg font-bold text-rose-900">₹{(todo.metadata?.payableAmount || 0).toLocaleString("en-IN")}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-bold">Total Paid</span>
                                <span className="text-lg font-bold text-emerald-700">₹{(todo.metadata?.paidAmount || 0).toLocaleString("en-IN")}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-orange-600 uppercase tracking-wider font-bold">Remaining</span>
                                <span className="text-lg font-bold text-orange-700">₹{((todo.metadata?.payableAmount || 0) - (todo.metadata?.paidAmount || 0)).toLocaleString("en-IN")}</span>
                              </div>
                            </div>

                            <div className="pt-2 flex gap-2 items-center">
                              <input
                                type="number"
                                placeholder="Enter payment amount..."
                                id="payment-amount-input"
                                className="flex-1 text-xs px-3 py-2 bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                              <button
                                onClick={() => {
                                  const input = document.getElementById("payment-amount-input") as HTMLInputElement;
                                  const amount = parseFloat(input.value);
                                  if (!isNaN(amount) && amount > 0) {
                                    const currentPaid = todo.metadata?.paidAmount || 0;
                                    const newPaid = currentPaid + amount;
                                    todoService.updateTodo(todo.id, {
                                      metadata: {
                                        ...todo.metadata,
                                        paidAmount: newPaid
                                      }
                                    });
                                    input.value = "";
                                  }
                                }}
                                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
                              >
                                Log Payment
                              </button>
                            </div>
                            
                            {/* Progress bar */}
                            <div className="w-full bg-rose-200/50 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div 
                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                                style={{ width: \`\${Math.min(100, Math.max(0, ((todo.metadata?.paidAmount || 0) / (todo.metadata?.payableAmount || 1)) * 100))}%\` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Notes / Descriptions and subtasks checklist inside Drawer */}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Patched WorkspaceApp.tsx with Payable widget successfully');
} else {
  console.log('Target not found in WorkspaceApp.tsx');
}
