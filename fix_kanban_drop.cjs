const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const targetDropKanban = ` onDrop={(e) => {
 e.preventDefault();
 }}`;

const newDropKanban = ` onDrop={async (e) => {
 e.preventDefault();
 const id = e.dataTransfer.getData("text/plain");
 if (id) {
   setTodos(prev => prev.map(t => t.id === id ? { ...t, sectionName: sectionName === "Not Sectioned" ? null : sectionName } : t));
   await handleMoveTodoToSection(id, sectionName);
 }
 setDraggingOverSection(null);
 }}`;

content = content.replace(targetDropKanban, newDropKanban);
fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
