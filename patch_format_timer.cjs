const fs = require('fs');
let code = fs.readFileSync('src/components/PomodoroFocus.tsx', 'utf8');

const formatTimerFunc = `
  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return \`\${hours}:\${String(minutes).padStart(2, '0')}:\${String(seconds).padStart(2, '0')}\`;
    }
    return \`\${String(minutes).padStart(2, '0')}:\${String(seconds).padStart(2, '0')}\`;
  };
`;

code = code.replace(
  "  const [reportDateRange, setReportDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');",
  "  const [reportDateRange, setReportDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');\n" + formatTimerFunc
);

fs.writeFileSync('src/components/PomodoroFocus.tsx', code);
