const fs = require('fs');
let code = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf-8');

if (!code.includes("const [showPasswordModal, setShowPasswordModal] = useState(false);")) {
  code = code.replace(
    "const [authLoading, setAuthLoading] = useState(false);",
    "const [authLoading, setAuthLoading] = useState(false);\n  const [showPasswordModal, setShowPasswordModal] = useState(false);"
  );
}
fs.writeFileSync('src/pages/ClientDashboard.tsx', code);
