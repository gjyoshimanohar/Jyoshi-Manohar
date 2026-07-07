const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

if (!code.includes("import ProfileDropdown")) {
  code = code.replace(
    "import CustomSelect from './CustomSelect';",
    "import CustomSelect from './CustomSelect';\nimport ProfileDropdown from './ProfileDropdown';"
  );
}

// In the sidebar, remove the logout/change password buttons, since they are redundant now.
const sidebarButtons = `<button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center space-x-2 p-2 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition-colors font-medium select-none justify-center border border-transparent mb-2 bg-slate-50">
                  <Key className="w-4 h-4 shrink-0" />
                  <span>Change Password</span>
                </button>
                <button onClick={handleLogout} className="w-full flex items-center space-x-2 p-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors font-medium select-none justify-center border border-transparent hover:border-red-100 shadow-sm bg-white">
 <LogOut className="w-4 h-4 shrink-0" />
 <span>Log out Account</span>
 </button>`;
if (code.includes(sidebarButtons)) {
  code = code.replace(sidebarButtons, "");
}

// Add the ProfileDropdown to the header
const headerMenuTripleDot = `{isHeaderMenuOpen && (
 <div className="absolute top-8 right-0 w-52 bg-white border-none rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] p-1.5 z-50 text-left scale-95 origin-top-right transition-transform animate-in fade-in duration-100">
 <div className="text-xs uppercase tracking-wider text-gray-400 px-2 py-1 border-b mb-1">List operations</div>
 <button 
 onClick={() => { setIsProgressBannerExpanded(!isProgressBannerExpanded); setIsHeaderMenuOpen(false); }}
 className="w-full text-left text-xs p-2 text-gray-700 hover:bg-gray-50 flex items-center rounded-lg"
 >
 <Target className="w-3.5 h-3.5 mr-2 text-gray-500" />
 {isProgressBannerExpanded ? 'Hide progress tracker' : 'Show progress tracker'}
 </button>
 <button 
 onClick={() => { handleTriggerSync(); setIsHeaderMenuOpen(false); }}
 className="w-full text-left text-xs p-2 text-gray-700 hover:bg-gray-50 flex items-center rounded-lg"
 >
 <RefreshCw className="w-3.5 h-3.5 mr-2 text-gray-500" />
 Force database sync
 </button>
 <button 
 onClick={async () => {
 const completedInView = allActiveViewTodos.filter(t => t.completed);
 for (const todo of completedInView) {
 await todoService.deleteTodo(todo.id);
 }
 setIsHeaderMenuOpen(false);
 setAutoProjectNotice("Cleared completed viewport tasks");
 setTimeout(() => setAutoProjectNotice(null), 3000);
 }}
 className="w-full text-left text-xs p-2 text-red-600 hover:bg-red-50 flex items-center rounded-lg font-medium"
 >
 <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" />
 Clear Completed
 </button>
 </div>
 )}
 </div>`;

if (code.includes(headerMenuTripleDot)) {
  code = code.replace(headerMenuTripleDot, headerMenuTripleDot + `\n <ProfileDropdown onLogout={handleLogout} onChangePassword={() => setShowPasswordModal(true)} className="ml-1" />`);
}

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
