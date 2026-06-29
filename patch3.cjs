const fs = require('fs');
let c = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');
const target = ` // Bootstrap hook if data are empty after load completes
 useEffect(() => {
 if (loading || !auth.currentUser || bootstrapping) return;
 if (projects.length === 0 && folders.length === 0) {
 ensureTickTickBootstrap(auth.currentUser.uid);
 }
 }, [loading, projects.length, folders.length, auth.currentUser]);`;

const injected = ` // Bootstrap hook if data are empty after load completes
 useEffect(() => {
 if (loading || !auth.currentUser || bootstrapping) return;
 if (projects.length === 0 && folders.length === 0) {
 ensureTickTickBootstrap(auth.currentUser.uid);
 }
 }, [loading, projects.length, folders.length, auth.currentUser]);

 // Keep track of tasks we've already notified about in this session
 const notifiedTaskIds = useRef<Set<string>>(new Set());

 // Ask for notification permission on mount
 useEffect(() => {
 if ("Notification" in window && Notification.permission === "default") {
 Notification.requestPermission().catch(console.error);
 }
 }, []);

 // Check for upcoming or reached due dates
 useEffect(() => {
 if (!("Notification" in window) || Notification.permission !== "granted") return;

 const checkReminders = () => {
 const now = Date.now();
 todos.forEach((todo) => {
 if (!todo.completed && todo.dueDate && !notifiedTaskIds.current.has(todo.id)) {
 // Trigger notification if due date is reached or approaching (e.g., within 30 minutes)
 const timeUntilDue = todo.dueDate - now;
 // Notify if it's within 30 minutes from now, up to 1 day overdue
 if (timeUntilDue > -86400000 && timeUntilDue <= 30 * 60 * 1000) {
 try {
 new Notification("Task Reminder", {
 body: \`The task "\${todo.title}" is due \${timeUntilDue <= 0 ? 'now' : 'soon'}.\`,
 });
 notifiedTaskIds.current.add(todo.id);
 } catch (e) {
 console.error("Error showing notification:", e);
 }
 }
 }
 });
 };

 // Check immediately and then every minute
 checkReminders();
 const interval = setInterval(checkReminders, 60000);
 return () => clearInterval(interval);
 }, [todos]);`;

c = c.replace(target, injected);
fs.writeFileSync('src/components/WorkspaceApp.tsx', c);
console.log('Replaced');
