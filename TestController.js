// Simple WebsocketController for testing
console.log('Creating WebsocketController class...');

class WebsocketController {
  constructor(server, io, app) {
    console.log('WebsocketController constructor called');
    this.server = server;
    this.io = io;
    this.app = app;
  }
  
  test() {
    console.log('Test method called');
  }
}

console.log('Exporting WebsocketController...');
module.exports = WebsocketController;
console.log('Export complete');
