const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

const uiCode = `      )}

      {/* Client Advances Summary Bar */}
      {(totalAdvancesReceived > 0 || totalPaymentsFromAdvances > 0) && (
        <div 
          onClick={() => {
            setActiveTab("dashboard");
          }}
          className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between shadow-sm animate-fade-in cursor-default hover:bg-indigo-100 transition-colors group mt-4"
        >
           <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
               <AlertCircle className="w-5 h-5 text-indigo-700" />
             </div>
             <div>
               <h3 className="text-indigo-900 font-bold tracking-tight">Client Advances & Deposits</h3>
               <p className="text-indigo-700/80 text-sm font-medium">₹{totalAdvancesReceived.toLocaleString("en-IN")} Received - ₹{totalPaymentsFromAdvances.toLocaleString("en-IN")} Spent</p>
             </div>
           </div>
           <div className="flex flex-col items-end">
             <div className="text-2xl font-extrabold text-indigo-900 tracking-tight group-hover:scale-105 transition-transform flex items-center gap-2">
               ₹{Math.abs(pendingAdvancesBalance).toLocaleString("en-IN")}
               <ArrowLeftRight className="w-5 h-5 text-indigo-600 opacity-50 group-hover:opacity-100 group-hover:-rotate-12 transition-all" />
             </div>
             <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{pendingAdvancesBalance >= 0 ? "Unspent Liability" : "Overspent (Receivable)"}</span>
           </div>
        </div>
      )}`;

code = code.replace(
  /        <\/div>\n      \)}\n\n      \{\/\* Mobile\/Tablet Header Bar Toggle \(screens < md\) \*\/\}/g,
  "        </div>\n      )}" + uiCode + "\n\n      {/* Mobile/Tablet Header Bar Toggle (screens < md) */}"
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
