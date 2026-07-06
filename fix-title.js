const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

content = content.replace(/(?<!value=)\{todo\.title\}/g, '{renderHighlightedTitle(todo.title, todo.repeatInterval)}');

fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
