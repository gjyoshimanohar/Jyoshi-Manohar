const net = require('net');
const server = net.createServer();
server.listen(3000, '0.0.0.0', () => console.log('Listening'));
