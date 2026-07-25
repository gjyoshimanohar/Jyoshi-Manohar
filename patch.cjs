const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

content = content.replace(
  /\) : activeAdminTab === "resources" \? \(<ResourceManager \/>\) : \(/g,
  ') : ('
);

content = content.replace(
  /\) : \(\s*<FinanceTracker \/>/g,
  ') : activeAdminTab === "resources" ? (<ResourceManager />) : (\n          <FinanceTracker />'
);

fs.writeFileSync('src/pages/Admin.tsx', content);
