const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroFocus.tsx', 'utf8');

const oldTable = `<tbody className="divide-y divide-slate-50">
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
                }).length === 0 ? (`;

const newTable = `<tbody className="divide-y divide-slate-50">
                {Object.entries(timesheets.filter(log => {
                  const date = new Date(log.createdAt);
                  if (reportDateRange === 'today') return isToday(date);
                  if (reportDateRange === 'week') return isThisWeek(date);
                  if (reportDateRange === 'month') return isThisMonth(date);
                  return true;
                }).reduce((acc, log) => {
                  const key = log.taskTitle || log.description || 'General Work';
                  if (!acc[key]) {
                    acc[key] = {
                      taskTitle: key,
                      clientName: log.clientName,
                      totalMinutes: 0,
                      entries: []
                    };
                  }
                  acc[key].totalMinutes += log.durationMinutes;
                  acc[key].entries.push(log);
                  return acc;
                }, {} as Record<string, { taskTitle: string, clientName: string, totalMinutes: number, entries: TimesheetLog[] }>)).map(([key, group]) => (
                  <React.Fragment key={key}>
                    <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/20">
                      <td className="py-4 px-2">
                        <div className="font-bold text-slate-800 text-sm">{group.taskTitle}</div>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{group.entries.length} log sessions</div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="text-xs text-slate-600 font-medium">
                          {group.clientName === 'Internal Task' ? 'Internal' : group.clientName}
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className="inline-block px-3 py-1.5 bg-indigo-100 text-indigo-800 font-extrabold text-xs rounded-xl shadow-sm">
                          {group.totalMinutes}m
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right text-xs text-slate-500">
                        {/* Optionally show date range for group */}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                
                {/* Aggregate Row */}
                {timesheets.filter(log => {
                  const date = new Date(log.createdAt);
                  if (reportDateRange === 'today') return isToday(date);
                  if (reportDateRange === 'week') return isThisWeek(date);
                  if (reportDateRange === 'month') return isThisMonth(date);
                  return true;
                }).length === 0 ? (`;

code = code.replace(oldTable, newTable);
fs.writeFileSync('src/components/PomodoroFocus.tsx', code);
