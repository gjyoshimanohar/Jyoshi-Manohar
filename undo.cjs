const fs = require('fs');

let home = fs.readFileSync('src/pages/Home.tsx', 'utf8');
const searchHome = /<div key=\{idx\} className=\"relative flex flex-col bg-white p-8 rounded-3xl shadow-\[0_8px_30px_rgb\(0,0,0,0.04\)\] border border-slate-100\/60 hover:shadow-\[0_20px_40px_-15px_rgba\(0,0,0,0.1\)\] hover:-translate-y-1 hover:bg-primary transition-all duration-300 group overflow-hidden\">[\s\S]*?<\/div>/;
const repHome = `<div key={idx} className="flex flex-col bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/60 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 group">
                    <span className="text-xs font-black text-black/40 tracking-widest group-hover:text-secondary transition-colors">0{idx + 1}</span>
                    <span className="text-base font-bold text-primary mb-2">{item.title}</span>
                    <span className="text-sm text-black font-normal leading-relaxed">{item.desc}</span>
                  </div>`;
home = home.replace(searchHome, repHome);
fs.writeFileSync('src/pages/Home.tsx', home);

let services = fs.readFileSync('src/components/Services.tsx', 'utf8');
const searchServices1 = / className=\{`group block relative overflow-hidden p-8 (.*?)`\}/;
services = services.replace(searchServices1, ' className={`block p-8 $1`}');
const searchServicesText = /<span className=\"absolute right-\[-5%\] bottom-\[-10%\] text-9xl font-black text-slate-900\/\[0\.03\] group-hover:text-white\/10 transition-colors z-0 pointer-events-none\">[\s\S]*?<\/p>/;
const repServicesText = `<h3 className="text-[1.35rem] font-semibold tracking-tight text-black mb-4">
                    {service.title}
                  </h3>
                  <p className="text-sm text-black font-normal leading-relaxed">
                    {service.description}
                  </p>`;
services = services.replace(searchServicesText, repServicesText);
fs.writeFileSync('src/components/Services.tsx', services);

let blog = fs.readFileSync('src/components/BlogCard.tsx', 'utf8');
blog = blog.replace(/className=\{`group overflow-hidden p-8/, 'className={`group p-8');
const searchBlogText = /<span className=\"absolute right-\[-5%\] bottom-\[-5%\] text-9xl font-black text-slate-900\/\[0\.03\] group-hover:text-primary\/5 transition-colors z-0 pointer-events-none\">[\s\S]*?<\/div>/;
const repBlogText = `<div className="max-w-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-xs font-black text-[#FF6B4A] uppercase tracking-[0.2em]">{post.category}</span>
              <span className="text-black/30">•</span>
              <span className="text-xs font-bold text-black uppercase tracking-widest">{post.date}</span>
            </div>
            <h3 className="text-2xl font-bold text-black transition-colors mb-4">
              {post.title}
            </h3>
            <p className="text-black text-sm leading-relaxed font-normal line-clamp-3">
              {post.excerpt}
            </p>
          </div>`;
blog = blog.replace(searchBlogText, repBlogText);
fs.writeFileSync('src/components/BlogCard.tsx', blog);
