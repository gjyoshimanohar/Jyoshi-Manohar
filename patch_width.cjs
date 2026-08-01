const fs = require('fs');

function replaceWidths(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  code = code.replace(/w-\[98%\] mx-auto px-2 sm:px-4 lg:px-6/g, 'w-full px-2 sm:px-4 md:px-6 lg:px-8');
  code = code.replace(/w-\[98%\] mx-auto px-6/g, 'w-full px-4 md:px-6 lg:px-8');
  fs.writeFileSync(filePath, code);
  console.log(`Patched ${filePath}`);
}

replaceWidths('src/pages/ClientDashboard.tsx');
replaceWidths('src/pages/Admin.tsx');
replaceWidths('src/components/WorkspaceApp.tsx');
