
let EventEmitter = require('node:events');

class Client extends EventEmitter {
  constructor() {
    super();
    this.emit('ready');
  }
};

module.exports = Client;
