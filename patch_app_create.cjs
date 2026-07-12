const fs = require('fs');
const content = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');
const target = `        steps: [
          {
            title: "Application Created",
            description: "CA Jyoshi Manohar initialized the tax filing process",
            date: new Date().toLocaleDateString(),
            completed: true,
          },
          {
            title: "Internal Verification",
            description: newAppStep || "Awaiting document verification",
            date: "In Progress",
            completed: false,
          },
        ],`;

const replacement = `        steps: [
          {
            id: 'step1_' + Math.random().toString(36).substr(2, 9),
            title: "Application Created",
            description: "CA Jyoshi Manohar initialized the tax filing process",
            date: new Date().toLocaleDateString(),
            completed: true,
            subtaskId: 'step1_' + Math.random().toString(36).substr(2, 9),
          },
          {
            id: 'step2_' + Math.random().toString(36).substr(2, 9),
            title: "Internal Verification",
            description: newAppStep || "Awaiting document verification",
            date: "In Progress",
            completed: false,
            subtaskId: 'step2_' + Math.random().toString(36).substr(2, 9),
          },
        ],`;

const target2 = `        const taskRef = await addDoc(collection(db, "todos"), {
          title: \`Service Engagement: \${newAppTitle}\`,
          description: newAppDesc || \`Service engagement tracker for client. Status: \${newAppStatus}\`,
          completed: false,
          userId: taskUserId,
          projectId: targetProjectId,
          priority: 2,
          dueDate: appDueDate,
          clientId: targetClient,
          clientName: clientName,
          createdAt: Date.now()
        });`;

const replacement2 = `        const taskRef = await addDoc(collection(db, "todos"), {
          title: \`Service Engagement: \${newAppTitle}\`,
          description: newAppDesc || \`Service engagement tracker for client. Status: \${newAppStatus}\`,
          completed: false,
          userId: taskUserId,
          projectId: targetProjectId,
          priority: 2,
          dueDate: appDueDate,
          clientId: targetClient,
          clientName: clientName,
          createdAt: Date.now(),
          subtasks: newApp.steps.map(s => ({
            id: s.subtaskId || s.id,
            title: s.title,
            completed: s.completed
          }))
        });`;

let updated = content.replace(target, replacement);
updated = updated.replace(target2, replacement2);
fs.writeFileSync('src/pages/ClientDashboard.tsx', updated);
