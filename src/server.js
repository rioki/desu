
let EventEmitter = require('node:events');
let loki         = require('lokijs');
let restify      = require('restify');
let morgan       = require('morgan');

let version = 1;

let defaults = {
  storage: '.server-data',
  port: 9350,
  prefix: '',
  lifetime: 604800000, // one week
  name: 'A Desu Server',
  icon: 'https://www.rioki.org/favicon.ico'
};

function trimLokiMeta(element) {
  element.id = element.$loki;
  delete element.$loki;
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
    message.received = Date.now();

    let messages = this._getMessagesCollection();
    let result = messages.insert(message);
    return {
      id: result.$loki,
      submitted: true,
      received: message.received
    }
  }

  getMessages(options) {
    let limit   = options.limit ? options.limit : 100;
    let offset  = options.offset ? options.offset : 0;
    let minTime = options.minTime ? options.minTime : 0;

    let messages = this._getMessagesCollection();
    return messages.chain()
                   .find({received: {'$gte': minTime}})
                   .simplesort('received')
                   .offset(offset)
                   .limit(limit)
                   .data()
                   .map(trimLokiMeta);
  }

  prune(maxTime) {
    let messages = this._getMessagesCollection();
    return messages.chain()
                   .find({received: {'$lt': maxTime}})
                   .remove();
  }

  // This is used to reset before unit tests.
  reset() {
    this.loki.removeCollection('messages');
  }

  _getMessagesCollection() {
    let servers = this.loki.getCollection('messages');
    if (!servers) {
      servers = this.loki.addCollection('messages', { indices: ['received'] });
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
          lifetime: this.options.lifetime,
          time: Date.now()
        });
        next();
      });

      this.server.post(prefix + '/', (req, res, next) => {
        res.json(this.storage.addMessage(req.body));
        next();
      });

      this.server.get(prefix + '/', (req, res, next) => {
        let messages = this.storage.getMessages(req.query);
        res.json({
          messages
        });
        next();
      });

      this.server.listen(this.options.port, () => {
        this.emit('ready');
      });

      this.pruneInterval = setInterval(() => {
        this.storage.prune(Date.now() - this.options.lifetime);
      }, 30000);
    }

    this.storage = new Storage(this.options.storage, onDbReady)
  }

  close() {
    return new Promise((resolve) => {
      clearInterval(this.pruneInterval);
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
