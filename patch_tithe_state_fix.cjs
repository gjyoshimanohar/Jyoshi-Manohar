const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

const stateTarget = `  const [formIsReceivableFromClient, setFormIsReceivableFromClient] = useState(false);`;
const stateReplacement = `  const [formIsReceivableFromClient, setFormIsReceivableFromClient] = useState(false);
  const [formTitheApplicable, setFormTitheApplicable] = useState(false);
  const [formTitheAmount, setFormTitheAmount] = useState("");`;

code = code.replace(stateTarget, stateReplacement);
fs.writeFileSync(file, code);
console.log('Fixed state');
