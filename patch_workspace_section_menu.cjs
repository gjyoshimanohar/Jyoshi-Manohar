const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

const t = `<div className="absolute right-0 mt-1 bg-white border-none rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] py-1 w-36 z-40 text-left">
 <button onClick={() => { setCollapsedKanbanColumns(prev => ({ ...prev, [sectionName]: true })); setActiveSectionMenu(null); }} className="w-full text-xs font-medium text-gray-700 hover:bg-gray-50 px-3 py-1.5 text-left block" > Minimize Column </button>
 <button onClick={() => { setEditingSectionNameInModal(sectionName); setNewSectionNameInput(sectionName); setIsSectionModalOpen(true); setActiveSectionMenu(null); }} className="w-full text-xs font-medium text-gray-700 hover:bg-gray-50 px-3 py-1.5 text-left block" > Edit Section Name </button>
 <button onClick={() => handleDeleteSection(sectionName)} className="w-full text-xs font-medium text-red-600 hover:bg-red-50 px-3 py-1.5 text-left block" > Delete Section </button>
</div>`;

const r = `<div className="absolute right-0 mt-1 bg-white border-none rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-1.5 w-36 z-40 text-left animate-in fade-in duration-100">
 <button onClick={() => { setCollapsedKanbanColumns(prev => ({ ...prev, [sectionName]: true })); setActiveSectionMenu(null); }} className="w-full text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-primary px-2.5 py-2 rounded-lg text-left block transition-colors" > Minimize Column </button>
 <button onClick={() => { setEditingSectionNameInModal(sectionName); setNewSectionNameInput(sectionName); setIsSectionModalOpen(true); setActiveSectionMenu(null); }} className="w-full text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-primary px-2.5 py-2 rounded-lg text-left block transition-colors" > Edit Section Name </button>
 <button onClick={() => handleDeleteSection(sectionName)} className="w-full text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 px-2.5 py-2 rounded-lg text-left block transition-colors" > Delete Section </button>
</div>`;

code = code.replace(t, r);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
