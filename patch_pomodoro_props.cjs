const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroFocus.tsx', 'utf8');

code = code.replace(
  'export default function PomodoroFocus({ todos = [] }: { todos?: import("../types").Todo[] }) {',
  `export default function PomodoroFocus({ 
  todos = [],
  projects = [],
  activeTimerTaskId = null,
  activeTimerElapsed = 0
}: { 
  todos?: import("../types").Todo[];
  projects?: import("../types").Project[];
  activeTimerTaskId?: string | null;
  activeTimerElapsed?: number;
}) {`
);

fs.writeFileSync('src/components/PomodoroFocus.tsx', code);
