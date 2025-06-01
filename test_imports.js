// Minimal test to check imports
console.log('Testing imports one by one...');

try {
  console.log('1. Testing express...');
  const express = require("express");
  console.log('✓ express OK');

  console.log('2. Testing cors...');
  const cors = require("cors");
  console.log('✓ cors OK');

  console.log('3. Testing http...');
  const http = require("http");
  console.log('✓ http OK');

  console.log('4. Testing body-parser...');
  const bodyParser = require("body-parser");
  console.log('✓ body-parser OK');

  console.log('5. Testing socket.io...');
  const socketIO = require("socket.io");
  console.log('✓ socket.io OK');

  console.log('6. Testing node-routeros...');
  const { RouterOSAPI } = require("node-routeros");
  console.log('✓ node-routeros OK');

  console.log('7. Testing pm2...');
  const pm2 = require("pm2");
  console.log('✓ pm2 OK');

  console.log('8. Testing ssh2...');
  const { Client } = require("ssh2");
  console.log('✓ ssh2 OK');

  console.log('All imports successful!');
} catch (err) {
  console.error('Import error:', err.message);
  console.error('Stack:', err.stack);
}
