import fs from 'fs';
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

content = content.replace(/\{renderHighlightedTitle\(todo\.title, todo\.repeatInterval\)\}/g, '{todo.title}');

fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
