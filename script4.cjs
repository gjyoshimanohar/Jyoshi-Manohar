const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');
content = content.replace(/<span>Projects<\/span>/g, '<span>Projects</span>\n\t\t\t\t\t\t\t<button onClick={() => setIsAddingProject(true)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 transition-colors hidden group-hover:block" title="Add Project"><Plus className="w-3.5 h-3.5" /></button>');
fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
