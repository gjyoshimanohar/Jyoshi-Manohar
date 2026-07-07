const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

if (!code.includes("import UserProfileModal")) {
  code = code.replace(
    "import ProfileDropdown from './ProfileDropdown';",
    "import ProfileDropdown from './ProfileDropdown';\nimport UserProfileModal from './UserProfileModal';"
  );
}

if (!code.includes("const [showProfileModal, setShowProfileModal] = useState(false);")) {
  code = code.replace(
    "const [showPasswordModal, setShowPasswordModal] = useState(false);",
    "const [showPasswordModal, setShowPasswordModal] = useState(false);\n  const [showProfileModal, setShowProfileModal] = useState(false);"
  );
}

const searchModal = "<ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />";
if (code.includes(searchModal) && !code.includes("UserProfileModal isOpen")) {
  code = code.replace(
    searchModal,
    searchModal + "\n      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} isAdmin={true} />"
  );
}

// Ensure ProfileDropdown gets the onViewProfile prop
if (code.includes("onViewProfile") === false) {
  code = code.replace(
    "<ProfileDropdown onLogout={handleLogout} onChangePassword={() => setShowPasswordModal(true)}",
    "<ProfileDropdown onLogout={handleLogout} onChangePassword={() => setShowPasswordModal(true)} onViewProfile={() => setShowProfileModal(true)}"
  );
}

fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
