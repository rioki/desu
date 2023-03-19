
let EventEmitter = require('node:events');
let loki         = require('lokijs');
let restify      = require('restify');
let morgan       = require('morgan');

let version = 1;

let defaults = {
  storage: '.server-data',
  port: 9350,
  prefix: '',
  name: 'A Desu Server',
  icon: 'https://www.rioki.org/favicon.ico'
};

function trimLokiMeta(element) {
  element.id = e['$loki'];
  delete element['$loki'];
  delete element.meta;
  return element;
}

class Storage {
  constructor(file, ready) {
    this.loki = new loki(file, { 
      autosave: true, 
      autosaveInterval: 100,
      autoload: true,
      autoloadCallback: ready
    });
  }

  addMessage(message) {
    let messages = this._getMessagesCollection();
    messages.insert({
      received: Date.now(),
      message: message
    });
  }

  getMessages(options) {
    let limit  = options.limit ? options.limit : 100;
    let offset = options.offset ? options.offset : 0;

    let messages = this._getMessagesCollection();
    return messages.chain()
                   .simplesort('received')
                   .offset(offset)
                   .limit(limit)
                   .data()
                   .map(trimLokiMeta);
  }

  _getMessagesCollection() {
    let servers = this.store.getCollection('messages');
    if (!servers) {
      servers = this.store.addCollection('messages', { indices: ['received'] });
    }
    return servers;
  }
};

class Server extends EventEmitter {
  constructor(options) {
    super();

    this.options = {...defaults, ...options};

    let onDbReady = () => {
      this.server = restify.createServer();
      this.server.on('close', () => this.emit('close'));

      this.server.use(morgan('dev'));
      this.server.use(restify.plugins.queryParser({mapParams: false}));
      this.server.use(restify.plugins.bodyParser({mapParams: false}));

      let prefix = this.options.prefix;

      this.server.get(prefix + '/info', (req, res, next) => {
        res.json({
          version: version,
          name: this.options.name,
          icon: this.options.icon,
          time: Date.now()
        });
        next();
      });

      this.server.post(prefix + '/', (req, res, next) => {
        this.storage.addMessage(req.body);
        next();
      });

      this.server.listen(this.options.port, () => {
        this.emit('ready');
      });
    }

    this.storage = new Storage(options.storage, onDbReady)
  }

  close() {
    return new Promise((resolve) => {
      this.server.close();
      this.once('close', resolve);
    });
  }
};

function createServer(options, callback) {
  if (callback) {
    let server = new Server(options);
    server.on('ready', () => callback(null, server));
  }
  else {
    return new Promise((resolve) => {
      let server = new Server(options);
      server.on('ready', () => resolve(server));
    });
  }
}

module.exports.Server = Server;
module.exports.createServer = createServer;
