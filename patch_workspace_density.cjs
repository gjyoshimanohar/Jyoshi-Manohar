const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

// For project items
code = code.replace(
  /className=\{\`flex-grow flex items-center justify-between p-1\.5 rounded-lg/g,
  'className={`flex-grow flex items-center justify-between px-1.5 py-0.5 rounded-lg'
);
// For another potential instance, if any
code = code.replace(
  /className=\{\`flex-grow flex items-center justify-between p-1 rounded-lg/g,
  'className={`flex-grow flex items-center justify-between px-1.5 py-0.5 rounded-lg'
);


// For folder list items
code = code.replace(
  /className="mb-1 bg-gray-50\/50 rounded-xl p-1 relative border border-gray-100\/40 cursor-grab active:cursor-grabbing">/g,
  'className="mb-0.5 bg-gray-50/50 rounded-xl p-0.5 relative border border-gray-100/40 cursor-grab active:cursor-grabbing">'
);

code = code.replace(
  /className="flex items-center justify-between p-1 rounded group"/g,
  'className="flex items-center justify-between p-0.5 rounded group"'
);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
