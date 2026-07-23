const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroFocus.tsx', 'utf8');

const returnStatement = `
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
`;

const newReturnStatement = `
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('timer')}
          className={\`pb-3 px-4 text-sm font-bold transition-colors border-b-2 \${activeTab === 'timer' ? 'text-[#1a2b58] border-[#1a2b58]' : 'text-slate-500 border-transparent hover:text-slate-700'}\`}
        >
          Focus Timer & Logs
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={\`pb-3 px-4 text-sm font-bold transition-colors border-b-2 \${activeTab === 'reports' ? 'text-[#1a2b58] border-[#1a2b58]' : 'text-slate-500 border-transparent hover:text-slate-700'}\`}
        >
          Timesheet Reports
        </button>
      </div>
      
      {activeTab === 'timer' ? (
`;

code = code.replace(returnStatement.trim(), newReturnStatement.trim());
fs.writeFileSync('src/components/PomodoroFocus.tsx', code);
