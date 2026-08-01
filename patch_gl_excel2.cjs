const fs = require('fs');
const file = 'src/components/GeneralLedger.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /<button\s*onClick=\{\(\) => handleDownloadPDF\(account as GLAccount\)\}\s*className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"\s*title="Download Statement \(PDF\)"\s*>\s*<Download className="w-5 h-5" \/>\s*<\/button>/g;

const newButtons = `<div className="flex items-center gap-2">
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

if (code.match(regex)) {
    code = code.replace(regex, newButtons);
    fs.writeFileSync(file, code);
    console.log("Patched successfully");
} else {
    console.log("Could not find match");
}
