const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

const target = `  const { assets, liabilities } = useMemo(() => {
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
    return { assets: assList, liabilities: liabList };
  }, [paymentAccounts]);`;

const replacement = `  const { assets, liabilities } = useMemo(() => {
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
    if (pendingReimbursementsBalance !== 0) {
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

code = code.replace(target, replacement);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
