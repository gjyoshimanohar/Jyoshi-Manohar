const fs = require('fs');
const content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const target = `const count = projectTodos.filter(t => t.tags && t.tags.includes(tag)).length;`;
const replacement = `const count = projectTodos.filter(t => !t.completed && t.tags && t.tags.includes(tag)).length;`;

let updated = content.replace(target, replacement);

const targetAll = `All ({projectTodos.length})`;
const replacementAll = `All ({projectTodos.filter(t => !t.completed).length})`;

updated = updated.replace(targetAll, replacementAll);

fs.writeFileSync('src/components/WorkspaceApp.tsx', updated);
