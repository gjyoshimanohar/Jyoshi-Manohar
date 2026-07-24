const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

// Remove state
code = code.replace(
  /  const \[showTimeSummaryModal, setShowTimeSummaryModal\] = useState\(false\);\n/g,
  ''
);

// Remove button
code = code.replace(
  /\s*<button \n\s*onClick=\{\(\) => setShowTimeSummaryModal\(true\)\}\n\s*className="flex items-center gap-1\.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-1\.5 text-xs font-bold transition-all shadow-sm ml-2"\n\s*title="View Time Tracking Summary"\n\s*>\n\s*<Clock className="w-3\.5 h-3\.5 text-slate-400" \/>\n\s*Time Logs\n\s*<\/button>/g,
  ''
);

// Remove modal
const modalStart = code.indexOf('{/* Time Tracking Summary Modal */}');
if (modalStart !== -1) {
  const modalEnd = code.indexOf('    </div>\n  );\n}', modalStart);
  if (modalEnd !== -1) {
    code = code.substring(0, modalStart) + code.substring(modalEnd);
  }
}

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
