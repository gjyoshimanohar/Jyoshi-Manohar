const fs = require('fs');
let content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');
content = content.replace(/LayoutDashboard,\n/g, ''); // clear all
content = content.replace(/} from "lucide-react";/, '  LayoutDashboard,\n} from "lucide-react";');
fs.writeFileSync('src/components/WorkspaceApp.tsx', content);
