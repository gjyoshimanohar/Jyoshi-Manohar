const fs = require('fs');
let content = fs.readFileSync('src/components/GeneralLedger.tsx', 'utf8');

// Replace "      }\n      }\n      else if" with "      }\n      else if"
content = content.replace(
  "      }\n      }\n      else if (rec.type === 'journal'",
  "      }\n      else if (rec.type === 'journal'"
);

fs.writeFileSync('src/components/GeneralLedger.tsx', content);
