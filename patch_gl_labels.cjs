const fs = require('fs');
const file = 'src/components/GeneralLedger.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldBtns = `<div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadExcel(account as GLAccount)}
                      className="p-2 bg-white border border-slate-200 text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl transition-all shadow-sm flex items-center gap-1"
                      title="Download Statement (Excel)"
                    >
                      <FileSpreadsheet className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(account as GLAccount)}
                      className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                      title="Download Statement (PDF)"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>`;

const newBtns = `<div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadExcel(account as GLAccount)}
                      className="px-3 py-2 bg-white border border-slate-200 text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                      title="Download Statement (Excel)"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(account as GLAccount)}
                      className="px-3 py-2 bg-white border border-slate-200 text-indigo-600 hover:text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                      title="Download Statement (PDF)"
                    >
                      <Download className="w-4 h-4" /> PDF
                    </button>
                  </div>`;

if (code.includes(oldBtns)) {
    code = code.replace(oldBtns, newBtns);
    fs.writeFileSync(file, code);
    console.log("Labels added");
} else {
    console.log("Could not find buttons");
}
