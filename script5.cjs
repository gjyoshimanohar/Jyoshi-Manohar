const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

content = content.replace(
  /className="bg-white rounded-3xl shadow-2xl border border-gray-150 max-w-\[850px\] w-full flex flex-col md:flex-row overflow-hidden text-left"/g,
  'className="bg-white rounded-3xl shadow-2xl border border-gray-150 max-w-xl w-full flex flex-col overflow-visible text-left"'
);

// Emoji replacements
content = content.replace(
  /setNewProjectName\(prev => prev \+ emojiData\.emoji\);/g,
  'setNewProjectName(prev => emojiData.emoji + " " + prev);'
);

content = content.replace(
  /setNewFolderNameInModal\(prev => prev \+ emojiData\.emoji\);/g,
  'setNewFolderNameInModal(prev => emojiData.emoji + " " + prev);'
);

// Z-index fixes for dropdowns
// There are 3 CustomSelects in this modal.
let zIndices = [60, 50, 40];
let i = 0;
content = content.replace(/<div className="relative flex-1 max-w-\[280px\] group">/g, (match) => {
  if (i < 3) {
    return `<div className="relative flex-1 max-w-[280px] group z-[${zIndices[i++]}]">`;
  }
  return match;
});

// Remove right panel
const rightPanelStart = content.indexOf('{/* Right Panel: Stunning Interactive Mock Preview */}');
if (rightPanelStart !== -1) {
  const rightPanelEnd = content.indexOf('</AnimatePresence>', rightPanelStart);
  if (rightPanelEnd !== -1) {
    const endHTML = '          </motion.div>\n        </div>\n      )}\n    </AnimatePresence>';
    content = content.substring(0, rightPanelStart) + endHTML + content.substring(rightPanelEnd + 18);
  }
}

fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
