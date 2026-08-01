const fs = require('fs');
const file = 'src/components/WorkspaceApp.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /<select\s*value=\{complianceFilter\}\s*onChange=\{\(e\) => setComplianceFilter\(e\.target\.value as any\)\}\s*className="bg-transparent text-xs text-gray-500 outline-none cursor-pointer hover:text-gray-700 ml-2"\s*>\s*<option value="active">Active<\/option>\s*<option value="overdue">Overdue<\/option>\s*<option value="completed">Completed<\/option>\s*<\/select>/,
  `<CustomSelect
                      value={complianceFilter}
                      onChange={(val) => setComplianceFilter(val as any)}
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'overdue', label: 'Overdue' },
                        { value: 'completed', label: 'Completed' }
                      ]}
                      className="bg-transparent border-none text-xs text-gray-500 ml-2 w-28 focus-within:ring-0"
                    />`
);

fs.writeFileSync(file, code);
console.log('Patched WorkspaceApp select');
