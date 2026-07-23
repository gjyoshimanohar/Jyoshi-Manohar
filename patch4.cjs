const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroFocus.tsx', 'utf8');

code = code.replace("import { collection, onSnapshot } from 'firebase/firestore';", "import { isToday, isThisWeek, isThisMonth, format } from 'date-fns';\nimport { collection, onSnapshot } from 'firebase/firestore';");

const endStatement = `
      </div>
    </div>
  );
}
`;

const newEndStatement = `
      </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Timesheet Reports</h2>
              <p className="text-xs text-slate-500">Track and analyze time spent on tasks</p>
            </div>
            
            <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <button 
                onClick={() => setReportDateRange('today')}
                className={\`px-3 py-1.5 text-xs font-bold rounded-lg transition-all \${reportDateRange === 'today' ? 'bg-white text-[#1a2b58] shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
              >Today</button>
              <button 
                onClick={() => setReportDateRange('week')}
                className={\`px-3 py-1.5 text-xs font-bold rounded-lg transition-all \${reportDateRange === 'week' ? 'bg-white text-[#1a2b58] shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
              >This Week</button>
              <button 
                onClick={() => setReportDateRange('month')}
                className={\`px-3 py-1.5 text-xs font-bold rounded-lg transition-all \${reportDateRange === 'month' ? 'bg-white text-[#1a2b58] shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
              >This Month</button>
              <button 
                onClick={() => setReportDateRange('all')}
                className={\`px-3 py-1.5 text-xs font-bold rounded-lg transition-all \${reportDateRange === 'all' ? 'bg-white text-[#1a2b58] shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
              >All Time</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-2">Task / Description</th>
                  <th className="pb-3 px-2">Client / Project</th>
                  <th className="pb-3 px-2 text-right">Time Spent (Minutes)</th>
                  <th className="pb-3 px-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {timesheets.filter(log => {
                  const date = new Date(log.createdAt);
                  if (reportDateRange === 'today') return isToday(date);
                  if (reportDateRange === 'week') return isThisWeek(date);
                  if (reportDateRange === 'month') return isThisMonth(date);
                  return true;
                }).reduce((acc, log) => {
                  // If grouping is needed, we could do it here. For now, flat list.
                  acc.push(log);
                  return acc;
                }, [] as TimesheetLog[]).map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-700 text-sm">{log.taskTitle || log.description || 'General Work'}</div>
                      {log.taskTitle && log.description && log.description !== \`Working on: \${log.taskTitle}\` && (
                        <div className="text-xs text-slate-500">{log.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-xs text-slate-600 font-medium">
                        {log.clientName === 'Internal Task' ? 'Internal' : log.clientName}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg">
                        {log.durationMinutes}m
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-xs text-slate-500">
                      {format(new Date(log.createdAt), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
                
                {/* Aggregate Row */}
                {timesheets.filter(log => {
                  const date = new Date(log.createdAt);
                  if (reportDateRange === 'today') return isToday(date);
                  if (reportDateRange === 'week') return isThisWeek(date);
                  if (reportDateRange === 'month') return isThisMonth(date);
                  return true;
                }).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                      No timesheets found for this period.
                    </td>
                  </tr>
                ) : (
                  <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                    <td colSpan={2} className="py-4 px-2 text-right text-slate-700">Total Time Spent:</td>
                    <td className="py-4 px-2 text-right text-indigo-700">
                      {timesheets.filter(log => {
                        const date = new Date(log.createdAt);
                        if (reportDateRange === 'today') return isToday(date);
                        if (reportDateRange === 'week') return isThisWeek(date);
                        if (reportDateRange === 'month') return isThisMonth(date);
                        return true;
                      }).reduce((sum, log) => sum + log.durationMinutes, 0)}m
                    </td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
`;

code = code.replace(endStatement, newEndStatement);
fs.writeFileSync('src/components/PomodoroFocus.tsx', code);
