const fs = require('fs');
let hero = fs.readFileSync('src/components/Hero.tsx', 'utf8');
hero = hero.replace('rounded-full mb-8 shadow-sm', 'rounded-full mb-6 shadow-sm');
hero = hero.replace('tracking-tighter mb-8 uppercase', 'tracking-tighter mb-4 uppercase');
hero = hero.replace('text-justify mb-10 max-w-lg', 'text-justify mb-8 max-w-lg');
hero = hero.replace('className="mt-20 flex space-x-16"', 'className="mt-12 flex space-x-16"');
fs.writeFileSync('src/components/Hero.tsx', hero);
