const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetEdit = `    setFormClientId(rec.clientId || "");
    setFormCustomClientName(rec.clientName || "");
    setFormPaymentMode(rec.paymentMode || "Cash");`;
const repEdit = `    setFormClientId(rec.clientId || "");
    setFormCustomClientName(rec.clientName || "");
    setFormIsReceivableFromClient(rec.isReceivableFromClient || false);
    setFormTitheApplicable(false);
    setFormTitheAmount("");
    setFormPaymentMode(rec.paymentMode || "Cash");`;

code = code.replace(targetEdit, repEdit);
fs.writeFileSync(file, code);
