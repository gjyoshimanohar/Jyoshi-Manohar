const fs = require('fs');
const file = 'src/components/WorkspaceApp.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /<input\s+type="date"[^>]*?\s*className="([^"]*)"[^>]*?\/>/g;
let match;
const matches = [];
while ((match = regex.exec(code)) !== null) {
  matches.push({
    fullMatch: match[0],
    className: match[1],
    index: match.index
  });
}

// We will replace each match.
// First, check if there is an <input type="date"> pattern
for (const m of matches) {
  // Check if it already has a relative wrapper nearby or inside
  // It's safer to just wrap it. But some might already have <Calendar> icon and relative wrapper.
}
