const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroFocus.tsx', 'utf8');

const clientSelectSection = `
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <User className="w-3 h-3" /> Select Client Account
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#1a2b58] transition-colors"
                >
                  <option value="">-- Choose client --</option>
                  {clients.map((c) => (
                    <option key={c.uid} value={c.uid}>
                      {c.displayName} ({c.email})
                    </option>
                  ))}
                </select>
              </div>`;

const newSelectSection = `
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Select Task to Focus On
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#1a2b58] transition-colors"
                >
                  <option value="">-- Select a specific task (Optional) --</option>
                  {todos && todos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>` + clientSelectSection;

code = code.replace(clientSelectSection.trim(), newSelectSection.trim());
fs.writeFileSync('src/components/PomodoroFocus.tsx', code);
