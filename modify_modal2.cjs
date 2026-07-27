const fs = require('fs');
let content = fs.readFileSync('src/components/StatementGeneratorModal.tsx', 'utf-8');

content = content.replace(
  '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">',
  '<div className={isEmbedded ? "w-full" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"}>'
);

content = content.replace(
  '<div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">',
  '<div className={`bg-white rounded-2xl w-full flex flex-col overflow-hidden ${isEmbedded ? "border border-slate-200 h-full" : "shadow-xl max-w-4xl max-h-[90vh]"}`}>'
);

content = content.replace(
  '<button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">',
  '{!isEmbedded && (<button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">'
);

content = content.replace(
  '<X className="w-5 h-5" />\n          </button>',
  '<X className="w-5 h-5" />\n          </button>)}'
);

fs.writeFileSync('src/components/StatementGeneratorModal.tsx', content);
