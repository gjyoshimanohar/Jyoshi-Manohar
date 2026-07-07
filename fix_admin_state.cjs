const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

if (!code.includes("const [showPasswordModal, setShowPasswordModal] = useState(false);")) {
  code = code.replace(
    "const [uploadingImage, setUploadingImage] = useState(false);",
    "const [uploadingImage, setUploadingImage] = useState(false);\n  const [showPasswordModal, setShowPasswordModal] = useState(false);"
  );
}

fs.writeFileSync('src/pages/Admin.tsx', code);
