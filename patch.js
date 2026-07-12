const fs = require('fs');
const content = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');
const target = `      const appToUpdate = applications.find((a) => a.id === appId);
      if (!appToUpdate) return;
      const currentSteps = appToUpdate.steps || [];
      const updatedSteps = [
        ...currentSteps,
        {
          title: newStepTitle,
          description: newStepDesc || "Status verification log",
          date: newStepDate || "In Progress",
          completed: false,
        },
      ];
      await updateDoc(doc(db, "applications", appId), {
        steps: updatedSteps,
        updatedAt: Date.now(),
      });
      setNewStepTitle("");`;

const replacement = `      const appToUpdate = applications.find((a) => a.id === appId);
      if (!appToUpdate) return;

      const subtaskId = Math.random().toString(36).substring(2, 9);
      const newStep = {
        id: subtaskId,
        title: newStepTitle,
        description: newStepDesc || "Status verification log",
        date: newStepDate || "In Progress",
        completed: false,
        subtaskId: subtaskId,
      };

      const currentSteps = appToUpdate.steps || [];
      const updatedSteps = [
        ...currentSteps,
        newStep,
      ];

      await updateDoc(doc(db, "applications", appId), {
        steps: updatedSteps,
        updatedAt: Date.now(),
      });

      // Sync with task
      if (appToUpdate.taskId) {
        try {
          const taskDoc = await getDocs(query(collection(db, "todos"), where("__name__", "==", appToUpdate.taskId)));
          if (!taskDoc.empty) {
            const taskData = taskDoc.docs[0].data();
            const currentSubtasks = taskData.subtasks || [];
            await updateDoc(doc(db, "todos", appToUpdate.taskId), {
              subtasks: [...currentSubtasks, {
                id: subtaskId,
                title: newStepTitle,
                completed: false
              }]
            });
          }
        } catch (err) {
          console.error("Failed to sync new step to task:", err);
        }
      }

      setNewStepTitle("");`;

const updated = content.replace(target, replacement);
fs.writeFileSync('src/pages/ClientDashboard.tsx', updated);
