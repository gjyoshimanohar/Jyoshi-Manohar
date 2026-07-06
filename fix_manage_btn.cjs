const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

code = code.replace(
  /onClick=\{\(\) => \{\s*setCategoryManageType/g,
  'onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCategoryManageType'
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
