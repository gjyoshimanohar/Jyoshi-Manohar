const fs = require('fs');
let code = fs.readFileSync('src/components/FinanceTracker.tsx', 'utf8');

// extract category management modal
const catModalStart = '      {/* Category Management Modal */}';
const catModalEnd = '      {/* Slide-over Form Drawer Modal */}';

const startIndex = code.indexOf(catModalStart);
const endIndex = code.indexOf(catModalEnd);

if (startIndex !== -1 && endIndex !== -1) {
    let catModalCode = code.substring(startIndex, endIndex);
    code = code.substring(0, startIndex) + code.substring(endIndex);
    
    // Insert it right after the slide-over form drawer modal
    // It ends at:
    const drawerEnd = `              </form>\n            </div>\n          </div>\n        </div>\n      )}`;
    
    code = code.replace(drawerEnd, drawerEnd + '\n\n' + catModalCode);
    
    // Add explicit zIndex style just in case
    code = code.replace('className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"', 
                        'className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" style={{ zIndex: 9999 }}');
}

fs.writeFileSync('src/components/FinanceTracker.tsx', code);
