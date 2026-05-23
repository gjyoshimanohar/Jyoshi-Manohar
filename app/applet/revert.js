const fs = require('fs');
let s = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const revertedFunction = `const ensureTickTickBootstrap = async (uid: string) => {
 const bootstrappedKey = \`ticktick_bootstrapped_\${uid}\`;
 if (localStorage.getItem(bootstrappedKey)) return;

 setBootstrapping(true);
 try {
 // Create Study Folder
 const studyFolder = await todoService.createFolder("Study", uid);
 if (studyFolder) {
 // Research Items project (P3 blue)
 const research = await todoService.createProject("Research Items", "#3b82f6", uid, "Book");
 if (research) {
 await todoService.updateProject(research.id, { folderId: studyFolder.id });
 await todoService.createTodo({
 title: "Study research methodologies",
 userId: uid,
 completed: false,
 projectId: research.id,
 priority: 3,
 dueDate: Date.now(),
 tags: ["Research"],
 });
 }

 // CA Final project (P1 red/green bullet)
 const caFinal = await todoService.createProject("CA Final", "#22c55e", uid, "Award");
 if (caFinal) {
 await todoService.updateProject(caFinal.id, { folderId: studyFolder.id });
 
 await todoService.createTodo({
 title: "Audit Class/Study",
 userId: uid,
 completed: false,
 projectId: caFinal.id,
 priority: 1, // Red
 dueDate: Date.now(),
 tags: ["CAFinal"],
 });

 await todoService.createTodo({
 title: "AFM Class/Study",
 userId: uid,
 completed: false,
 projectId: caFinal.id,
 priority: 1, // Red
 dueDate: Date.now(),
 tags: ["CAFinal"],
 });

 await todoService.createTodo({
 title: "FR Class/Study",
 userId: uid,
 completed: false,
 projectId: caFinal.id,
 priority: 1, // Red
 dueDate: Date.now(),
 tags: ["CAFinal"],
 });
 }
 
 const spiritual = await todoService.createProject("Spiritual", "#d946ef", uid, "Heart");
 if (spiritual) {
 await todoService.updateProject(spiritual.id, { folderId: studyFolder.id });
 await todoService.createTodo({
 title: "Morning Meditation",
 userId: uid,
 completed: false,
 projectId: spiritual.id,
 priority: 4,
 dueDate: Date.now(),
 tags: ["Meditation"],
 });
 }
 }

 await todoService.createProject("Work", "#ef4444", uid, "Briefcase");
 await todoService.createProject("Exercise", "#eab308", uid, "Zap");

 await todoService.createTodo({
 title: "Welcome to your new workspace! Try creating a task.",
 userId: uid,
 completed: false,
 projectId: null, // Inbox
 priority: 4,
 dueDate: Date.now(),
 tags: ["Welcome"],
 });

 localStorage.setItem(bootstrappedKey, "true");
 } catch (err) {
 console.error("Failed to bootstrap data", err);
 } finally {
 setBootstrapping(false);
 }
};`;

s = s.replace(/const ensureTickTickBootstrap = async \(uid: string\) => \{\};/, revertedFunction);

fs.writeFileSync('src/components/WorkspaceApp.tsx', s, 'utf8');
console.log('Reverted ensureTickTickBootstrap successfully');
