const fs = require('fs');
const content = fs.readFileSync('src/pages/BlogList.tsx', 'utf-8');

const subscribeSection = `
            {/* Newsletter Subscription */}
            <div className="mt-20 bg-primary rounded-3xl p-8 sm:p-12 border border-primary/20 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -z-0" />
              
              <div className="relative z-10 max-w-xl text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Stay Ahead of the Curve</h3>
                <p className="text-white/80 font-medium leading-relaxed">
                  Subscribe to our newsletter for exclusive financial insights, regulatory updates, and expert tax strategies delivered straight to your inbox.
                </p>
              </div>
              
              <div className="relative z-10 w-full md:w-auto flex-1 max-w-md">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    import('react-hot-toast').then(mod => {
                      mod.default.success("Subscribed successfully! Check your email for confirmation.");
                    });
                  }} 
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <input 
                    type="email" 
                    required 
                    placeholder="Enter your email address" 
                    className="w-full px-5 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:bg-white/20 focus:outline-none focus:border-white/50 transition-all font-medium"
                  />
                  <button 
                    type="submit"
                    className="shrink-0 bg-white text-primary px-8 py-4 rounded-xl font-bold uppercase tracking-wider hover:bg-slate-50 hover:-translate-y-0.5 transition-all shadow-lg"
                  >
                    Subscribe
                  </button>
                </form>
                <p className="text-white/50 text-[10px] mt-3 font-medium uppercase tracking-widest text-center sm:text-left">
                  We respect your privacy. No spam.
                </p>
              </div>
            </div>
`;

const newContent = content.replace(
  '            {filteredPosts.length === 0 && (',
  subscribeSection + '\n            {filteredPosts.length === 0 && ('
);
fs.writeFileSync('src/pages/BlogList.tsx', newContent);
