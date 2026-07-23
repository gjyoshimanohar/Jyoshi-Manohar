const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const targetStr = '{/* Detail picking controls */}';

const newStr = `
                        {/* Time Tracker Block */}
                        <div className="mt-4 mb-4 bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time Logged</p>
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-black text-slate-700 tracking-tight leading-none">
                                {formatTimer((todo.timeSpentSeconds || 0) + (activeTimerTaskId === todo.id ? activeTimerElapsed : 0))}
                              </span>
                              {activeTimerTaskId === todo.id && (
                                <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mb-0.5 animate-pulse">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Active
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            {activeTimerTaskId === todo.id ? (
                              <button
                                onClick={handleStopTimer}
                                className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                              >
                                <Square className="w-4 h-4 fill-current" />
                                Stop
                              </button>
                            ) : (
                              <button
                                onClick={(e) => handleStartTimer(todo.id, e)}
                                className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                              >
                                <Play className="w-4 h-4 fill-current" />
                                Start Timer
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Detail picking controls */}`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
