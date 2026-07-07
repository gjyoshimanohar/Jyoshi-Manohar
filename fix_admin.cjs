const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

// Ensure state is there
if (!code.includes("const [showPasswordModal, setShowPasswordModal] = useState(false);")) {
  code = code.replace(
    "const [postImageUploading, setPostImageUploading] = useState(false);",
    "const [postImageUploading, setPostImageUploading] = useState(false);\n  const [showPasswordModal, setShowPasswordModal] = useState(false);"
  );
}

// Ensure the main return is wrapped
if (!code.includes("<ChangePasswordModal")) {
  code = code.replace(
    "return (\n    <main className=\"pt-32 pb-24 bg-accent min-h-screen text-left\">",
    "return (\n    <>\n      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />\n      <main className=\"pt-32 pb-24 bg-accent min-h-screen text-left\">"
  );
  
  // Replace the final </div> closing with </div></>
  const lastMainClose = code.lastIndexOf("</main>");
  if (lastMainClose !== -1) {
    code = code.substring(0, lastMainClose) + "</main>\n    </>" + code.substring(lastMainClose + 7);
  }
}

fs.writeFileSync('src/pages/Admin.tsx', code);
