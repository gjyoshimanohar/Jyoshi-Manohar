const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

const uiTarget = `                  {/* Is it receivable from client */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      {formType === 'expense' ? 'Is it receivable from client?' : 'Is it a reimbursement from client?'}
                    </label>
                    <CustomSelect value={formIsReceivableFromClient ? "yes" : "no"} onChange={(val) => setFormIsReceivableFromClient(val === "yes")} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary" options={[{value: "no", label: "No"}, {value: "yes", label: "Yes"}]} />
                  </div>
                </div>
              )}`;

const uiReplacement = `                  {/* Is it receivable from client */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      {formType === 'expense' ? 'Is it receivable from client?' : 'Is it a reimbursement from client?'}
                    </label>
                    <CustomSelect value={formIsReceivableFromClient ? "yes" : "no"} onChange={(val) => setFormIsReceivableFromClient(val === "yes")} className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-primary outline-none focus:ring-1 focus:ring-primary" options={[{value: "no", label: "No"}, {value: "yes", label: "Yes"}]} />
                  </div>
                  
                  {/* Tithe Applicability */}
                  {formType === "income" && formScope === "business" && !editingRecord && (
                    <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl mt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="tithe-checkbox"
                          checked={formTitheApplicable}
                          onChange={(e) => setFormTitheApplicable(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                        />
                        <label htmlFor="tithe-checkbox" className="text-xs font-bold text-amber-900 uppercase tracking-widest">
                          Tithes Applicability
                        </label>
                      </div>
                      
                      {formTitheApplicable && (
                        <div>
                          <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5">
                            Tithe Amount (₹)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 5000"
                            value={formTitheAmount}
                            onChange={(e) => setFormTitheAmount(e.target.value)}
                            className="w-full bg-white border border-amber-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-amber-900 outline-none focus:ring-1 focus:ring-amber-500"
                          />
                          <p className="text-[10px] text-amber-600/80 mt-1.5 font-medium leading-relaxed">
                            This amount will be added to the "Tithes and Offerings" liability account automatically upon saving.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}`;

if (code.includes(uiTarget)) {
  code = code.replace(uiTarget, uiReplacement);
  fs.writeFileSync(file, code);
  console.log('UI Patched successfully');
} else {
  console.log('UI Target not found');
}
