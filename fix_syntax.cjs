const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

code = code.replace(
  "        </div>\n      )}\n      )}\n\n      {/* Client Advances Summary Bar */}",
  "        </div>\n      )}\n\n      {/* Client Advances Summary Bar */}"
);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
