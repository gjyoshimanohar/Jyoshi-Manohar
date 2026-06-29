const http = require('http');
const fs = require('fs');

http.get('http://localhost:3000/src/pages/ClientDashboard.tsx', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    // Vite sends the original source code in the sourcemap!
    // But since it's dev mode, maybe it doesn't?
    // Let's check the bottom of the file for the sourcemap comment.
    const lines = data.split('\n');
    const lastLine = lines[lines.length - 2] || lines[lines.length - 1];
    if (lastLine.includes('sourceMappingURL')) {
        // e.g. //# sourceMappingURL=data:application/json;base64,...
        const base64 = lastLine.split('base64,')[1];
        if (base64) {
            const json = Buffer.from(base64, 'base64').toString('utf-8');
            const map = JSON.parse(json);
            if (map.sourcesContent && map.sourcesContent[0]) {
                fs.writeFileSync('src/pages/ClientDashboard.tsx', map.sourcesContent[0]);
                console.log('Restored perfectly from Sourcemap!');
                return;
            }
        }
    }
    console.log("Could not restore from sourcemap. Last lines:", lines.slice(-5).join('\n'));
  });
});
