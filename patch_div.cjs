const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroFocus.tsx', 'utf8');

code = code.replace(
  '<p className="text-xs text-slate-500">Track and analyze time spent on tasks</p>\n            </div>\n            \n\n          {/* Active / Real-Time Task Timers Section */}',
  '<p className="text-xs text-slate-500">Track and analyze time spent on tasks</p>\n            </div>\n          </div>\n          \n          {/* Active / Real-Time Task Timers Section */}'
);

fs.writeFileSync('src/components/PomodoroFocus.tsx', code);
