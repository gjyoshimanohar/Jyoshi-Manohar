const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

const t1 = "hover:shadow transition-all cursor-pointer flex justify-between items-center";
const r1 = "hover:shadow transition-all hover:-translate-y-0.5 cursor-pointer flex justify-between items-center";

code = code.replace(t1, r1);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
