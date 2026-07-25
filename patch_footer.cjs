const fs = require('fs');
let content = fs.readFileSync('src/components/Footer.tsx', 'utf8');

content = content.replace(
  '<li><Link to="/blog" className="hover:text-white transition-colors">Insights & Resources</Link></li>',
  '<li><Link to="/blog" className="hover:text-white transition-colors">Insights</Link></li>\n              <li><Link to="/resources" className="hover:text-white transition-colors">Resources</Link></li>'
);

fs.writeFileSync('src/components/Footer.tsx', content);
