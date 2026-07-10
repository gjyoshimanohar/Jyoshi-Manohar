const { execSync } = require('child_process');
try {
  execSync('npm run lint', {stdio: 'inherit'});
} catch (e) {
  // error
}
