const fs = require('fs');
const content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const target = `    </div>
  );
}`;

const replacement = `
      {/* Quick Capture FAB */}
      <button
        onClick={() => setIsQuickNoteModalOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-[100]"
        title="Quick Note to Inbox"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Quick Note Modal */}
      <AnimatePresence>
        {isQuickNoteModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans"
            >
              <div className="bg-[#1a2b58] text-white p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-white" />
                  <h3 className="font-semibold text-sm tracking-wide">Quick Capture to Inbox</h3>
                </div>
                <button 
                  onClick={() => setIsQuickNoteModalOpen(false)} 
                  className="text-gray-300 hover:text-white transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                <form 
                  onSubmit={handleQuickNoteSubmit}
                  className="space-y-4"
                >
                  <div>
                    <input
                      autoFocus
                      type="text"
                      placeholder="What's on your mind?..."
                      value={quickNoteTitle}
                      onChange={(e) => setQuickNoteTitle(e.target.value)}
                      className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 text-gray-900"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsQuickNoteModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!quickNoteTitle.trim()}
                      className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
                    >
                      Save to Inbox
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}`;

const updated = content.replace(target, replacement);
fs.writeFileSync('src/components/WorkspaceApp.tsx', updated);
