import * as fs from 'fs';

const filePath = 'src/pages/ClientDashboard.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(
  /\<div className=\{\`\$\{isSidebarOpen \? 'block' : 'hidden'\} space-y-3 transition-all duration-300 w-full\`\}\>/g,
  '<div className="space-y-3 transition-all duration-300 w-full">'
);

// We need to modify all the sidebar buttons
// They all have the structure:
// <button
//   onClick={() => setActiveTab('...')} ...
//   className={`w-full flex items-center justify-between p-4 ...

content = content.replace(/justify-between p-4/g, "${isSidebarOpen ? 'justify-between p-4' : 'justify-center p-3'}");

// Now we need to hide the text and badges
// <span className="text-xs font-bold uppercase tracking-wider">...</span>
content = content.replace(
  /<span className="text-xs font-bold uppercase tracking-wider">([^<]+)<\/span>/g,
  '{isSidebarOpen && <span className="text-xs font-bold uppercase tracking-wider">$1</span>}'
);

// the badges are like:
// <span className={`text-\[10px\] font-bold px-2 py-0.5 rounded-full \$\{...
// ...
// </span>
// 
// Let's replace the whole structure of span badges.
// Each nav button badge span follows the div containing the icon and text.
// We can match:
// </div>
// <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ...
// ...
// </span>

const spanRegex = /(<\/div>\s*)(\<span className=\{\`text-\[10px\] font-bold px-2 py-0\.5 rounded-full[^\>]*\>[\s\S]*?\<\/span\>)/g;
content = content.replace(spanRegex, '$1{isSidebarOpen && $2}');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done!');
