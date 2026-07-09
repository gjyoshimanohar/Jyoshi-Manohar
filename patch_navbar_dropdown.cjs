const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

const oldLink = 'className="block px-5 py-3 text-sm font-semibold text-black hover:bg-slate-50 hover:text-primary transition-colors"';
const newLink = 'className="block px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"';
code = code.replace(oldLink, newLink);

fs.writeFileSync('src/components/Navbar.tsx', code);
