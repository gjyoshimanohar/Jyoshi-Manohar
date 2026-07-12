const fs = require('fs');
const content = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');
const target = `  const handleToggleStepCompleted = async (
    appId: string,
    stepIndex: number,
  ) => {
    try {
      const appToUpdate = applications.find((a) => a.id === appId);
      if (!appToUpdate || !appToUpdate.steps) return;

      const updatedSteps = appToUpdate.steps.map((s, idx) => {
        if (idx === stepIndex) {
          return { ...s, completed: !s.completed };
        }
        return s;
      });

      await updateDoc(doc(db, "applications", appId), {
        steps: updatedSteps,
        updatedAt: Date.now(),
      });`;

const replacement = `  const handleToggleStepCompleted = async (
    appId: string,
    stepIndex: number,
  ) => {
    try {
      const appToUpdate = applications.find((a) => a.id === appId);
      if (!appToUpdate || !appToUpdate.steps) return;

      let subtaskIdToToggle = null;
      let newCompletionStatus = false;
      const updatedSteps = appToUpdate.steps.map((s, idx) => {
        if (idx === stepIndex) {
          subtaskIdToToggle = s.subtaskId || s.id;
          newCompletionStatus = !s.completed;
          return { ...s, completed: newCompletionStatus };
        }
        return s;
      });

      await updateDoc(doc(db, "applications", appId), {
        steps: updatedSteps,
        updatedAt: Date.now(),
      });
      
      // Sync with task
      if (appToUpdate.taskId && subtaskIdToToggle) {
        try {
          const taskDoc = await getDocs(query(collection(db, "todos"), where("__name__", "==", appToUpdate.taskId)));
          if (!taskDoc.empty) {
            const taskData = taskDoc.docs[0].data();
            const currentSubtasks = taskData.subtasks || [];
            
            const updatedSubtasks = currentSubtasks.map(st => {
              if (st.id === subtaskIdToToggle) {
                return { ...st, completed: newCompletionStatus };
              }
              return st;
            });

            await updateDoc(doc(db, "todos", appToUpdate.taskId), {
              subtasks: updatedSubtasks
            });
          }
        } catch (err) {
          console.error("Failed to sync toggle step to task:", err);
        }
      }`;

const updated = content.replace(target, replacement);
fs.writeFileSync('src/pages/ClientDashboard.tsx', updated);
