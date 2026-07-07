const fs = require('fs');
let code = fs.readFileSync('src/components/ProfileDropdown.tsx', 'utf-8');

code = code.replace(
  "interface ProfileDropdownProps {",
  "interface ProfileDropdownProps {\n  onViewProfile?: () => void;"
);

code = code.replace(
  "export default function ProfileDropdown({ onLogout, onChangePassword, className = '' }: ProfileDropdownProps) {",
  "export default function ProfileDropdown({ onLogout, onChangePassword, onViewProfile, className = '' }: ProfileDropdownProps) {"
);

const btnViewProfileOld = `<button
                onClick={() => {
                  setIsOpen(false);
                  // Just close for now as we don't have a separate profile page yet
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors font-medium"
              >
                <User className="w-4 h-4" />
                View Profile
              </button>`;
const btnViewProfileNew = `<button
                onClick={() => {
                  setIsOpen(false);
                  if (onViewProfile) onViewProfile();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-primary hover:bg-slate-50 rounded-lg transition-colors font-medium"
              >
                <User className="w-4 h-4" />
                View Profile
              </button>`;

code = code.replace(btnViewProfileOld, btnViewProfileNew);

fs.writeFileSync('src/components/ProfileDropdown.tsx', code);
