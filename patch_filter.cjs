const fs = require('fs');
const content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const target = `    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      baseTodos = baseTodos.filter(t => 
        t.title.toLowerCase().includes(lowerQuery) || 
        (t.description && t.description.toLowerCase().includes(lowerQuery))
      );
    }`;

const replacement = `    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      baseTodos = baseTodos.filter(t => 
        t.title.toLowerCase().includes(lowerQuery) || 
        (t.description && t.description.toLowerCase().includes(lowerQuery))
      );
    }
    
    if (sidebarSelectedTag) {
      baseTodos = baseTodos.filter(t => t.tags && t.tags.includes(sidebarSelectedTag));
    }`;

const updated = content.replace(target, replacement);
fs.writeFileSync('src/components/WorkspaceApp.tsx', updated);
