const fs = require('fs');
const file = 'src/components/ResourceManager.tsx';
let code = fs.readFileSync(file, 'utf8');

if (code.includes('<select') && code.includes('export default function ResourceManager')) {
  if (!code.includes('import CustomSelect')) {
    code = code.replace(
      "import { Search, Filter, Plus, FileText, Download, ExternalLink, MoreVertical, Edit2, Trash2 } from 'lucide-react';",
      "import { Search, Filter, Plus, FileText, Download, ExternalLink, MoreVertical, Edit2, Trash2 } from 'lucide-react';\nimport CustomSelect from './CustomSelect';"
    );
  }

  code = code.replace(
    /<select[\s\S]*?<\/select>/,
    `<CustomSelect
                  value={editingResource.type || "whitepaper"}
                  onChange={(val) => setEditingResource({ ...editingResource, type: val as any })}
                  options={[
                    { value: 'whitepaper', label: 'Whitepaper' },
                    { value: 'report', label: 'Report' },
                    { value: 'guide', label: 'Guide' }
                  ]}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus-within:ring-2 focus-within:ring-primary h-[46px]"
                  searchable={false}
                />`
  );
  
  fs.writeFileSync(file, code);
  console.log('Patched ResourceManager select');
}
