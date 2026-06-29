const { execSync } = require('child_process');
try {
  console.log(execSync('git status').toString());
  execSync('git restore src/pages/ClientDashboard.tsx');
  console.log('Restored!');
} catch (e) {
  console.error(e.message);
}
