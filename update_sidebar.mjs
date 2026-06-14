import * as fs from 'fs';
import * as path from 'path';

const filePath = 'src/pages/ClientDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(
  /\<div className=\{\`\$\{isSidebarOpen \? 'block' : 'hidden'\} space-y-3 transition-all duration-300 w-full\`\}\>/g,
  '<div className="space-y-3 transition-all duration-300 w-full">'
);

content = content.replace(/justify-between p-4/g, "${isSidebarOpen ? 'justify-between p-4' : 'justify-center p-3'}");

content = content.replace(
  /<span className="text-xs font-bold uppercase tracking-wider">([^<]+)<\/span>/g,
  '{isSidebarOpen && <span className="text-xs font-bold uppercase tracking-wider">$1</span>}'
);

const spanRegex = /(<\/div>\s*)(\<span className=\{\`text-\[10px\] font-bold px-2 py-0\.5 rounded-full[^\>]*\>[\s\S]*?\<\/span\>)/g;
content = content.replace(spanRegex, '$1{isSidebarOpen && ($2)}');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done!');
