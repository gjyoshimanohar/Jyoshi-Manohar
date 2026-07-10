const fs = require('fs');
const file = 'src/components/InvoiceManagement.tsx';
let content = fs.readFileSync(file, 'utf8');

const listenerHook = `
  useEffect(() => {
    const handleOpen = () => {
      resetForm();
      setIsFormOpen(true);
    };
    window.addEventListener('OPEN_CREATE_INVOICE', handleOpen);
    return () => window.removeEventListener('OPEN_CREATE_INVOICE', handleOpen);
  }, []);
`;

content = content.replace('// Calculations', listenerHook + '\n  // Calculations');

fs.writeFileSync(file, content, 'utf8');
console.log("Patched InvoiceManagement");
