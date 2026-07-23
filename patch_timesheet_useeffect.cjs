const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

const newEffect = `
  // TIMESHEET LISTENER
  useEffect(() => {
    if (!user || !isAdmin) return;
    const unsubscribe = timesheetService.subscribeToUserTimesheets(user.uid, (logs) => {
      setTimesheets(logs);
    });
    return () => unsubscribe();
  }, [user, isAdmin]);

`;

code = code.replace(
  '// Real-time listener for Chat messages',
  newEffect + '// Real-time listener for Chat messages'
);

fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
