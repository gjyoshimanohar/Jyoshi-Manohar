const fs = require('fs');
const content = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf8');

let newContent = content.replace(
  "const sidebarSelectedTag: string | null = null;",
  "const [sidebarSelectedTag, setSidebarSelectedTag] = useState<string | null>(null);"
);

newContent = newContent.replace(
  "const setSidebarSelectedTag = (val: any) => {};",
  ""
);

fs.writeFileSync('src/components/WorkspaceApp.tsx', newContent);
