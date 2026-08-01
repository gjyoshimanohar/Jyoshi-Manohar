const fs = require('fs');

function reducePadding(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  code = code.replace(/p-6 sm:p-8/g, 'p-4 sm:p-6');
  code = code.replace(/p-8 sm:p-12/g, 'p-6 sm:p-8');
  code = code.replace(/p-16/g, 'p-8 sm:p-12');
  code = code.replace(/p-8/g, 'p-5 sm:p-6');
  code = code.replace(/p-6/g, 'p-4 sm:p-5');
  fs.writeFileSync(filePath, code);
  console.log(`Patched ${filePath}`);
}

reducePadding('src/pages/ClientDashboard.tsx');
reducePadding('src/pages/Admin.tsx');
reducePadding('src/components/InteractiveTools.tsx');
