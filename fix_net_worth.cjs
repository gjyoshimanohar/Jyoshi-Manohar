const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

const target = `{/* Real-time Net Worth & Liquidity Overview */}`;
code = code.replace(target, `{activeTab === "dashboard" && (\n        <>\n          {/* Real-time Net Worth & Liquidity Overview */}`);

const endTarget = `              </span>
            </div>
          </div>
          
      {/* Visual Analytics Row */}`;

code = code.replace(`              </span>
            </div>
          </div>
          
      {/* Visual Analytics Row */}`, `              </span>
            </div>
          </div>
        </>
      )}

      {/* Visual Analytics Row */}`);

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
