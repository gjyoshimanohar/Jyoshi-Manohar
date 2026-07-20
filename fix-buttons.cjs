const fs = require('fs');
let content = fs.readFileSync('/app/applet/src/components/FinanceTracker.tsx', 'utf-8');

const buttonsToMove = `
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 shadow-sm w-full sm:w-auto"
              title="Export Reports"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export</span>
            </button>
            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center justify-center space-x-1.5 bg-primary hover:bg-primary/90 text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 shadow-sm w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
`;

// Remove the buttons from their current place
content = content.replace(buttonsToMove, '');

// Put them in the header tabs row
const targetTabRow = `      {/* Finance Dimension Selector Tabs */}
      <div className="border-b border-slate-100 pb-px">
        <div className="flex space-x-6">`;

const newTabRow = `      {/* Finance Dimension Selector Tabs */}
      <div className="border-b border-slate-100 pb-px flex flex-wrap gap-4 items-center justify-between">
        <div className="flex space-x-6">`;

content = content.replace(targetTabRow, newTabRow);

// Now we need to insert the buttons after the tabs but inside the flex-wrap gap-4 items-center justify-between div
const tabRowEnd = `            <span>📊 Consolidated View</span>
          </button>
        </div>`;

const tabRowEndWithButtons = `            <span>📊 Consolidated View</span>
          </button>
        </div>
${buttonsToMove}
      `;

content = content.replace(tabRowEnd, tabRowEndWithButtons);

// Adding Floating Action Button (FAB)
const floatingButton = `
      {/* Floating Action Button */}
      <button
        onClick={() => handleOpenAddModal()}
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-50 p-4 bg-[#AD8D3E] hover:bg-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        title="Add Transaction"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};
`;

content = content.replace(/    <\/div>\n  \);\n};\n/g, floatingButton);

fs.writeFileSync('/app/applet/src/components/FinanceTracker.tsx', content);
console.log("File updated");
