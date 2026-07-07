const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

const target = `        </div>
      </div>

      {/* Two-Column Sidebar Layout */}`;

const replacement = `        </div>
      </div>

      {/* Pending Receivables Summary Bar */}
      {pendingReimbursementsBalance > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-fade-in">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-amber-100 rounded-lg">
               <AlertCircle className="w-5 h-5 text-amber-700" />
             </div>
             <div>
               <h3 className="text-amber-900 font-bold tracking-tight">Total Pending Receivables</h3>
               <p className="text-amber-700/80 text-sm font-medium">Reimbursements pending from clients</p>
             </div>
           </div>
           <div className="text-2xl font-extrabold text-amber-900 tracking-tight">
             ₹{pendingReimbursementsBalance.toLocaleString("en-IN")}
           </div>
        </div>
      )}

      {/* Two-Column Sidebar Layout */}`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
