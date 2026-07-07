const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

code = code.replace(
  'const [formCustomClientName, setFormCustomClientName] = useState("");',
  'const [formCustomClientName, setFormCustomClientName] = useState("");\n  const [formIsReceivableFromClient, setFormIsReceivableFromClient] = useState(false);'
);

// We need to also add formIsReceivableFromClient to transactionPayload
code = code.replace(
  'transferToAccountId: formType === "transfer" ? formTransferToAccountId : ""\n    };',
  'transferToAccountId: formType === "transfer" ? formTransferToAccountId : "",\n      isReceivableFromClient: formIsReceivableFromClient\n    };'
);

// Reset formIsReceivableFromClient in handleOpenAddModal
code = code.replace(
  'setFormCustomClientName("");',
  'setFormCustomClientName("");\n    setFormIsReceivableFromClient(false);'
);

// Populate formIsReceivableFromClient in handleOpenEditModal
code = code.replace(
  'setFormCustomClientName(record.clientName || "");',
  'setFormCustomClientName(record.clientName || "");\n    setFormIsReceivableFromClient(record.isReceivableFromClient || false);'
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
