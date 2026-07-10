const fs = require('fs');
let content = fs.readFileSync('src/components/InvoiceManagement.tsx', 'utf8');

const regex = /<Plus className="w-3\.5 h-3\.5" \/> Add Row\s*<\/button>\s*<\/div>/;

const replacement = `<Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                  </div>
                </div>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceManagement.tsx', content);
