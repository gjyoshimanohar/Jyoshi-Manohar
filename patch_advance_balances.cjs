const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

const balanceCode = `  const totalPayables = pendingPayablesBalance;

  // Compute Client Advances
  const { totalAdvancesReceived, totalPaymentsFromAdvances, pendingAdvancesBalance } = useMemo(() => {
    let advances = 0;
    let payments = 0;
    records.forEach(rec => {
      if (rec.type === 'income' && rec.category === 'Advance Received') {
        advances += rec.amount;
      } else if (rec.type === 'expense' && rec.category === 'Payment from Advance') {
        payments += rec.amount;
      }
    });
    return {
      totalAdvancesReceived: advances,
      totalPaymentsFromAdvances: payments,
      pendingAdvancesBalance: advances - payments
    };
  }, [records]);`;

code = code.replace(
  "  const totalPayables = pendingPayablesBalance;",
  balanceCode
);

// Add to balanceSheetMetrics liabilitiesSum
// Actually, advance balance is a liability to the client.
// Wait, liabilitiesSum is currently 0 before the loop.
code = code.replace(
  "    let liabilitiesSum = 0;",
  "    let liabilitiesSum = pendingAdvancesBalance > 0 ? pendingAdvancesBalance : 0;\n    if (pendingAdvancesBalance < 0) assetsSum += Math.abs(pendingAdvancesBalance);"
);

// Add it to the virtual liabList
const liabAddCode = `
    // Add virtual liability for Pending Client Advances
    if (pendingAdvancesBalance > 0) {
      liabList.push({
        id: 'virtual_pending_advances',
        name: 'Client Advances (Unspent)',
        type: 'credit_card', // using credit_card just to put it in liabilities
        openingBalance: pendingAdvancesBalance,
        createdAt: 0
      });
    } else if (pendingAdvancesBalance < 0) {
       assList.push({
        id: 'virtual_overspent_advances',
        name: 'Overspent Client Advances',
        type: 'other_asset',
        openingBalance: Math.abs(pendingAdvancesBalance),
        createdAt: 0
      });
    }`;

code = code.replace(
  "    return { assets: assList, liabilities: liabList };",
  liabAddCode + "\n    return { assets: assList, liabilities: liabList };"
);

// Don't forget to update the dependency array of balance sheet useMemo
code = code.replace(
  "  }, [paymentAccounts, pendingReimbursementsBalance]);",
  "  }, [paymentAccounts, pendingReimbursementsBalance, pendingAdvancesBalance]);"
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
