const fs = require('fs');
let c = fs.readFileSync('src/components/Services.tsx', 'utf8');

c = c.replace(
  /className=\{`block p-8 lg:p-10 rounded-3xl h-full  border border-white\/50 backdrop-blur-sm transition-all duration-500 hover:shadow-\[0_20px_40px_-15px_rgba\(0,0,0,0\.05\)\] hover:-translate-y-2 hover:scale-\[1\.01\]`\}/,
  'className={`group relative overflow-hidden block p-8 lg:p-10 rounded-3xl h-full ${bgClass} shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-slate-200/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02]`}'
);

const tIconsTarget = `{IconComponent && (
                    <IconComponent 
                      className="h-12 w-12 text-primary mb-8 bg-white p-3 rounded-2xl shadow-sm" 
                      strokeWidth={1.2} 
                    />
                  )}
                  <h3 className="text-[1.35rem] font-semibold tracking-tight text-black mb-4">
                    {service.title}
                  </h3>
                  <p className="text-sm text-black font-normal leading-relaxed">
                    {service.description}
                  </p>`;

const tIconsRep = `<div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                  {IconComponent && (
                    <IconComponent 
                      className="relative z-10 h-12 w-12 text-primary mb-8 bg-white p-3 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.05)] transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-primary group-hover:text-white" 
                      strokeWidth={1.2} 
                    />
                  )}
                  <h3 className="relative z-10 text-[1.35rem] font-semibold tracking-tight text-black mb-4 transition-colors duration-500 group-hover:text-primary">
                    {service.title}
                  </h3>
                  <p className="relative z-10 text-sm text-black/70 font-normal leading-relaxed transition-colors duration-500 group-hover:text-black/90">
                    {service.description}
                  </p>`;

c = c.replace(tIconsTarget, tIconsRep);

fs.writeFileSync('src/components/Services.tsx', c);
