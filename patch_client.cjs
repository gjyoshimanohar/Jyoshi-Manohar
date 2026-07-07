const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf-8');

// Add import for ChangePasswordModal
if (!code.includes("import ChangePasswordModal")) {
  code = code.replace(
    "import CustomSelect from \"../components/CustomSelect\";",
    "import CustomSelect from \"../components/CustomSelect\";\nimport ChangePasswordModal from \"../components/ChangePasswordModal\";"
  );
}

// Add state for ChangePasswordModal
if (!code.includes("const [showPasswordModal, setShowPasswordModal] = useState(false);")) {
  code = code.replace(
    "const [authLoading, setAuthLoading] = useState(true);",
    "const [authLoading, setAuthLoading] = useState(true);\n  const [showPasswordModal, setShowPasswordModal] = useState(false);"
  );
}

// Add ChangePasswordModal component rendering
if (!code.includes("<ChangePasswordModal")) {
  code = code.replace(
    "<AnimatePresence mode=\"wait\">",
    "<ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />\n      <AnimatePresence mode=\"wait\">"
  );
}

// Add Change Password button
if (!code.includes("onClick={() => setShowPasswordModal(true)}")) {
  code = code.replace(
    "<button\n                onClick={handleLogout}",
    "<button\n                onClick={() => setShowPasswordModal(true)}\n                className=\"flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-all whitespace-nowrap cursor-pointer\"\n              >\n                <Key className=\"h-3.5 w-3.5\" />\n                <span>Change Password</span>\n              </button>\n              <button\n                onClick={handleLogout}"
  );
}

fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
