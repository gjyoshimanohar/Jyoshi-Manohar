const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

if (!code.includes("import UserProfileModal")) {
  code = code.replace(
    "import ProfileDropdown",
    "import ProfileDropdown from \"../components/ProfileDropdown\";\nimport UserProfileModal from \"../components/UserProfileModal\";\n// import ProfileDropdown"
  );
}

if (!code.includes("const [showProfileModal, setShowProfileModal] = useState(false);")) {
  code = code.replace(
    "const [showPasswordModal, setShowPasswordModal] = useState(false);",
    "const [showPasswordModal, setShowPasswordModal] = useState(false);\n  const [showProfileModal, setShowProfileModal] = useState(false);"
  );
}

// Add the UserProfileModal alongside ChangePasswordModal
code = code.replace(
  "<ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />",
  "<ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />\n      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} isAdmin={true} />"
);

// Update ProfileDropdown props
code = code.replace(
  "<ProfileDropdown onLogout={handleLogout} onChangePassword={() => setShowPasswordModal(true)} />",
  "<ProfileDropdown onLogout={handleLogout} onChangePassword={() => setShowPasswordModal(true)} onViewProfile={() => setShowProfileModal(true)} />"
);

fs.writeFileSync('src/pages/Admin.tsx', code);
