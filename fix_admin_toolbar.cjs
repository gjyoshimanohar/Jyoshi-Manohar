const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');
content = content.replace('minHeight: "600px",', 'minHeight: "600px",\n stickyToolbar: "80",\n mode: "classic",');
fs.writeFileSync('src/pages/Admin.tsx', content);
