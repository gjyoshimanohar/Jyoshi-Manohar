const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

const t1 = "hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all cursor-grab active:cursor-grabbing";
const r1 = "hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 cursor-grab active:cursor-grabbing";

code = code.replace(t1, r1);

const t2 = "hover:shadow-md transition-shadow cursor-pointer";
const r2 = "hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer";

code = code.replace(t2, r2);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
