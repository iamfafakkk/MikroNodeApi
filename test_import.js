// Test file to check WebsocketController import
console.log('Starting import test...');

try {
  console.log('Importing WebsocketController...');
  const WebsocketController = require('./controllers/WebsocketController');
  
  console.log('Import successful');
  console.log('Type:', typeof WebsocketController);
  console.log('Is function:', typeof WebsocketController === 'function');
  console.log('Name:', WebsocketController.name);
  
  if (typeof WebsocketController === 'function') {
    console.log('Attempting to create instance...');
    // Create mock objects for testing
    const mockServer = {};
    const mockIo = { on: () => {} };
    const mockApp = { get: () => {} };
    
    const instance = new WebsocketController(mockServer, mockIo, mockApp);
    console.log('Instance created successfully:', typeof instance);
  } else {
    console.log('WebsocketController is not a constructor function');
    console.log('Properties:', Object.getOwnPropertyNames(WebsocketController));
  }
} catch (err) {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
}
