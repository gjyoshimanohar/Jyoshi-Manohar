const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetAdd = `    setFormCustomClientName("");
    setFormIsReceivableFromClient(false);
    setFormPaymentMode("Cash");`;
const replacementAdd = `    setFormCustomClientName("");
    setFormIsReceivableFromClient(false);
    setFormTitheApplicable(false);
    setFormTitheAmount("");
    setFormPaymentMode("Cash");`;

code = code.replace(targetAdd, replacementAdd);
fs.writeFileSync(file, code);
console.log('Fixed add state');
