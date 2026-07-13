const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

content = content.replace(
  'const kanbanSelectedTag: string | null = null;',
  'const [kanbanSelectedTag, setKanbanSelectedTag] = useState<string | null>(null);'
);

fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
