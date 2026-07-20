const fs = require('fs');
let content = fs.readFileSync('/app/applet/src/components/FinanceTracker.tsx', 'utf-8');

// Replace the start of the container
const startRe = /\{\/\* Dynamic Content Area \*\/\}\s*<div className="flex-grow w-full min-w-0 space-y-6">\s*\{\/\* Finance Dimension Selector Tabs \*\/\}\s*<div className="border-b border-slate-100 pb-px flex flex-wrap gap-4 items-center justify-between">\s*<div className="flex space-x-6">/;

const replaceStr = `{/* Dynamic Content Area */}
        <div className="flex-grow w-full min-w-0 space-y-6 relative">
          <div className="absolute -top-1 right-0 flex items-center gap-2 z-10 bg-white/80 backdrop-blur-sm pl-2 pb-1 rounded-bl-lg">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 shadow-sm"
              title="Export Reports"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => handleOpenAddModal()}
              className="flex items-center justify-center space-x-1.5 bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </button>
          </div>
      {/* Finance Dimension Selector Tabs */}
      <div className="border-b border-slate-100 pb-px flex overflow-x-auto scrollbar-none pr-[100px] sm:pr-[180px]">
        <div className="flex space-x-6 min-w-max">`;

content = content.replace(startRe, replaceStr);

// Find the end of the tabs and remove the old buttons
const oldButtonsRe = /<\/button>\s*<\/div>\s*<div className="flex items-center gap-2 w-full sm:w-auto justify-end">[\s\S]*?<span>Add<\/span>\s*<\/button>\s*<\/div>\s*<\/div>/;

const newButtonsStr = `</button>
        </div>
      </div>`;

content = content.replace(oldButtonsRe, newButtonsStr);

fs.writeFileSync('/app/applet/src/components/FinanceTracker.tsx', content);
console.log("Replaced");
