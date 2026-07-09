const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

// The AreaChart takes lg:col-span-2
code = code.replace(/className="grid grid-cols-1 lg:grid-cols-3 gap-6"/, 'className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6"');

// AreaChart block
code = code.replace(/<div className="lg:col-span-2 bg-white border border-border p-6 rounded-2xl shadow-sm">/, '<div className="lg:col-span-2 bg-white border border-border p-6 rounded-2xl shadow-sm">');

// We need to replace the single Category Breakdown with two: Income and Expense
const singleCategoryChart = `<div className="bg-white border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-primary tracking-tight mb-1">Specific Distribution</h3>
              <p className="text-xs text-gray-400 mb-4">Percentage allocation based on current filtered scopes.</p>
              
              {categoryChartData.length === 0 ? (
                <div className="py-12 text-center text-gray-400 italic text-xs border border-dashed rounded-xl mt-4">
                  No categorical data matches active filters.
                </div>
              ) : (
                <div className="h-44 w-full relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Filtered</span>
                    <span className="text-sm font-bold text-primary">{categoryChartData.length} Keys</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => \`₹\${value}\`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Custom Category List legend */}
            <div className="mt-4 space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {categoryChartData.slice(0, 5).map((entry, index) => {
                const totalVal = categoryChartData.reduce((acc, curr) => acc + curr.value, 0);
                const percentage = totalVal > 0 ? Math.round((entry.value / totalVal) * 100) : 0;
                return (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-semibold text-primary truncate max-w-[120px]">{entry.name}</span>
                    </div>
                    <div className="text-gray-500 font-semibold">
                      ₹{entry.value.toLocaleString("en-IN")} <span className="text-[10px] font-bold text-[#AD8D3E]">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>`;

const doubleCategoryChart = `<div className="bg-white border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-primary tracking-tight mb-1">Income Distribution</h3>
              <p className="text-xs text-gray-400 mb-4">Sources of professional inflow.</p>
              
              {incomeChartData.length === 0 ? (
                <div className="py-12 text-center text-gray-400 italic text-xs border border-dashed rounded-xl mt-4">
                  No income data matches active filters.
                </div>
              ) : (
                <div className="h-44 w-full relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Income</span>
                    <span className="text-sm font-bold text-primary">{incomeChartData.length} Keys</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                    <PieChart>
                      <Pie
                        data={incomeChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {incomeChartData.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => \`₹\${value}\`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {incomeChartData.slice(0, 5).map((entry, index) => {
                const totalVal = incomeChartData.reduce((acc, curr) => acc + curr.value, 0);
                const percentage = totalVal > 0 ? Math.round((entry.value / totalVal) * 100) : 0;
                return (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-semibold text-primary truncate max-w-[120px]">{entry.name}</span>
                    </div>
                    <div className="text-gray-500 font-semibold">
                      ₹{entry.value.toLocaleString("en-IN")} <span className="text-[10px] font-bold text-[#AD8D3E]">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-primary tracking-tight mb-1">Expense Distribution</h3>
              <p className="text-xs text-gray-400 mb-4">Sources of operating outflow.</p>
              
              {expenseChartData.length === 0 ? (
                <div className="py-12 text-center text-gray-400 italic text-xs border border-dashed rounded-xl mt-4">
                  No expense data matches active filters.
                </div>
              ) : (
                <div className="h-44 w-full relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Expenses</span>
                    <span className="text-sm font-bold text-primary">{expenseChartData.length} Keys</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expenseChartData.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => \`₹\${value}\`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {expenseChartData.slice(0, 5).map((entry, index) => {
                const totalVal = expenseChartData.reduce((acc, curr) => acc + curr.value, 0);
                const percentage = totalVal > 0 ? Math.round((entry.value / totalVal) * 100) : 0;
                return (
                  <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-semibold text-primary truncate max-w-[120px]">{entry.name}</span>
                    </div>
                    <div className="text-gray-500 font-semibold">
                      ₹{entry.value.toLocaleString("en-IN")} <span className="text-[10px] font-bold text-[#AD8D3E]">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>`;

// Find and replace the single category chart code
// Note: We need to be careful with formatting since the string might not match exactly due to whitespace.
// A simpler way is to replace the JSX directly, but using regex could be safer.

// I'll extract it and replace.
let start = code.indexOf('{/* Category breakdown sidebar widget */}');
let end = code.indexOf('</div>\n        </div>\n      )}\n\n      {/* Pending Receivables Analytics Row */}');

if (start !== -1 && end !== -1) {
  code = code.substring(0, start) + doubleCategoryChart + code.substring(end);
  fs.writeFileSync('src/components/FinanceTracker.tsx', code);
  console.log('Successfully replaced category charts');
} else {
  console.log('Failed to find category chart boundaries');
}
