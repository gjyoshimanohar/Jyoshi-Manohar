const fs = require('fs');
const file = 'src/components/FinanceTracker.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `            </div>
          </div>
          {renderLedgerLogsTable("Pending Payables", "All outstanding expenses and outlays")}
        </div>
      )}`;
      
const replacement = `            </div>
          </div>
          
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-rose-500" />
              Payables Cash Flow Projection (Next 6 Months)
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payablesChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val) => \`₹\${(val / 1000).toFixed(0)}k\`} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [\`₹\${value.toLocaleString("en-IN")}\`, 'Amount']}
                  />
                  <Bar dataKey="amount" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {renderLedgerLogsTable("Pending Payables", "All outstanding expenses and outlays")}
        </div>
      )}`;

if (code.includes(target) && !code.includes('Payables Cash Flow Projection')) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Added Payables Chart UI');
} else {
  console.log('Target not found or already added');
}
