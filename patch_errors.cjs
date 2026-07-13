const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

// Remove the redeclaration
content = content.replace(
  'const setKanbanSelectedTag = (val: any) => {};',
  ''
);

// Add the missing function
const target = 'const [quickNoteTitle, setQuickNoteTitle] = useState("");';
const replacement = `const [quickNoteTitle, setQuickNoteTitle] = useState("");

  const handleQuickNoteSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickNoteTitle.trim()) return;
    
    try {
      await todoService.createTodo(
        {
          title: quickNoteTitle.trim(),
          description: "",
          projectId: 'inbox',
          folderId: null,
          priority: 4,
          dueDate: undefined,
          deadline: undefined,
          tags: [],
          repeatInterval: null,
          clientId: null,
          order: Date.now(),
          completed: false
        },
        auth.currentUser?.uid || ''
      );
      toast.success('Note saved to Inbox');
      setIsQuickNoteModalOpen(false);
      setQuickNoteTitle('');
    } catch (error) {
      toast.error('Failed to save note');
    }
  };`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
