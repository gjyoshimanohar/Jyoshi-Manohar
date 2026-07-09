const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

const t1 = "hover:border-[#1a2b58] cursor-pointer rounded-xl flex justify-between items-center";
const r1 = "hover:border-[#1a2b58] hover:-translate-y-0.5 transition-all cursor-pointer rounded-xl flex justify-between items-center";

code = code.replace(t1, r1);

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
