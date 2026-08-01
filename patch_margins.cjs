const fs = require('fs');

function replaceMargins(filePath, oldClass, newClass) {
  let code = fs.readFileSync(filePath, 'utf8');
  if (code.includes(oldClass)) {
    code = code.replace(oldClass, newClass);
    fs.writeFileSync(filePath, code);
    console.log(`Patched ${filePath}`);
  } else {
    console.log(`Could not find "${oldClass}" in ${filePath}`);
  }
}

replaceMargins('src/pages/ClientDashboard.tsx', 'pt-28 pb-20', 'pt-24 pb-12');
replaceMargins('src/pages/Admin.tsx', 'pt-32 pb-24', 'pt-24 pb-12');
replaceMargins('src/components/WorkspaceApp.tsx', 'pb-24 md:pb-6', 'pb-12 md:pb-4');
replaceMargins('src/components/WorkspaceApp.tsx', 'px-6 py-5 md:py-6', 'px-6 py-3 md:py-4');
