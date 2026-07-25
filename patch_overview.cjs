const fs = require('fs');
const content = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf-8');

const overviewSection = `
              {/* DASHBOARD OVERVIEW (CLIENT) */}
              {activeTab === "overview" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100/60 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -z-1" />
                    <div className="flex items-start gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                        <LayoutDashboard className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-primary tracking-tight">
                          Dashboard Overview
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                          Your central command center for all account activities, ongoing applications, and compliance filings.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Briefcase className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Apps</p>
                        <p className="text-2xl font-black text-slate-800">{applications.length}</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filings Due</p>
                        <p className="text-2xl font-black text-slate-800">{complianceFilings.filter(f => f.status !== "Filed").length}</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <FolderLock className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documents</p>
                        <p className="text-2xl font-black text-slate-800">{documents.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">Activity Timeline</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={[
                            { name: 'Jan', activity: 20 },
                            { name: 'Feb', activity: 35 },
                            { name: 'Mar', activity: 25 },
                            { name: 'Apr', activity: 60 },
                            { name: 'May', activity: 45 },
                            { name: 'Jun', activity: 85 }
                          ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0f294a" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#0f294a" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                            />
                            <Area type="monotone" dataKey="activity" stroke="#0f294a" strokeWidth={2} fillOpacity={1} fill="url(#colorActivity)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100/60 p-6 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">Compliance & Health</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Tax', score: 95 },
                            { name: 'Legal', score: 80 },
                            { name: 'HR', score: 100 },
                            { name: 'Audit', score: 60 },
                            { name: 'Gov', score: 90 }
                          ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <Tooltip
                               cursor={{ fill: 'transparent' }}
                               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                            />
                            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                               {
                                 [
                                   { name: 'Tax', score: 95 },
                                   { name: 'Legal', score: 80 },
                                   { name: 'HR', score: 100 },
                                   { name: 'Audit', score: 60 },
                                   { name: 'Gov', score: 90 }
                                 ].map((entry, index) => (
                                   <Cell key={\`cell-\${index}\`} fill={entry.score < 75 ? '#f59e0b' : '#10b981'} />
                                 ))
                               }
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

`;

const newContent = content.replace('{/* APPLICATION TRACKER BOARD */}', overviewSection + '              {/* APPLICATION TRACKER BOARD */}');
fs.writeFileSync('src/pages/ClientDashboard.tsx', newContent);
