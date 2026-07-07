const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

const target = `{/* Is it receivable from client */}
                  {formType === 'expense' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Is it receivable from client?
                      </label>
                      <select
                        value={formIsReceivableFromClient ? "yes" : "no"}
                        onChange={(e) => setFormIsReceivableFromClient(e.target.value === "yes")}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                  )}`;

const replacement = `{/* Is it receivable from client */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      {formType === 'expense' ? 'Is it receivable from client?' : 'Is it a reimbursement from client?'}
                    </label>
                    <select
                      value={formIsReceivableFromClient ? "yes" : "no"}
                      onChange={(e) => setFormIsReceivableFromClient(e.target.value === "yes")}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
