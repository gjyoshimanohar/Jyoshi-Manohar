const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

const submitTarget = `      if (editingRecord) {
        await financeService.updateRecord(editingRecord.id, transactionPayload);
      } else {
        await financeService.createRecord(transactionPayload);
      }`;
      
const submitReplacement = `      if (editingRecord) {
        await financeService.updateRecord(editingRecord.id, transactionPayload);
      } else {
        await financeService.createRecord(transactionPayload);
        
        if (formTitheApplicable && formType === "income" && formScope === "business" && formTitheAmount) {
           const titheAmt = parseFloat(formTitheAmount);
           if (!isNaN(titheAmt) && titheAmt > 0) {
             let tithesAcc = paymentAccounts.find(a => a.name === "Tithes and Offerings" && a.type === "other_liability");
             if (!tithesAcc) {
               tithesAcc = await financeService.createPaymentAccount({
                 name: "Tithes and Offerings",
                 type: "other_liability",
                 openingBalance: 0,
                 isEmiPayable: false,
                 emiAmount: 0,
                 emiDueDate: "1"
               });
             }
             
             await financeService.createRecord({
               type: "expense",
               category: "Tithes and Offerings",
               amount: titheAmt,
               description: \`Tithe Provision for: \${formDescription || "Inflow"}\`,
               date: formDate,
               status: "paid",
               clientName: "",
               clientId: "",
               scope: "business",
               paymentMode: "Transfer",
               paymentAccountId: tithesAcc.id,
               transferToAccountId: "",
               isReceivableFromClient: false
             });
           }
        }
      }`;

if (code.includes(submitTarget)) {
  code = code.replace(submitTarget, submitReplacement);
  fs.writeFileSync(file, code);
  console.log('Submit Patched successfully');
} else {
  console.log('Submit Target not found');
}
