const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let content = fs.readFileSync(file, 'utf8');

// We'll add the button next to Edit and Delete
const exportButtonAsset = `
                                  <button
                                    onClick={() => handleExportAccountLedger(acc)}
                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg transition-all shadow-2xs hover:scale-105 active:scale-95"
                                    title="Export Ledger"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>`;

const assetTarget = `title="Edit asset account"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>`;
content = content.replace(assetTarget, assetTarget + exportButtonAsset);

const exportButtonLiability = `
                              <button
                                onClick={() => handleExportAccountLedger(acc)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg transition-all shadow-2xs hover:scale-105 active:scale-95"
                                title="Export Ledger"
                              >
                                <Download className="w-4 h-4" />
                              </button>`;

const liabilityTarget = `title="Edit liability account"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>`;
content = content.replace(liabilityTarget, liabilityTarget + exportButtonLiability);

// Add the handleExportAccountLedger function
const functionToAdd = `
  const handleExportAccountLedger = (acc: PaymentAccount) => {
    let recordsToExport = records.filter(r => 
      (r.paymentAccountId === acc.id || r.transferToAccountId === acc.id) && 
      (r.status === 'paid' || r.type === 'transfer')
    );
    recordsToExport.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (recordsToExport.length === 0) {
      toast.error("No transactions available to export for this account.");
      return;
    }
    
    // Ask user or default to Excel? Let's just use the existing export format logic.
    if (exportFormat === "excel") {
      handleExportExcel(recordsToExport);
    } else {
      handleExportPDF(recordsToExport);
    }
  };
`;

const functionTarget = `// Export Excel of Filtered Records`;
content = content.replace(functionTarget, functionToAdd + '\n  ' + functionTarget);

fs.writeFileSync(file, content);
console.log("Patched!");
