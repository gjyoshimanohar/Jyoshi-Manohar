const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const targetEffect = `  const handleInlineEditKeyDown = (e) => {`;

const effectAndHandlers = `  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimerTaskId && activeTimerStartTime) {
      interval = setInterval(() => {
        setActiveTimerElapsed(Math.floor((Date.now() - activeTimerStartTime) / 1000));
      }, 1000);
    } else {
      setActiveTimerElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeTimerTaskId, activeTimerStartTime]);

  const handleStartTimer = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTimerTaskId) {
      handleStopTimer();
    }
    setActiveTimerTaskId(taskId);
    const now = Date.now();
    setActiveTimerStartTime(now);
    localStorage.setItem("activeTimerTaskId", taskId);
    localStorage.setItem("activeTimerStartTime", now.toString());
  };

  const handleStopTimer = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activeTimerTaskId && activeTimerStartTime) {
      const elapsed = Math.floor((Date.now() - activeTimerStartTime) / 1000);
      const todoToUpdate = todos.find((t) => t.id === activeTimerTaskId);
      if (todoToUpdate) {
        todoService.updateTodo(todoToUpdate.id, {
          timeSpentSeconds: (todoToUpdate.timeSpentSeconds || 0) + elapsed
        });
      }
    }
    setActiveTimerTaskId(null);
    setActiveTimerStartTime(null);
    setActiveTimerElapsed(0);
    localStorage.removeItem("activeTimerTaskId");
    localStorage.removeItem("activeTimerStartTime");
  };

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return \`\${h}h \${m}m \${s}s\`;
    if (m > 0) return \`\${m}m \${s}s\`;
    return \`\${s}s\`;
  };

  const handleInlineEditKeyDown = (e) => {`;

code = code.replace(targetEffect, effectAndHandlers);
fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
