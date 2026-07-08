const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

// The project list container space
code = code.replace(
  '<div className="space-y-0.5 mt-2">',
  '<div className="space-y-0 mt-1">'
);

// Folder margin bottom
code = code.replace(
  'className="mb-2.5 bg-gray-50/50 rounded-xl p-1.5 relative border border-gray-100/40"',
  'className="mb-0.5 bg-gray-50/50 rounded-xl p-0.5 relative border border-gray-100/40 cursor-grab active:cursor-grabbing"'
);

// Folder title row padding
code = code.replace(
  'className="flex items-center justify-between p-1 rounded group" onDrop',
  'className="flex items-center justify-between px-1 py-0.5 rounded group" onDrop'
);

// Subprojects container
code = code.replace(
  '<div className="pl-3.5 border-l border-gray-200 ml-3.5 mt-1 space-y-0.5">',
  '<div className="pl-3 border-l border-gray-200 ml-3 mt-0 space-y-0">'
);

// Project item row padding
code = code.replace(
  /className=\{\`flex-grow flex items-center justify-between p-1\.5 rounded-lg text-xs/g,
  'className={`flex-grow flex items-center justify-between px-1.5 py-1 rounded-lg text-xs'
);

// Another place?
code = code.replace(
  '<div className="mb-2">\n <div className="flex items-center justify-between px-2 text-gray-400 text-xs uppercase tracking-widest mb-2 group">',
  '<div className="mb-1">\n <div className="flex items-center justify-between px-2 text-gray-400 text-xs uppercase tracking-widest mb-1 group">'
);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
