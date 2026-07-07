const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

if (!code.includes("import ProfileDropdown")) {
  code = code.replace(
    "import ChangePasswordModal from \"../components/ChangePasswordModal\";",
    "import ChangePasswordModal from \"../components/ChangePasswordModal\";\nimport ProfileDropdown from \"../components/ProfileDropdown\";"
  );
}

const searchStr = `<button
              onClick={() => setShowPasswordModal(true)}
              className="p-3 text-black hover:text-primary transition-colors flex items-center space-x-2"
            >
              <span className="text-xs font-medium uppercase tracking-widest hidden sm:inline">
                Change Password
              </span>
              <Key className="h-5 w-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-3 text-black hover:text-primary transition-colors flex items-center space-x-2"
            >
              <span className="text-xs font-medium uppercase tracking-widest hidden sm:inline">
                Logout
              </span>
              <LogOut className="h-5 w-5" />
            </button>`;

if (code.includes(searchStr)) {
  code = code.replace(searchStr, `<ProfileDropdown onLogout={handleLogout} onChangePassword={() => setShowPasswordModal(true)} />`);
}

fs.writeFileSync('src/pages/Admin.tsx', code);
