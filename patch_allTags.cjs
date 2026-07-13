const fs = require('fs');
const content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const target = "const filteredTodos = getFilteredTodos();";
const replacement = `const allTags = React.useMemo(() => {
  const tagsSet = new Set<string>();
  todos.forEach(t => {
    if (t.tags) {
      t.tags.forEach(tag => tagsSet.add(tag));
    }
  });
  return Array.from(tagsSet).sort();
}, [todos]);

const filteredTodos = getFilteredTodos();`;

const updated = content.replace(target, replacement);
fs.writeFileSync('src/components/WorkspaceApp.tsx', updated);
