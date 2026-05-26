const http = require('http');
const port = process.env.PORT || 3001;
const hostname = process.env.HOSTNAME || '0.0.0.0';

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(`<!DOCTYPE html><html><body><h1>✅ Test Server Running on port ${port}</h1><p>Time: ${new Date().toISOString()}</p></body></html>`);
});

server.listen(port, hostname, () => {
  console.log(`[${new Date().toISOString()}] Test server listening on http://${hostname}:${port}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`HOSTNAME: ${hostname}`);
  console.log(`PORT: ${port}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});
