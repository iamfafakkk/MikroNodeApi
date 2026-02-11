// Test script for the new /trigger/event endpoint
const http = require('http');

// Test cases
const tests = [
  {
    name: 'Test with query parameter',
    url: 'http://localhost:3666/api/events/trigger/event?domain=example.com',
    method: 'GET'
  },
  {
    name: 'Test with missing domain parameter',
    url: 'http://localhost:3666/api/events/trigger/event',
    method: 'GET'
  },
  {
    name: 'Test with empty domain parameter',
    url: 'http://localhost:3666/api/events/trigger/event?domain=',
    method: 'GET'
  }
];

function runTest(test) {
  console.log(`\n=== ${test.name} ===`);
  
  const url = new URL(test.url);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: test.method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Response: ${data}`);
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error.message);
  });

  req.end();
}

// Run all tests
console.log('Testing /trigger/event endpoint...\n');

tests.forEach((test, index) => {
  setTimeout(() => {
    runTest(test);
  }, index * 1000); // Stagger requests by 1 second
});