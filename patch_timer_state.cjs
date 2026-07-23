const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

const targetState = 'const [detailTab, setDetailTab] = useState<"details" | "activity">("details");';

const newStates = `const [detailTab, setDetailTab] = useState<"details" | "activity">("details");
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(() => localStorage.getItem("activeTimerTaskId"));
  const [activeTimerStartTime, setActiveTimerStartTime] = useState<number | null>(() => {
    const st = localStorage.getItem("activeTimerStartTime");
    return st ? parseInt(st, 10) : null;
  });
  const [activeTimerElapsed, setActiveTimerElapsed] = useState<number>(0);`;

code = code.replace(targetState, newStates);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
