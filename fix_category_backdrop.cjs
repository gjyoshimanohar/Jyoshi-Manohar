const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

code = code.replace(
  'className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" style={{ zIndex: 9999 }}>',
  'className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" style={{ zIndex: 9999 }}>\n          <div className="absolute inset-0" onClick={() => setIsCategoryModalOpen(false)} />'
);

// We need to make sure the modal content itself has relative positioning so it sits above the backdrop div
code = code.replace(
  '<div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">',
  '<div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">'
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
