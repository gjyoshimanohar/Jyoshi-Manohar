const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

const oldMenu = `<div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-1 text-xs">
   <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); setActiveProjectMenu(null); }}></div>
   <button onClick={(e) => { e.stopPropagation(); setActiveProjectMenu(null); setEditingProjectIdInModal(project.id); setNewProjectName(project.name); setListColor(project.color || '#1a2b58'); setListFolderId(project.folderId || 'none'); setListViewType(project.viewType || 'list'); setIsProjectModalOpen(true); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700">Edit</button>
   <button onClick={async (e) => { e.stopPropagation(); setActiveProjectMenu(null); await todoService.updateProject(project.id, { isPinned: !project.isPinned }); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700">{project.isPinned ? 'Unpin' : 'Pin'}</button>
   <button onClick={async (e) => { e.stopPropagation(); setActiveProjectMenu(null); await todoService.createProject(project.name + ' (Copy)', project.color, project.userId, project.icon, project.folderId, project.viewType, project.sections); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-50 text-gray-700">Duplicate</button>
   <button onClick={(e) => { e.stopPropagation(); setActiveProjectMenu(null); handleDeleteProject(project.id, e); }} className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600">Delete</button>
  </div>`;

const newMenu = `<div className="absolute right-0 top-full mt-1 w-36 bg-white border-none rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-1.5 z-50 text-xs animate-in fade-in duration-100">
   <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); setActiveProjectMenu(null); }}></div>
   <button onClick={(e) => { e.stopPropagation(); setActiveProjectMenu(null); setEditingProjectIdInModal(project.id); setNewProjectName(project.name); setListColor(project.color || '#1a2b58'); setListFolderId(project.folderId || 'none'); setListViewType(project.viewType || 'list'); setIsProjectModalOpen(true); }} className="w-full text-left px-2.5 py-2 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors">Edit</button>
   <button onClick={async (e) => { e.stopPropagation(); setActiveProjectMenu(null); await todoService.updateProject(project.id, { isPinned: !project.isPinned }); }} className="w-full text-left px-2.5 py-2 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors">{project.isPinned ? 'Unpin' : 'Pin'}</button>
   <button onClick={async (e) => { e.stopPropagation(); setActiveProjectMenu(null); await todoService.createProject(project.name + ' (Copy)', project.color, project.userId, project.icon, project.folderId, project.viewType, project.sections); }} className="w-full text-left px-2.5 py-2 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors">Duplicate</button>
   <button onClick={(e) => { e.stopPropagation(); setActiveProjectMenu(null); handleDeleteProject(project.id, e); }} className="w-full text-left px-2.5 py-2 hover:bg-red-50 text-red-600 rounded-lg font-medium transition-colors">Delete</button>
  </div>`;

code = code.replace(oldMenu, newMenu);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
