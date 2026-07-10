const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const setters = [...content.matchAll(/const\s+\[\s*([^,]+)\s*,\s*(set[A-Z][a-zA-Z0-9]*)\s*\]/g)].map(m => m[2]);
  if (setters.length === 0) return;
  
  lines.forEach((line, i) => {
    setters.forEach(setter => {
      if (line.includes(setter + '(') && !line.includes('=>') && !line.includes('function') && !line.includes('useEffect') && !line.includes('onClick') && !line.includes('onChange') && !line.includes('onSubmit')) {
        console.log(`${file}:${i + 1}: ${line}`);
      }
    });
  });
});
