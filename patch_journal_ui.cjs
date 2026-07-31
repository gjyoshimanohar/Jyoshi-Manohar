const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

const journalTransferCondition = '              {(formType === "transfer" || formType === "journal") ? (';

content = content.replace(
  '              {formType === "transfer" ? (',
  journalTransferCondition
);

const journalCategoryLabel = `                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      {formType === "journal" ? "Journal Entry" : "Account Category"}
                    </label>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-500 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                      <span>{formType === "journal" ? "Manual Journal" : "Internal Transfer"}</span>
                    </div>`;

// We'll replace the existing "Account Category" div for transfer.
// Wait, the easiest way is to use regex or string replace.
let originalAccountCategory = `                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Account Category
                    </label>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-500 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-4 h-4 text-slate-400" />
                      <span>Internal Transfer</span>
                    </div>`;

content = content.replace(originalAccountCategory, journalCategoryLabel);

fs.writeFileSync('src/components/FinanceTracker.tsx', content);
