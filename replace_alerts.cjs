const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (content.includes('alert(')) {
        // Simple replacement logic
        content = content.replace(/alert\(/g, 'toast(');
        
        // Improve toast matching
        content = content.replace(/toast\("([Ss]uccessfully|[Ss]uccess|Data seeded)/g, 'toast.success("$1');
        content = content.replace(/toast\("([Ff]ailed|[Ee]rror|[Pp]lease|[Ii]nvalid|[Nn]o |Cannot)/g, 'toast.error("$1');
        content = content.replace(/toast\(\`/g, 'toast.success(`'); // Default template strings to success unless error text
        content = content.replace(/toast\.success\(\`([Ff]ailed|[Ee]rror|[Pp]lease|[Ii]nvalid|[Nn]o |Cannot)/g, 'toast.error(`$1');
        
        content = content.replace(/toast\((error\.code)/g, 'toast.error($1');
        
        if (!content.includes("import toast from 'react-hot-toast'")) {
          // add import at top
          content = "import toast from 'react-hot-toast';\n" + content;
        }
        
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir('./src');
