const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('import Resources')) {
  content = content.replace(
    "import Toolkit from './pages/Toolkit';",
    "import Toolkit from './pages/Toolkit';\nimport Resources from './pages/Resources';"
  );
}

if (!content.includes('<Route path="/resources"')) {
  content = content.replace(
    '<Route path="/blog" element={<BlogList />} />',
    '<Route path="/blog" element={<BlogList />} />\n                <Route path="/resources" element={<Resources />} />'
  );
}

fs.writeFileSync('src/App.tsx', content);
