const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

// 1. Bento Grid: Change `activeTab !== "account"` to `activeTab === "dashboard"`, and remove inner conditions
const bentoStartStr = '{/* Bento Grid Stats Panel */}\\n      {activeTab !== "account" && (';
if (code.includes('{/* Bento Grid Stats Panel */}\\n      {activeTab !== "account" && (')) {
    code = code.replace(
        '{/* Bento Grid Stats Panel */}\\n      {activeTab !== "account" && (',
        '{/* Bento Grid Stats Panel */}\\n      {activeTab === "dashboard" && ('
    );
}

code = code.replace(/\\{\\(activeTab === "dashboard" \\|\\| activeTab === "incomes"\\) && \\(/g, '');
code = code.replace(/\\{\\(activeTab === "dashboard" \\|\\| activeTab === "expenses"\\) && \\(/g, '');
// For the closing `)}` of these inner conditionals, they are harder to regex reliably, so I'll just remove them manually using more specific matches.

code = code.replace(/<div className="p-3 bg-green-50 rounded-xl text-green-600">\\s*<TrendingUp className="w-6 h-6" \\/>\\s*<\\/div>\\s*<\\/div>\\s*\\)\\}/g, 
    '<div className="p-3 bg-green-50 rounded-xl text-green-600">\\n                <TrendingUp className="w-6 h-6" />\\n              </div>\\n            </div>');

code = code.replace(/<div className="p-3 bg-red-50 rounded-xl text-red-500">\\s*<TrendingDown className="w-6 h-6" \\/>\\s*<\\/div>\\s*<\\/div>\\s*\\)\\}/g,
    '<div className="p-3 bg-red-50 rounded-xl text-red-500">\\n                <TrendingDown className="w-6 h-6" />\\n              </div>\\n            </div>');

code = code.replace(/<div className=\\{`p-3 rounded-xl \\$\\{metrics\\.balance >= 0 \\? "bg-amber-50 text-\\[#AD8D3E\\]" : "bg-rose-50 text-rose-500"\\}`\\}>\\s*<BarChart3 className="w-6 h-6" \\/>\\s*<\\/div>\\s*<\\/div>\\s*\\)\\}/g,
    '<div className={`p-3 rounded-xl ${metrics.balance >= 0 ? "bg-amber-50 text-[#AD8D3E]" : "bg-rose-50 text-rose-500"}`}>\\n                <BarChart3 className="w-6 h-6" />\\n              </div>\\n            </div>');

code = code.replace(/<div className="p-3 bg-blue-50 rounded-xl text-blue-500">\\s*<FileText className="w-6 h-6" \\/>\\s*<\\/div>\\s*<\\/div>\\s*\\)\\}/g,
    '<div className="p-3 bg-blue-50 rounded-xl text-blue-500">\\n                <FileText className="w-6 h-6" />\\n              </div>\\n            </div>');

fs.writeFileSync('test1.tsx', code);
