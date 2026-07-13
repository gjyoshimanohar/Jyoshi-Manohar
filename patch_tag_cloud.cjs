const fs = require('fs');
const content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const target = `<div className="mt-12 border-t border-gray-200 pt-4">

            </div>
          </div>
        </motion.aside>
      </>
    )}
  </AnimatePresence>`;

const replacement = `<div className="mt-8 border-t border-gray-200 pt-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">
                <Tag className="w-3.5 h-3.5" />
                <span>Tag Cloud</span>
              </div>
              <div className="flex flex-wrap gap-1.5 px-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (sidebarSelectedTag === tag) {
                        setSidebarSelectedTag(null);
                      } else {
                        setSidebarSelectedTag(tag);
                        setViewMode('today');
                      }
                    }}
                    className={\`px-2.5 py-1 text-xs font-medium rounded-full transition-colors \${
                      sidebarSelectedTag === tag 
                        ? 'bg-[#1a2b58] text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }\`}
                  >
                    #{tag}
                  </button>
                ))}
                {allTags.length === 0 && (
                  <span className="text-xs text-gray-400 italic">No tags used yet</span>
                )}
              </div>
            </div>
          </div>
        </motion.aside>
      </>
    )}
  </AnimatePresence>`;

const updated = content.replace(target, replacement);
fs.writeFileSync('src/components/WorkspaceApp.tsx', updated);
