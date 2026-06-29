const fs = require('fs');
let c = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');
const target = `  // Bootstrap hook if data are empty after load completes
  useEffect(() => {
    if (loading || !auth.currentUser || bootstrapping) return;
    if (projects.length === 0 && folders.length === 0) {
      ensureTickTickBootstrap(auth.currentUser.uid);
    }
  }, [loading, projects.length, folders.length, auth.currentUser]);`;
const actualContent = c.split('\n').slice(585, 592).join('\n');
console.log(JSON.stringify(actualContent));
