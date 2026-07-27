const fs = require('fs');
let content = fs.readFileSync('src/components/StatementGeneratorModal.tsx', 'utf-8');

content = content.replace(
  '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">',
  'isEmbedded ? <div className="w-full flex justify-center p-0"> : <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">'
);

content = content.replace(
  '<div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">',
  '<div className={`bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ${isEmbedded ? "" : "shadow-xl"}`}>'
);

// We need to wrap it in a fragment because of the ternary we added
content = content.replace(
  'isEmbedded ? <div className="w-full flex justify-center p-0"> : <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">',
  '<>\n      {isEmbedded ? (\n        <div className="w-full flex p-0">\n          <div className={`bg-white rounded-2xl w-full flex flex-col overflow-hidden border border-slate-100`}>'
);

content = content.replace(
  '<div className={`bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ${isEmbedded ? "" : "shadow-xl"}`}>',
  '<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">\n          <div className={`bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden`}>'
);

// Wait, I messed up the replacements. Let's just restore and do it properly.
fs.writeFileSync('src/components/StatementGeneratorModal.tsx', fs.readFileSync('src/components/StatementGeneratorModal.tsx', 'utf-8'));
