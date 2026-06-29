const http = require('http');
const fs = require('fs');

http.get('http://localhost:3000/src/pages/ClientDashboard.tsx', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('restored.tsx', data);
    console.log('Restored length:', data.length);
  });
}).on('error', (err) => {
  console.error(err);
});
