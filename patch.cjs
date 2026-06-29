const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const target = `  <div className="flex items-center space-x-1 w-full cursor-pointer" onClick={() => toggleFolder(folder.id)}>
  <ChevronDown className={\`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform \${expandedFolders.includes(folder.id) ? '' : '-rotate-90'}\`} />
  <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
  <span className="text-xs text-gray-700 font-medium truncate max-w-[120px]">{folder.name}</span>
  {getFolderPendingCount(folder.id) > 0 && (
  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-1 py-0.2 rounded-full">
  {getFolderPendingCount(folder.id)}
  </span>
  )}
  </div>`;

const replacement = `  <div className="flex items-center space-x-1 w-full cursor-pointer" onClick={() => {
    setViewMode('folder');
    setSelectedFolderId(folder.id);
    setSelectedProjectId(null);
    setIsAddingTask(false);
    setActiveAppTab('tasks');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }}>
  <div onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }} className="p-0.5 hover:bg-gray-200 rounded">
   <ChevronDown className={\`w-3.5 h-3.5 text-gray-400 hover:text-gray-600 shrink-0 transition-transform \${expandedFolders.includes(folder.id) ? '' : '-rotate-90'}\`} />
  </div>
  <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
  <span className={\`text-xs font-medium truncate max-w-[120px] \${viewMode === 'folder' && selectedFolderId === folder.id ? 'text-primary' : 'text-gray-700'}\`}>{folder.name}</span>
  {getFolderPendingCount(folder.id) > 0 && (
  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-1 py-0.2 rounded-full">
  {getFolderPendingCount(folder.id)}
  </span>
  )}
  </div>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
  console.log('Successfully patched folder click handler');
} else {
  console.log('Target string not found');
}
