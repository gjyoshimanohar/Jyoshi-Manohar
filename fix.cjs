const fs = require('fs');
let text = fs.readFileSync('src/components/GeneralLedger.tsx', 'utf8');

text = text.replace(
  '      }\n      }\n        const resolveGLAccount = (id) => {',
  "      }\n      else if (rec.type === 'journal' && rec.transferToAccountId && rec.paymentAccountId) {\n        const resolveGLAccount = (id) => {"
);

fs.writeFileSync('src/components/GeneralLedger.tsx', text);
