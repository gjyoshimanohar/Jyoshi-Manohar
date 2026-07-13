const fs = require('fs');
const content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

const target = `          <div className="px-6 py-5 border-b border-border bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-primary tracking-tight">{title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Showing {filteredRecords.length} of {records.length} total logged transactions.</p>
            </div>
          </div>`;

const replacement = `          <div className="px-6 py-5 border-b border-border bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-primary tracking-tight">{title}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Showing {filteredRecords.length} of {records.length} total logged transactions.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Range</span>
                <input 
                  type="date" 
                  value={filterStartDate} 
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded py-1 px-2 text-xs font-medium text-primary outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input 
                  type="date" 
                  value={filterEndDate} 
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded py-1 px-2 text-xs font-medium text-primary outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sort By</span>
                <CustomSelect
                  value={sortBy}
                  onChange={(val) => setSortBy(val as any)}
                  className="bg-white border border-slate-200 rounded py-1 px-2 text-xs font-medium text-primary outline-none min-w-[100px]"
                  options={[
                    { value: "date", label: "Date" },
                    { value: "amount", label: "Amount" },
                    { value: "category", label: "Category" },
                    { value: "status", label: "Status" }
                  ]}
                />
                <button
                  onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                  title={sortOrder === "desc" ? "Descending" : "Ascending"}
                >
                  <ArrowLeftRight className={\`w-4 h-4 transition-transform \${sortOrder === 'asc' ? 'rotate-90' : '-rotate-90'}\`} />
                </button>
              </div>
            </div>
          </div>`;

const updated = content.replace(target, replacement);
fs.writeFileSync('src/components/FinanceTracker.tsx', updated);
