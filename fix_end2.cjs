const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

// Find the string `{/* Visual Analytics Row */}`
// Go back to the preceding `</div>` corresponding to the grid
// insert `</>\n)}` before `{/* Visual Analytics Row */}`

code = code.replace(/<\/div>\s*<\/div>\s*\{\/\* Visual Analytics Row \*\/\}/g, '</div>\n          </div>\n        </>\n      )}\n\n      {/* Visual Analytics Row */}');

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
