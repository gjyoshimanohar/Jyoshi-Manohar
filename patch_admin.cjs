const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

// Add import for ChangePasswordModal
if (!code.includes("import ChangePasswordModal")) {
  code = code.replace(
    "import { blogService } from \"../services/blogService\";",
    "import { blogService } from \"../services/blogService\";\nimport ChangePasswordModal from \"../components/ChangePasswordModal\";"
  );
}

// Add Key to lucide-react imports if not there
if (!code.includes("Key,")) {
  code = code.replace(
    "LogOut,",
    "LogOut, Key,"
  );
}

// Add state for ChangePasswordModal
if (!code.includes("const [showPasswordModal, setShowPasswordModal] = useState(false);")) {
  code = code.replace(
    "const [postImageUploading, setPostImageUploading] = useState(false);",
    "const [postImageUploading, setPostImageUploading] = useState(false);\n  const [showPasswordModal, setShowPasswordModal] = useState(false);"
  );
}

// Add ChangePasswordModal component rendering
if (!code.includes("<ChangePasswordModal")) {
  code = code.replace(
    "return (",
    "return (\n    <>\n      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />"
  );
  code = code.replace(
    /(\s*)<\/div>\n(\s*)\)$/,
    "$1</div>\n    </>\n  )"
  );
  // Actually regex replacement might be tricky, let's just do a string replacement
  const lastDivIndex = code.lastIndexOf("</div>\n  );");
  if (lastDivIndex !== -1) {
    code = code.substring(0, lastDivIndex) + "</div>\n    </>\n  );";
  }
}

// Add Change Password button
if (!code.includes("onClick={() => setShowPasswordModal(true)}")) {
  code = code.replace(
    "<button\n              onClick={handleLogout}",
    "<button\n              onClick={() => setShowPasswordModal(true)}\n              className=\"p-3 text-black hover:text-primary transition-colors flex items-center space-x-2\"\n            >\n              <span className=\"text-xs font-medium uppercase tracking-widest hidden sm:inline\">\n                Change Password\n              </span>\n              <Key className=\"h-5 w-5\" />\n            </button>\n            <button\n              onClick={handleLogout}"
  );
}

fs.writeFileSync('src/pages/Admin.tsx', code);
