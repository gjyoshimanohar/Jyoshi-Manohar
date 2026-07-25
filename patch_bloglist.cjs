const fs = require('fs');
let content = fs.readFileSync('src/pages/BlogList.tsx', 'utf8');

const target = `            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {resources.map((resource, index) => (
                <ResourceCard key={resource.id} resource={resource} index={index} />
              ))}
            </div>
            
            {loadingResources ? (
              <div className="py-20 flex justify-center col-span-full">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (!resources || resources.length === 0) && (
              <div className="text-center py-24 bg-slate-50 rounded-2xl border border-slate-200">
                <Download className="w-10 h-10 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800">No resources available right now.</h3>
                <p className="text-slate-500 mt-2">Check back later for new whitepapers and guides.</p>
              </div>
            )}`;

const replacement = `            {!loadingResources && resources && resources.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
                {resources.map((resource, index) => (
                  <ResourceCard key={resource.id} resource={resource} index={index} />
                ))}
              </div>
            )}
            
            {loadingResources && (
              <div className="py-24 flex flex-col items-center justify-center w-full bg-slate-50/50 rounded-3xl border border-slate-100">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-slate-600 font-medium animate-pulse">Retrieving documents from secure vault...</p>
              </div>
            )}
            
            {!loadingResources && (!resources || resources.length === 0) && (
              <div className="text-center py-24 px-6 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col items-center w-full">
                <div className="bg-white p-5 rounded-full shadow-sm mb-6 border border-slate-100">
                  <Download className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Looking for specific tax guides?</h3>
                <p className="text-slate-600 max-w-md mx-auto mb-8 leading-relaxed">
                  We are currently updating our repository of whitepapers and industry tax guides. If you need immediate assistance or specific financial documents, please reach out to our advisory team.
                </p>
                <a 
                  href="/#contact"
                  className="inline-flex items-center justify-center space-x-2 bg-primary hover:bg-primary/90 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  <span>Request a Document</span>
                </a>
              </div>
            )}`;

if(content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/pages/BlogList.tsx', content);
    console.log("Success");
} else {
    console.log("Target not found. Doing fuzzy match.");
    // try to just find the sections
}
