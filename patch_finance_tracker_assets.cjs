const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

const replacement1 = `  // Compute pending reimbursements from client
  const pendingReimbursementsBalance = useMemo(() => {
    let balance = 0;
    records.forEach(rec => {
      if (rec.isReceivableFromClient) {
        if (rec.type === 'expense') balance += rec.amount;
        else if (rec.type === 'income') balance -= rec.amount;
      }
    });
    return balance;
  }, [records]);

  // Compute Assets, Liabilities, and Net Worth
  const balanceSheetMetrics = useMemo(() => {
    let assetsSum = pendingReimbursementsBalance;
    let liabilitiesSum = 0;`;

code = code.replace(
  '  // Compute Assets, Liabilities, and Net Worth\n  const balanceSheetMetrics = useMemo(() => {\n    let assetsSum = 0;\n    let liabilitiesSum = 0;',
  replacement1
);

const replacement2 = `  const { assets, liabilities } = useMemo(() => {
    const assList: PaymentAccount[] = [];
    const liabList: PaymentAccount[] = [];
    paymentAccounts.forEach(acc => {
      const info = getAccountTypeInfo(acc.type);
      if (info.isAsset) {
        assList.push(acc);
      } else {
        liabList.push(acc);
      }
    });
    
    // Add virtual asset for Pending Reimbursements
    if (pendingReimbursementsBalance > 0 || pendingReimbursementsBalance < 0) {
      assList.push({
        id: 'virtual_pending_reimbursements',
        name: 'Pending Reimbursements (Client)',
        type: 'other_asset',
        openingBalance: pendingReimbursementsBalance,
        createdAt: 0
      });
    }

    return { assets: assList, liabilities: liabList };
  }, [paymentAccounts, pendingReimbursementsBalance]);`;

code = code.replace(
  '  const { assets, liabilities } = useMemo(() => {\n    const assList: PaymentAccount[] = [];\n    const liabList: PaymentAccount[] = [];\n    paymentAccounts.forEach(acc => {\n      const info = getAccountTypeInfo(acc.type);\n      if (info.isAsset) {\n        assList.push(acc);\n      } else {\n        liabList.push(acc);\n      }\n    });\n    return { assets: assList, liabilities: liabList };\n  }, [paymentAccounts]);',
  replacement2
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
