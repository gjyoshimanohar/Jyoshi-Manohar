const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');
content = content.replace(
  'Manage Blog Posts\n          </button>\n        </div>',
  `Manage Blog Posts\n          </button>\n          <button\n            onClick={() => {\n              setActiveAdminTab("resources");\n              setEditingPost(null);\n            }}\n            className={\`py-4 px-6 font-bold uppercase tracking-widest text-xs border-b-2 transition-all shrink-0 \${\n              activeAdminTab === "resources"\n                ? "border-secondary text-primary border-b-2"\n                : "border-transparent text-gray-400 hover:text-primary"\n            }\`}\n          >\n            Manage Resources\n          </button>\n        </div>`
);
fs.writeFileSync('src/pages/Admin.tsx', content);
