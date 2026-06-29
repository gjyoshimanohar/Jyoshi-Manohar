const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const targetProjectDiv = `<div className="flex items-center justify-between w-full group">
 <button
 onClick={() => { 
 setViewMode('project');`;

const newProjectDiv = `<div className="flex items-center justify-between w-full group">
 <button
 onDragOver={(e) => {
   if (e.dataTransfer.types.includes("text/plain")) {
     e.preventDefault();
   }
 }}
 onDrop={async (e) => {
   const taskId = e.dataTransfer.getData("text/plain");
   if (taskId) {
     e.preventDefault();
     setTodos(prev => prev.map(t => t.id === taskId ? { ...t, projectId: project.id, sectionName: null } : t));
     await todoService.updateTodo(taskId, { projectId: project.id, sectionName: null });
   }
 }}
 onClick={() => { 
 setViewMode('project');`;

content = content.replace(targetProjectDiv, newProjectDiv);
fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
