const fs = require('fs');
let code = fs.readFileSync('src/components/ProfileDropdown.tsx', 'utf-8');

if (!code.includes("import { useNavigate }")) {
  code = code.replace(
    "import { auth } from '../lib/firebase';",
    "import { auth } from '../lib/firebase';\nimport { useNavigate } from 'react-router-dom';"
  );
}

if (!code.includes("const navigate = useNavigate();")) {
  code = code.replace(
    "export default function ProfileDropdown({ onLogout, onChangePassword, onViewProfile, className = '' }: ProfileDropdownProps) {",
    "export default function ProfileDropdown({ onLogout, onChangePassword, onViewProfile, className = '' }: ProfileDropdownProps) {\n  const navigate = useNavigate();"
  );
}

// Replace the View Profile button click logic
code = code.replace(
  "if (onViewProfile) onViewProfile();",
  "navigate('/profile');\n                  if (onViewProfile) onViewProfile();"
);

fs.writeFileSync('src/components/ProfileDropdown.tsx', code);
