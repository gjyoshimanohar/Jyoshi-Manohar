const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

content = content.replace(
  /const \[showEmojiPicker, setShowEmojiPicker\] = useState\(false\);/g,
  "const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null);"
);

// 1. Folder
content = content.replace(
  /onClick=\{\(\) => setShowEmojiPicker\(!showEmojiPicker\)\}([\s\S]*?)<Smile className="w-3\.5 h-3\.5" \/>\s*<\/button>\s*<AnimatePresence>\s*\{showEmojiPicker && \(/,
  'onClick={() => setActiveEmojiPicker(activeEmojiPicker === "folder" ? null : "folder")}$1<Smile className="w-3.5 h-3.5" />\n                      </button>\n                      <AnimatePresence>\n                        {activeEmojiPicker === "folder" && ('
);
content = content.replace(
  /setNewFolderName\(prev => prev \+ emojiData\.emoji\);\s*setShowEmojiPicker\(false\);/g,
  'setNewFolderName(prev => prev + emojiData.emoji);\n                              setActiveEmojiPicker(null);'
);

// 2. Task (Add Task)
content = content.replace(
  /onClick=\{\(\) => setShowEmojiPicker\(!showEmojiPicker\)\}([\s\S]*?)<Smile className="w-4 h-4" \/>\s*<\/button>\s*<AnimatePresence>\s*\{showEmojiPicker && \(/,
  'onClick={() => setActiveEmojiPicker(activeEmojiPicker === "task" ? null : "task")}$1<Smile className="w-4 h-4" />\n                        </button>\n                        <AnimatePresence>\n                          {activeEmojiPicker === "task" && ('
);
content = content.replace(
  /setNewTaskTitle\(prev => prev \+ emojiData\.emoji\);\s*setShowEmojiPicker\(false\);/g,
  'setNewTaskTitle(prev => prev + emojiData.emoji);\n                                  setActiveEmojiPicker(null);'
);

// 3. Edit Todo
content = content.replace(
  /onClick=\{\(\) => setShowEmojiPicker\(!showEmojiPicker\)\}([\s\S]*?)<Smile className="w-4 h-4" \/>\s*<\/button>\s*<AnimatePresence>\s*\{showEmojiPicker && \(/,
  'onClick={() => setActiveEmojiPicker(activeEmojiPicker === `todo-${todo.id}` ? null : `todo-${todo.id}`)}$1<Smile className="w-4 h-4" />\n                                </button>\n                                <AnimatePresence>\n                                  {activeEmojiPicker === `todo-${todo.id}` && ('
);
content = content.replace(
  /todoService\.updateTodo\(todo\.id, \{ title: todo\.title \+ emojiData\.emoji \}\);\s*setShowEmojiPicker\(false\);/g,
  'todoService.updateTodo(todo.id, { title: todo.title + emojiData.emoji });\n                                          setActiveEmojiPicker(null);'
);

// 4. Add List Modal
content = content.replace(
  /onClick=\{\(\) => setShowEmojiPicker\(!showEmojiPicker\)\}([\s\S]*?)<Smile className="w-4 h-4" \/>\s*<\/button>\s*<AnimatePresence>\s*\{showEmojiPicker && \(/,
  'onClick={() => setActiveEmojiPicker(activeEmojiPicker === "project" ? null : "project")}$1<Smile className="w-4 h-4" />\n                          </button>\n                          <AnimatePresence>\n                            {activeEmojiPicker === "project" && ('
);
content = content.replace(
  /setNewProjectName\(prev => emojiData\.emoji \+ " " \+ prev\);\s*setShowEmojiPicker\(false\);/g,
  'setNewProjectName(prev => emojiData.emoji + " " + prev);\n                                  setActiveEmojiPicker(null);'
);

// 5. Add Folder in Modal
content = content.replace(
  /onClick=\{\(\) => setShowEmojiPicker\(!showEmojiPicker\)\}([\s\S]*?)<Smile className="w-3\.5 h-3\.5" \/>\s*<\/button>\s*<AnimatePresence>\s*\{showEmojiPicker && \(/,
  'onClick={() => setActiveEmojiPicker(activeEmojiPicker === "modal-folder" ? null : "modal-folder")}$1<Smile className="w-3.5 h-3.5" />\n                              </button>\n                              <AnimatePresence>\n                                {activeEmojiPicker === "modal-folder" && ('
);
content = content.replace(
  /setNewFolderNameInModal\(prev => emojiData\.emoji \+ " " \+ prev\);\s*setShowEmojiPicker\(false\);/g,
  'setNewFolderNameInModal(prev => emojiData.emoji + " " + prev);\n                                      setActiveEmojiPicker(null);'
);

fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
