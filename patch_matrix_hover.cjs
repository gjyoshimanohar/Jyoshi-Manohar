const fs = require('fs');
let code = fs.readFileSync('src/components/EisenhowerMatrix.tsx', 'utf-8');

const t1 = "hover:shadow-md transition-all duration-200 cursor-grab";
const r1 = "hover:shadow-md transition-all hover:-translate-y-0.5 duration-200 cursor-grab";

code = code.replace(t1, r1);

fs.writeFileSync('src/components/EisenhowerMatrix.tsx', code);
