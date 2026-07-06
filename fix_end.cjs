const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

const targetStr = `            </div>
          </div>
          
      {/* Visual Analytics Row */}`;

const newStr = `            </div>
          </div>
        </>
      )}

      {/* Visual Analytics Row */}`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
