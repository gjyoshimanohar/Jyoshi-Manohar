const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf-8');

if (!code.includes("import UserProfileModal")) {
  code = code.replace(
    "import ProfileDropdown from \"../components/ProfileDropdown\";",
    "import ProfileDropdown from \"../components/ProfileDropdown\";\nimport UserProfileModal from \"../components/UserProfileModal\";"
  );
}

if (!code.includes("const [showProfileModal, setShowProfileModal] = useState(false);")) {
  code = code.replace(
    "const [showPasswordModal, setShowPasswordModal] = useState(false);",
    "const [showPasswordModal, setShowPasswordModal] = useState(false);\n  const [showProfileModal, setShowProfileModal] = useState(false);"
  );
}

// Inject modlas
const searchReturn = `  // SIGNED IN VIEW
  return (
    <main className="min-h-screen pt-28 pb-20 bg-[#FDFDFD]">`;

const replaceReturn = `  // SIGNED IN VIEW
  return (
    <>
      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} isAdmin={isAdmin} />
    <main className="min-h-screen pt-28 pb-20 bg-[#FDFDFD]">`;

if (code.includes(searchReturn)) {
  code = code.replace(searchReturn, replaceReturn);
}

// Ensure ProfileDropdown gets the onViewProfile prop
code = code.replace(
  "<ProfileDropdown onLogout={handleLogout} onChangePassword={() => setShowPasswordModal(true)} />",
  "<ProfileDropdown onLogout={handleLogout} onChangePassword={() => setShowPasswordModal(true)} onViewProfile={() => setShowProfileModal(true)} />"
);

// We need to also add </> at the very end of the component
// Since the file is 7000+ lines, I'll just append it to the last </div>
const lastMainClose = code.lastIndexOf("</main>");
if (lastMainClose !== -1 && code.includes(replaceReturn)) {
  code = code.substring(0, lastMainClose) + "</main>\n    </>" + code.substring(lastMainClose + 7);
}


fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
