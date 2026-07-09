const fs = require('fs');
const glob = require('glob');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace max-w-7xl with w-full max-w-[1920px]
  content = content.replace(/max-w-7xl/g, 'w-full max-w-[1920px]');
  
  // Replace max-w-5xl with w-full max-w-[1600px]
  content = content.replace(/max-w-5xl/g, 'w-full max-w-[1600px]');

  // Reduce px-4 sm:px-6 lg:px-8 to px-2 sm:px-4 lg:px-6
  content = content.replace(/px-4 sm:px-6 lg:px-8/g, 'px-2 sm:px-4 lg:px-6');

  // Reduce px-6 lg:px-12 to px-3 sm:px-6 lg:px-8
  content = content.replace(/px-6 lg:px-12/g, 'px-3 sm:px-6 lg:px-8');

  // Any leftover px-6 with max-w-[1920px] we might want to reduce
  content = content.replace(/mx-auto px-6/g, 'mx-auto px-3 sm:px-6');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

glob.sync('src/**/*.{ts,tsx}').forEach(processFile);
