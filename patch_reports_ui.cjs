const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroFocus.tsx', 'utf8');

const activeTrackersCode = `
          {/* Active / Real-Time Task Timers Section */}
          <div className="mb-10">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Active Task Timers</h3>
            {(() => {
              const tasksWithTime = todos.filter(t => (t.timeSpentSeconds || 0) > 0 || t.id === activeTimerTaskId);
              
              if (tasksWithTime.length === 0) {
                return (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    <p className="text-sm text-slate-400">No active real-time tracking sessions.</p>
                  </div>
                );
              }
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tasksWithTime.map(t => (
                    <div key={t.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={\`w-2 h-2 rounded-full shrink-0 \${t.completed ? 'bg-emerald-400' : 'bg-slate-300'}\`} />
                        <div>
                          <p className={\`text-sm font-bold truncate max-w-[200px] \${t.completed ? 'text-slate-400 line-through' : 'text-slate-800'}\`}>
                            {t.title}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {t.projectId ? (projects.find(p => p.id === t.projectId)?.name || 'Inbox') : 'Inbox'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeTimerTaskId === t.id && (
                          <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 shadow-sm animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        )}
                        <span className="text-sm font-black text-slate-700 font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {formatTimer((t.timeSpentSeconds || 0) + (activeTimerTaskId === t.id ? (activeTimerElapsed || 0) : 0))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4 mt-8">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Historical Logs</h3>
`;

code = code.replace(
  '            <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">',
  activeTrackersCode + '\n            <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">'
);

fs.writeFileSync('src/components/PomodoroFocus.tsx', code);
