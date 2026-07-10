const fs = require('fs');
const file = 'src/pages/ClientDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const generateInvoiceOption = `                          <button
                            onClick={() => {
                              setActiveTab("invoices");
                              setIsOpsDropdownOpen(false);
                              setTimeout(() => {
                                window.dispatchEvent(new CustomEvent('OPEN_CREATE_INVOICE'));
                              }, 150);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-primary/5 hover:text-primary rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                          >
                            <CreditCard className="h-3.5 w-3.5" /> Generate Invoice
                          </button>`;

content = content.replace('                            Calendar\n                          </button>', '                            Calendar\n                          </button>\n' + generateInvoiceOption);

fs.writeFileSync(file, content, 'utf8');
console.log("Patched ClientDashboard");
