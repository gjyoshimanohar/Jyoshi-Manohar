const fs = require('fs');
const file = 'src/components/WorkspaceApp.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `  Users,
  Banknote,
} from "lucide-react";`;
const replacement = `  Users,
  Banknote,
  Wallet,
} from "lucide-react";`;

if (code.includes(target) && !code.includes('Wallet,')) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Added Wallet import');
} else {
  console.log('Target not found or already added');
}
