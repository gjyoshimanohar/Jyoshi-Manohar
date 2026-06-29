const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const oldEditFolderBlock = `<form onSubmit={(e) => handleSaveEditFolder(folder.id, e)} className="flex items-center space-x-2 p-1 bg-white border border-gray-100 rounded-lg shadow-sm">
 <input
 type="text"
 autoFocus
 value={editFolderName}
 onChange={(e) => setEditFolderName(e.target.value)}
 className="text-xs px-2 py-1 border focus:border-primary focus:ring-1 focus:ring-primary rounded w-full outline-none text-black font-semibold"
 />
 <button type="submit" disabled={!editFolderName.trim()} className="text-white bg-primary p-1 rounded-md">
 <Check className="w-3.5 h-3.5" />
 </button>
 <button type="button" onClick={() => { setEditingFolderId(null); }} className="text-gray-400 hover:bg-gray-100 p-1 rounded-md">
 <X className="w-3.5 h-3.5" />
 </button>
 </form>`;

const newEditFolderBlock = `<form onSubmit={(e) => handleSaveEditFolder(folder.id, e)} className="flex items-center space-x-1 p-1 bg-white border border-gray-100 rounded-lg shadow-sm">
 <div className="relative flex-1">
 <input
 type="text"
 autoFocus
 value={editFolderName}
 onChange={(e) => setEditFolderName(e.target.value)}
 className="text-xs px-2 pr-7 py-1 border focus:border-primary focus:ring-1 focus:ring-primary rounded w-full outline-none text-black font-semibold"
 />
 <button
 type="button"
 onClick={() => setActiveEmojiPicker(activeEmojiPicker === \`edit-folder-\${folder.id}\` ? null : \`edit-folder-\${folder.id}\`)}
 className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 rounded-full"
 >
 <Smile className="w-3.5 h-3.5" />
 </button>
 <AnimatePresence>
 {activeEmojiPicker === \`edit-folder-\${folder.id}\` && (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="absolute left-0 top-full mt-2 z-[150] shadow-2xl"
 >
 <EmojiPicker
 onEmojiClick={(emojiData) => {
 setEditFolderName(prev => prev + emojiData.emoji);
 setActiveEmojiPicker(null);
 }}
 width={280}
 height={350}
 />
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 <button type="submit" disabled={!editFolderName.trim()} className="text-white bg-primary p-1 rounded-md shrink-0">
 <Check className="w-3.5 h-3.5" />
 </button>
 <button type="button" onClick={() => { setEditingFolderId(null); setActiveEmojiPicker(null); }} className="text-gray-400 hover:bg-gray-100 p-1 rounded-md shrink-0">
 <X className="w-3.5 h-3.5" />
 </button>
 </form>`;

content = content.replace(oldEditFolderBlock, newEditFolderBlock);
fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
