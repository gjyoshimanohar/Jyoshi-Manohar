const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

code = code.replace(
  '<PomodoroFocus todos={todos} />',
  '<PomodoroFocus todos={todos} projects={projects} activeTimerTaskId={activeTimerTaskId} activeTimerElapsed={activeTimerElapsed} />'
);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
