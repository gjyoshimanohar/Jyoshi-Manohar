const fs = require('fs');
let content = fs.readFileSync('src/components/GeneralLedger.tsx', 'utf8');

// The issue is whitespace matching
content = content.replace(
  /\s*\}\);\s*else if \(rec\.type === 'journal'/,
  "      }\n      else if (rec.type === 'journal'"
);

content = content.replace(
  /toAcc\.totalDebit \+= rec\.amount;\n\s*\}\n\s*\}/,
  "toAcc.totalDebit += rec.amount;\n        }\n      }\n    });"
);

fs.writeFileSync('src/components/GeneralLedger.tsx', content);
