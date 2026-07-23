const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

const targetStr = '                  </div>\n\n                  {/* Main Body Columns */}';

const newStr = `                  </div>

                  {/* TIME REPORTS SECTION */}
                  <div className="bg-white border border-slate-100/60 rounded-3xl p-6 sm:p-8 shadow-sm text-left relative overflow-hidden group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100/60 pb-4 mb-6 gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-primary tracking-tight flex items-center gap-1.5">
                          <Clock className="h-4.5 w-4.5 text-indigo-600" />
                          <span>Time Reports &amp; Timesheets</span>
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">
                          Aggregated breakdown of consultant time logged across tasks and clients.
                        </p>
                      </div>
                      <div className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
                        <button 
                          onClick={() => setTimeReportFilter('week')}
                          className={\`px-3 py-1.5 text-xs font-bold rounded-lg transition-all \${timeReportFilter === 'week' ? 'bg-white text-[#1a2b58] shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                        >Week</button>
                        <button 
                          onClick={() => setTimeReportFilter('month')}
                          className={\`px-3 py-1.5 text-xs font-bold rounded-lg transition-all \${timeReportFilter === 'month' ? 'bg-white text-[#1a2b58] shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                        >Month</button>
                        <button 
                          onClick={() => setTimeReportFilter('project')}
                          className={\`px-3 py-1.5 text-xs font-bold rounded-lg transition-all \${timeReportFilter === 'project' ? 'bg-white text-[#1a2b58] shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                        >Project/Client</button>
                      </div>
                    </div>

                    <div className="h-[300px] w-full">
                      {timesheets.length > 0 ? (() => {
                        const now = new Date();
                        const filterDate = timeReportFilter === 'week' ? startOfWeek(now) : timeReportFilter === 'month' ? startOfMonth(now) : null;
                        
                        let data = [];
                        if (timeReportFilter === 'project') {
                          // Aggregate by Client/Project
                          const map = {};
                          timesheets.forEach(t => {
                            const key = t.clientName === 'Internal Task' ? 'Internal' : t.clientName || 'Unknown';
                            if (!map[key]) map[key] = { name: key, "Time (Hours)": 0 };
                            map[key]["Time (Hours)"] += t.durationMinutes / 60;
                          });
                          data = Object.values(map);
                        } else {
                          // Aggregate by day of week or day of month
                          const map = {};
                          const end = timeReportFilter === 'week' ? endOfWeek(now) : endOfMonth(now);
                          const filtered = timesheets.filter(t => {
                            const d = new Date(t.createdAt);
                            return d >= filterDate && d <= end;
                          });
                          filtered.forEach(t => {
                            const day = format(new Date(t.createdAt), timeReportFilter === 'week' ? 'EEE' : 'MMM d');
                            if (!map[day]) map[day] = { name: day, "Time (Hours)": 0 };
                            map[day]["Time (Hours)"] += t.durationMinutes / 60;
                          });
                          data = Object.values(map);
                        }

                        // Round hours
                        data.forEach(d => {
                          d["Time (Hours)"] = Math.round(d["Time (Hours)"] * 100) / 100;
                        });

                        return (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                              <Tooltip 
                                cursor={{ fill: '#f1f5f9' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                              />
                              <Bar dataKey="Time (Hours)" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={timeReportFilter === 'month' ? 12 : 32} />
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      })() : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                          <Clock className="h-10 w-10 mb-3 opacity-20" />
                          <p className="text-sm font-medium">No time logs available to generate reports.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main Body Columns */}`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
