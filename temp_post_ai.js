const http = require('http');

const data = JSON.stringify({
  documentContent: 'Hello',
  cursorPosition: 5,
  precedingText: 'Hello',
  followingText: '',
  intent: 'continue_paragraph',
  selectedText: ''
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/ai/complete',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log('STATUS', res.statusCode);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    process.stdout.write(chunk);
  });
  res.on('end', () => {
    console.log('\n---END---');
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('problem with request:', e.message);
  process.exit(1);
});

req.write(data);
req.end();
