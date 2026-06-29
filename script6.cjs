const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

content = content.replace(/z-50 shadow-2xl/g, 'z-[150] shadow-2xl');

content = content.replace(
  /className="bg-white rounded-3xl shadow-2xl border border-gray-150 max-w-xl w-full flex flex-col overflow-visible text-left"/g,
  'className="bg-white rounded-[24px] shadow-2xl border border-gray-150 max-w-md w-full flex flex-col overflow-visible text-left"'
);

content = content.replace(
  /className="flex-1 p-6 md:p-8 flex flex-col justify-between"/g,
  'className="p-6 md:p-8 flex flex-col"'
);

fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
