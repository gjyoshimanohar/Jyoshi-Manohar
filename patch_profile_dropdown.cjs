const fs = require('fs');
let code = fs.readFileSync('src/components/ProfileDropdown.tsx', 'utf-8');

const importTarget = `import { auth } from '../lib/firebase';`;
const importReplacement = `import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';`;

const componentStart = `export default function ProfileDropdown({ onLogout, onChangePassword, onViewProfile, className = '' }: ProfileDropdownProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const user = auth.currentUser;
  const initial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';`;
  
const componentStartReplacement = `export default function ProfileDropdown({ onLogout, onChangePassword, onViewProfile, className = '' }: ProfileDropdownProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [profileName, setProfileName] = useState('');
  
  const user = auth.currentUser;
  
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.displayName) {
          setProfileName(data.displayName);
        } else if (data.firstName) {
          setProfileName(data.firstName + (data.lastName ? ' ' + data.lastName : ''));
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  const displayName = profileName || user?.displayName || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();`;

code = code.replace(importTarget, importReplacement);
code = code.replace(componentStart, componentStartReplacement);
code = code.replace(/\{user\?\.displayName \|\| user\?\.email\?\.split\('\@'\)\[0\] \|\| 'User'\}/g, '{displayName}');

fs.writeFileSync('src/components/ProfileDropdown.tsx', code);
