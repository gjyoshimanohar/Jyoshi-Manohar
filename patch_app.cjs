const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes("const UserProfile = lazy")) {
  code = code.replace(
    "const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));",
    "const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));\nconst UserProfile = lazy(() => import('./pages/UserProfile'));"
  );
}

if (!code.includes('<Route path="/profile"')) {
  code = code.replace(
    '<Route path="/dashboard" element={<ClientDashboard />} />',
    '<Route path="/dashboard" element={<ClientDashboard />} />\n                <Route path="/profile" element={<UserProfile />} />'
  );
}

fs.writeFileSync('src/App.tsx', code);
