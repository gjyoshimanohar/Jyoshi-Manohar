const fs = require('fs');

// 1. ProfileDropdown.tsx
let profile = fs.readFileSync('src/components/ProfileDropdown.tsx', 'utf-8');

// The popover wrapper
profile = profile.replace(
  /className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl shadow-slate-200\/50 border border-slate-100 overflow-hidden z-50 origin-top-right"/g,
  'className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100/60 p-1.5 z-50 origin-top-right"'
);

// The header
profile = profile.replace(/<div className="p-4 bg-slate-50 border-b border-slate-100">/g, '<div className="p-3 mb-1 bg-slate-50 border border-slate-100 rounded-xl">');

// The containers
profile = profile.replace(/<div className="py-2 border-t border-slate-100">/g, '<div className="pt-1 mt-1 border-t border-slate-100">');
profile = profile.replace(/<div className="py-2">/g, '<div className="space-y-0.5">');

// The buttons
profile = profile.replace(/w-full flex items-center gap-2\.5 px-5 py-2\.5 text-sm font-semibold transition-colors text-slate-700 hover:text-primary hover:bg-slate-50/g, 'w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors text-slate-700 hover:text-primary hover:bg-slate-50 rounded-lg');
profile = profile.replace(/w-full flex items-center gap-2\.5 px-5 py-2\.5 text-sm font-semibold transition-colors text-red-600 hover:bg-red-50 hover:text-red-700/g, 'w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg');

fs.writeFileSync('src/components/ProfileDropdown.tsx', profile);

// 2. Navbar.tsx
let navbar = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

navbar = navbar.replace(
  /<div className="bg-white rounded-2xl shadow-\[0_20px_40px_-15px_rgba\(0,0,0,0\.1\)\] border border-slate-100\/60 overflow-hidden py-2 relative before:content-\[''\] before:absolute before:-top-4 before:left-0 before:w-full before:h-4">/g,
  '<div className="bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100/60 p-1.5 relative before:content-[\'\'] before:absolute before:-top-4 before:left-0 before:w-full before:h-4 flex flex-col gap-0.5">'
);

navbar = navbar.replace(
  /className="block px-5 py-2\.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"/g,
  'className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors rounded-lg"'
);

fs.writeFileSync('src/components/Navbar.tsx', navbar);
