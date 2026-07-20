const fs = require('fs');
let content = fs.readFileSync('/app/applet/src/components/FinanceTracker.tsx', 'utf-8');

const floatingButton = `
      {/* Floating Action Button */}
      <button
        onClick={() => handleOpenAddModal()}
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[100] p-4 bg-[#AD8D3E] hover:bg-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        title="Add Transaction"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
`;

content = content.replace(/    <\/div>\n  \);\n}/g, floatingButton);

fs.writeFileSync('/app/applet/src/components/FinanceTracker.tsx', content);
console.log("File updated");
