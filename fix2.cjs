const fs = require('fs');
let content = fs.readFileSync('src/components/GeneralLedger.tsx', 'utf8');

content = content.replace(
  '    });\n    });\n    // Calculate balances and sort',
  '    });\n    // Calculate balances and sort'
);

fs.writeFileSync('src/components/GeneralLedger.tsx', content);
