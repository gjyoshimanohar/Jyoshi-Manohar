const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');
content += `

.sun-editor .se-toolbar {
  position: sticky !important;
  top: 80px !important;
  z-index: 50 !important;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05) !important;
}
`;
fs.writeFileSync('src/index.css', content);
