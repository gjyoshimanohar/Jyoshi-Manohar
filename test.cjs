const express = require('express');
const app = express();
const server = app.listen(3000, () => console.log('Listening 3000'));
server.on('error', (e) => console.error('Error:', e));
setTimeout(() => console.log('Timeout'), 2000);
