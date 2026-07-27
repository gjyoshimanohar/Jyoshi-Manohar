const fs = require('fs');
let content = fs.readFileSync('src/components/StatementGeneratorModal.tsx', 'utf-8');
content = content.replace(
  '<button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg">\n            <X className="w-5 h-5" />\n          </button>',
  '{!isEmbedded && (<button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg">\n            <X className="w-5 h-5" />\n          </button>)}'
);
fs.writeFileSync('src/components/StatementGeneratorModal.tsx', content);
