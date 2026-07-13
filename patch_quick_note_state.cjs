const fs = require('fs');
const content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const target = "const [searchQuery, setSearchQuery] = useState('');";
const replacement = `const [searchQuery, setSearchQuery] = useState('');
  const [isQuickNoteModalOpen, setIsQuickNoteModalOpen] = useState(false);
  const [quickNoteTitle, setQuickNoteTitle] = useState('');`;

const updated = content.replace(target, replacement);
fs.writeFileSync('src/components/WorkspaceApp.tsx', updated);
