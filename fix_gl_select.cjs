const fs = require('fs');
const file = 'src/components/GeneralLedger.tsx';
let code = fs.readFileSync(file, 'utf8');

if (code.includes('<select') && code.includes('export default function GeneralLedger')) {
  if (!code.includes('import CustomSelect')) {
    code = code.replace(
      "import { FileSpreadsheet, Search, Filter, Calendar, Download } from 'lucide-react';",
      "import { FileSpreadsheet, Search, Filter, Calendar, Download } from 'lucide-react';\nimport CustomSelect from './CustomSelect';"
    );
  }

  code = code.replace(
    /<select[\s\S]*?<\/select>/,
    `<CustomSelect
              value={selectedType}
              onChange={(val) => setSelectedType(val as any)}
              options={[
                { value: 'All', label: 'All Types' },
                { value: 'Asset', label: 'Assets' },
                { value: 'Liability', label: 'Liabilities' },
                { value: 'Revenue', label: 'Revenue' },
                { value: 'Expense', label: 'Expenses' }
              ]}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-[9px] text-sm focus-within:border-primary w-full sm:w-40"
              searchable={false}
            />`
  );
  
  fs.writeFileSync(file, code);
  console.log('Patched GeneralLedger select');
}
