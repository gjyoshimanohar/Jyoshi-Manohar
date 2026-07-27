const fs = require('fs');
let content = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf-8');

const replacement = `
                <th className="px-6 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => { if (sortBy === 'date') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortBy('date'); setSortOrder('desc'); } }}>
                  <div className="flex items-center gap-1">
                    Date
                    {sortBy === 'date' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                  </div>
                </th>
                <th className="px-6 py-3 font-semibold">Description</th>
                <th className="px-6 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => { if (sortBy === 'category') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortBy('category'); setSortOrder('asc'); } }}>
                  <div className="flex items-center gap-1">
                    Category
                    {sortBy === 'category' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                  </div>
                </th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => { if (sortBy === 'amount') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortBy('amount'); setSortOrder('desc'); } }}>
                  <div className="flex items-center justify-end gap-1">
                    Amount
                    {sortBy === 'amount' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                  </div>
                </th>
                <th className="px-6 py-3 font-semibold cursor-pointer hover:bg-slate-100 transition-colors text-center" onClick={() => { if (sortBy === 'status') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); else { setSortBy('status'); setSortOrder('asc'); } }}>
                  <div className="flex items-center justify-center gap-1">
                    Status
                    {sortBy === 'status' ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 text-slate-300" />}
                  </div>
                </th>
                <th className="px-6 py-3 font-semibold text-center">Actions</th>`;

content = content.replace(
  `                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Description</th>
                <th className="px-6 py-3 font-semibold">Category</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold text-right">Amount</th>
                <th className="px-6 py-3 font-semibold text-center">Status</th>
                <th className="px-6 py-3 font-semibold text-center">Actions</th>`,
  replacement
);

fs.writeFileSync('src/components/FinanceTracker.tsx', content);
