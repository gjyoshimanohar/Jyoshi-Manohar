const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroFocus.tsx', 'utf8');

// Update auto-log logic
code = code.replace(
  /timesheetService\.createTimesheet\(\{\s*userId:\s*auth\.currentUser\.uid,\s*clientId:\s*selectedClientId,\s*clientName:\s*clientName,\s*durationMinutes:\s*25,\s*description:\s*description\.trim\(\)\s*\|\|\s*"Deep Focus Pomodoro Session",\s*status:\s*'pending',\s*billingRate:\s*hourlyRate\s*\}\)/g,
  `timesheetService.createTimesheet({
            userId: auth.currentUser.uid,
            clientId: selectedClientId || 'internal',
            clientName: clientName || 'Internal Task',
            durationMinutes: 25,
            description: description.trim() || "Deep Focus Pomodoro Session",
            status: 'pending',
            billingRate: hourlyRate,
            taskId: selectedTaskId || undefined,
            taskTitle: selectedTaskId ? todos.find(t => t.id === selectedTaskId)?.title : undefined
          })`
);

// Update manual log logic
code = code.replace(
  /await timesheetService\.createTimesheet\(\{\s*userId:\s*auth\.currentUser\.uid,\s*clientId:\s*selectedClientId,\s*clientName:\s*clientName,\s*durationMinutes:\s*minutes,\s*description:\s*description\.trim\(\)\s*\|\|\s*"Consulting & Retainer Services",\s*status:\s*'pending',\s*billingRate:\s*hourlyRate\s*\}\)/g,
  `await timesheetService.createTimesheet({
        userId: auth.currentUser.uid,
        clientId: selectedClientId || 'internal',
        clientName: clientName || 'Internal Task',
        durationMinutes: minutes,
        description: description.trim() || "Consulting & Retainer Services",
        status: 'pending',
        billingRate: hourlyRate,
        taskId: selectedTaskId || undefined,
        taskTitle: selectedTaskId ? todos.find(t => t.id === selectedTaskId)?.title : undefined
      })`
);

// Change auto-log condition to allow just selectedTaskId
code = code.replace(
  /if \(auth\.currentUser && selectedClientId\) \{/g,
  `if (auth.currentUser && (selectedClientId || selectedTaskId)) {`
);

// Change manual log disabled to allow selectedTaskId
code = code.replace(
  /disabled=\{\!selectedClientId\}/g,
  `disabled={!selectedClientId && !selectedTaskId}`
);

fs.writeFileSync('src/components/PomodoroFocus.tsx', code);
