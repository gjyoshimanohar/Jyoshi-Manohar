const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

content = content.replace(
  /await todoService\.createTodo\([\s\S]*?\}\s*\);/,
  `await todoService.createTodo(
        {
          title: quickNoteTitle.trim(),
          description: "",
          projectId: 'inbox',
          priority: 4,
          dueDate: undefined,
          deadline: undefined,
          tags: [],
          repeatInterval: null,
          order: Date.now(),
          completed: false
        }
      );`
);

fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
