const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');
code = code.replace("return (\n    <>\n      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />", "return (");
code = code.replace("</div>\n    </>\n  );", "</div>\n  );");
fs.writeFileSync('src/pages/Admin.tsx', code);
