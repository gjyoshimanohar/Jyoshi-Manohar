const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf-8');

if (!code.includes("import ProfileDropdown")) {
  code = code.replace(
    "import ChangePasswordModal from \"../components/ChangePasswordModal\";",
    "import ChangePasswordModal from \"../components/ChangePasswordModal\";\nimport ProfileDropdown from \"../components/ProfileDropdown\";"
  );
}

const searchStr = `<button
                onClick={() => setShowPasswordModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-all whitespace-nowrap cursor-pointer"
              >
                <Key className="h-3.5 w-3.5" />
                <span>Change Password</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-all whitespace-nowrap cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>`;

if (code.includes(searchStr)) {
  code = code.replace(searchStr, `<ProfileDropdown onLogout={handleLogout} onChangePassword={() => setShowPasswordModal(true)} />`);
}

fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
