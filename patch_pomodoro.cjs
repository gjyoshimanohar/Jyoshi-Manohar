const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroFocus.tsx', 'utf8');

code = code.replace(
  "import { isToday, isThisWeek, isThisMonth, format } from 'date-fns';",
  "import { isToday, isThisWeek, isThisMonth, format } from 'date-fns';\nimport CustomSelect from './CustomSelect';"
);

const target1 = `<select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#1a2b58] transition-colors"
                >
                  <option value="">-- Select a specific task (Optional) --</option>
                  {todos.filter(t => !t.completed).map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>`;

const rep1 = `<CustomSelect
                  value={selectedTaskId}
                  placeholder="-- Select a specific task (Optional) --"
                  onChange={(val) => setSelectedTaskId(val)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a2b58]/15 transition-colors"
                  options={todos.filter(t => !t.completed).map(t => ({value: t.id, label: t.title}))}
                />`;

const target2 = `<select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#1a2b58] transition-colors"
                >
                  <option value="">-- Choose client --</option>
                  <option value="Internal Task">Internal Task</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.displayName || c.companyName || c.email}</option>
                  ))}
                </select>`;

const rep2 = `<CustomSelect
                  value={selectedClientId}
                  placeholder="-- Choose client --"
                  onChange={(val) => setSelectedClientId(val)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a2b58]/15 transition-colors"
                  options={[
                    {value: "Internal Task", label: "Internal Task"},
                    ...clients.map(c => ({value: c.id, label: c.displayName || c.companyName || c.email}))
                  ]}
                />`;

code = code.replace(target1, rep1).replace(target2, rep2);
fs.writeFileSync('src/components/PomodoroFocus.tsx', code);
