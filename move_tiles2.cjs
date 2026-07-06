const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

// 1. Move Bento Grid to only dashboard
code = code.replace('{/* Bento Grid Stats Panel */}\n      {activeTab !== "account" && (', '{/* Bento Grid Stats Panel */}\n      {activeTab === "dashboard" && (');

// 2. Extract Real-time Net Worth & Liquidity Overview
const netWorthStart = '{/* Real-time Net Worth & Liquidity Overview */}';
const netWorthEndMarker = '{paymentAccounts.length === 0 ? (';

const startIndex = code.indexOf(netWorthStart);
let endIndex = code.indexOf(netWorthEndMarker);

if (startIndex !== -1 && endIndex !== -1) {
    // Find the end of the div of Net Worth grid.
    // It's just before netWorthEndMarker. It has `</div>` x2 maybe.
    // Let's just find the `</div>` that closes the grid before the paymentAccounts check.
    const part = code.substring(startIndex, endIndex);
    
    // We want to remove this part from here
    code = code.substring(0, startIndex) + code.substring(endIndex);
    
    // And insert it right after the Bento Grid
    const insertAfter = '{/* Visual Analytics Row */}';
    code = code.replace(insertAfter, part + '\n      ' + insertAfter);
}

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
