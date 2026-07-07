const fs = require('fs');
let code = fs.readFileSync('src/components/WorkspaceApp.tsx', 'utf-8');

const searchReturn = `<main className="flex-1 overflow-y-auto bg-white flex flex-col items-center pb-24 md:pb-6 relative h-full">`;

if (code.includes(searchReturn) && !code.includes("<ChangePasswordModal")) {
  const replacement = `<ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} isAdmin={true} />
      <main className="flex-1 overflow-y-auto bg-white flex flex-col items-center pb-24 md:pb-6 relative h-full">`;
  code = code.replace(searchReturn, replacement);
  fs.writeFileSync('src/components/WorkspaceApp.tsx', code);
}
