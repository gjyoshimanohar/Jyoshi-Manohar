const fs = require('fs');
let content = fs.readFileSync('/app/applet/src/components/FinanceTracker.tsx', 'utf-8');

const targetPicker = `<DayPicker
                          mode="range"`;
const newPicker = `<DayPicker
                          mode="range"
                          min={1}`;

content = content.replace(targetPicker, newPicker);
fs.writeFileSync('/app/applet/src/components/FinanceTracker.tsx', content);
console.log("Updated DatePicker min property");
