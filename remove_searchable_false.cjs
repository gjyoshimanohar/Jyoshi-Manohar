const fs = require('fs');
for (const file of ['src/components/ResourceManager.tsx', 'src/components/GeneralLedger.tsx']) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/searchable=\{false\}/g, '');
  fs.writeFileSync(file, code);
}
console.log('Done');
