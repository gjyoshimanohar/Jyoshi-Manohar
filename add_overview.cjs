const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const targetStr = `{/* GROUP A: "Countdown"`;

const overviewStr = `
          {/* UPCOMING DEADLINES OVERVIEW DASHBOARD */}
          {viewMode === 'today' && (
            <div className="mb-6 bg-gradient-to-br from-[#1a2b58]/5 to-transparent border border-[#1a2b58]/10 rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 p-4 opacity-[0.03] text-[#1a2b58] pointer-events-none">
                <Target className="w-40 h-40" />
              </div>
              <h3 className="text-sm font-semibold text-[#1a2b58] mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                Upcoming Deadlines (Next 48 Hours)
              </h3>
              {(() => {
                const now = Date.now();
                const upcomingDeadlines = todos.filter(t => 
                  !t.completed && 
                  !t.deletedAt && 
                  t.dueDate && 
                  t.dueDate > now - 12 * 60 * 60 * 1000 && 
                  t.dueDate <= now + 48 * 60 * 60 * 1000
                ).sort((a, b) => a.dueDate! - b.dueDate!);
                
                if (upcomingDeadlines.length === 0) {
                  return <p className="text-xs text-gray-500 italic">No pressing deadlines in the next 48 hours.</p>;
                }
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 relative z-10">
                    {upcomingDeadlines.slice(0, 6).map(task => {
                      const proj = projects.find(p => p.id === task.projectId);
                      const isOverdue = task.dueDate! < now;
                      const hoursLeft = Math.max(0, Math.floor((task.dueDate! - now) / (1000 * 60 * 60)));
                      
                      return (
                        <div key={task.id} className="bg-white/80 backdrop-blur border border-white/50 p-3 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between min-h-[72px]" onClick={() => setSelectedTodoId(task.id)}>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-gray-900 truncate leading-tight" title={task.title}>{task.title}</span>
                            <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 \${isOverdue ? 'bg-red-100 text-red-600' : hoursLeft < 24 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}\`}>
                              {isOverdue ? 'Overdue' : hoursLeft === 0 ? '< 1h' : \`\${hoursLeft}h\`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                            {proj ? (
                              <>
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: proj.color || '#9ca3af' }} />
                                <span className="truncate max-w-[80px]" title={proj.name}>{proj.name}</span>
                                <span className="text-gray-300">•</span>
                              </>
                            ) : (
                              <>
                                <Inbox className="w-3 h-3 shrink-0 text-gray-400" />
                                <span>Inbox</span>
                                <span className="text-gray-300">•</span>
                              </>
                            )}
                            <span className="truncate flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3 opacity-70" />
                              {format(new Date(task.dueDate!), "MMM d, h:mm a")}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {upcomingDeadlines.length > 6 && (
                      <div className="flex items-center justify-center p-3 rounded-xl border border-dashed border-[#1a2b58]/20 bg-white/30 text-xs font-semibold text-[#1a2b58]/70 hover:text-[#1a2b58] cursor-pointer hover:bg-white/60 transition-colors h-full min-h-[72px]" onClick={() => setViewMode('upcoming')}>
                        +{upcomingDeadlines.length - 6} more deadlines
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* GROUP A: "Countdown"`;

content = content.replace(targetStr, overviewStr);
fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
