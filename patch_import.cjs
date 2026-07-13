const fs = require('fs');
const content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const updated = content.replace(
  "Check, Trash2, Sun, Plus, GripVertical, Calendar as CalendarIcon, Inbox,",
  "Check, Trash2, Sun, Plus, GripVertical, Calendar as CalendarIcon, Inbox, Tag,"
);
fs.writeFileSync('src/components/WorkspaceApp.tsx', updated);
