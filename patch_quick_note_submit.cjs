const fs = require('fs');
const content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const target = `  const handleCreateTask = async (e: React.FormEvent) => {`;
const replacement = `  const handleQuickNoteSubmit = async (e?: React.FormEvent) => {
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
          order: Date.now()
        },
        auth.currentUser?.uid || ''
      );
      toast.success('Note saved to Inbox');
      setIsQuickNoteModalOpen(false);
      setQuickNoteTitle('');
    } catch (error) {
      toast.error('Failed to save note');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {`;

const updated = content.replace(target, replacement);
fs.writeFileSync('src/components/WorkspaceApp.tsx', updated);
