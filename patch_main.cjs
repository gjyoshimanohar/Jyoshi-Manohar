const fs = require('fs');
const content = fs.readFileSync('src/main.tsx', 'utf8');

const updated = content + `

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, (err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
`;

fs.writeFileSync('src/main.tsx', updated);
