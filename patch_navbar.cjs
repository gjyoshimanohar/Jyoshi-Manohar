const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

content = content.replace(
  "{ name: 'Insights & Resources', path: '/blog' },",
  "{ name: 'Insights', path: '/blog' },\n    { name: 'Resources', path: '/resources' },"
);

fs.writeFileSync('src/components/Navbar.tsx', content);
