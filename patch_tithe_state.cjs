const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

const stateTarget = `  const [formIsReceivableFromClient, setFormIsReceivableFromClient] = useState(false);`;
const stateReplacement = `  const [formIsReceivableFromClient, setFormIsReceivableFromClient] = useState(false);
  const [formTitheApplicable, setFormTitheApplicable] = useState(false);
  const [formTitheAmount, setFormTitheAmount] = useState("");`;

code = code.replace(stateTarget, stateReplacement);

const resetTargetAdd = `    setFormIsReceivableFromClient(false);
    setFormPaymentMode("Cash");`;
const resetReplacementAdd = `    setFormIsReceivableFromClient(false);
    setFormTitheApplicable(false);
    setFormTitheAmount("");
    setFormPaymentMode("Cash");`;

code = code.replace(resetTargetAdd, resetReplacementAdd);

const resetTargetEdit = `    setFormIsReceivableFromClient(rec.isReceivableFromClient || false);`;
// Wait, is there a setFormIsReceivableFromClient in handleOpenEditModal? Let's check.
