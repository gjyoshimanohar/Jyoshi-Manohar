const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

// For Edit Folder
content = content.replace(
  /setEditFolderName\(prev => prev \+ emojiData\.emoji\);\s*setActiveEmojiPicker\(null\);\s*\}\}\s*width=\{280\}/g,
  'setEditFolderName(prev => emojiData.emoji + " " + prev);\n                                          setActiveEmojiPicker(null);\n                                          }}\n                                          width={220}'
);

// For Add Folder
content = content.replace(
  /setNewFolderName\(prev => prev \+ emojiData\.emoji\);\s*setActiveEmojiPicker\(null\);\s*\}\}\s*width=\{280\}/g,
  'setNewFolderName(prev => emojiData.emoji + " " + prev);\n                                          setActiveEmojiPicker(null);\n                                          }}\n                                          width={220}'
);

fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
