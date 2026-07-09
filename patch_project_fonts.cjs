const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

const projStr = "className={`flex-grow flex items-center justify-between px-1 py-0.5 rounded-lg text-xs transition-colors ${viewMode === 'project' && selectedProjectId === project.id && activeAppTab === 'tasks' ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}";
const projRep = "className={`flex-grow flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'project' && selectedProjectId === project.id && activeAppTab === 'tasks' ? 'bg-[#FFEFEE] text-primary shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}";

code = code.replace(projStr, projRep);

const tagStr = "className={`flex-grow flex items-center justify-between px-1 py-0.5 rounded-lg text-xs transition-colors ${viewMode === 'tags' && sidebarSelectedTag === tag ? 'bg-[#FFEFEE] text-primary font-medium' : 'hover:bg-gray-100 text-[#202020]'}`}";
const tagRep = "className={`flex-grow flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'tags' && sidebarSelectedTag === tag ? 'bg-[#FFEFEE] text-primary shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`}";

code = code.replace(tagStr, tagRep);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
