const fs = require('fs');
let c = fs.readFileSync('src/components/BlogCard.tsx', 'utf8');

c = c.replace(
  /className=\`group p-8 lg:p-10 rounded-3xl \$\{bgClass\} border border-white\/50 backdrop-blur-sm transition-all duration-500 hover:shadow-\[0_20px_40px_-15px_rgba\(0,0,0,0.05\)\] hover:-translate-y-2 hover:scale-\[1.01\] relative flex flex-col\`/,
  'className={`group relative overflow-hidden p-8 lg:p-10 rounded-3xl ${bgClass} border border-white/50 backdrop-blur-sm transition-all duration-500 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 hover:scale-[1.02] flex flex-col`}'
);

const tBlogTarget = `<div className="flex flex-col h-full justify-between gap-6">
          <div className="max-w-2xl">
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
          </div>
          
          <div className="flex items-center text-xs font-black uppercase tracking-widest text-black group-hover:text-[#FF6B4A] transition-colors mt-4">
            Read Post
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform text-[#FF6B4A] group-hover:text-[#FF6B4A]" />
          </div>
        </div>`;

const tBlogRep = `<div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col h-full justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-xs font-black text-[#FF6B4A] uppercase tracking-[0.2em]">{post.category}</span>
              <span className="text-black/30">•</span>
              <span className="text-xs font-bold text-black uppercase tracking-widest">{post.date}</span>
            </div>
            <h3 className="text-2xl font-bold text-black group-hover:text-primary transition-colors duration-500 mb-4">
              {post.title}
            </h3>
            <p className="text-black/70 text-sm leading-relaxed font-normal line-clamp-3 group-hover:text-black/90 transition-colors duration-500">
              {post.excerpt}
            </p>
          </div>
          
          <div className="flex items-center text-xs font-black uppercase tracking-widest text-black group-hover:text-[#FF6B4A] transition-colors duration-500 mt-4">
            Read Post
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform text-black group-hover:text-[#FF6B4A]" />
          </div>
        </div>`;

c = c.replace(tBlogTarget, tBlogRep);
fs.writeFileSync('src/components/BlogCard.tsx', c);
