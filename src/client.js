
let EventEmitter = require('node:events');
let loki         = require('lokijs');
let http         = require('./http');

let version = 1;

let defaults = {
  storage: '.client-data'
};

function trimLokiMeta(element) {
  element.id = element.$loki;
  delete element.$loki;
  delete element.meta;
  return element;
}

class Storage {
  constructor(file, readyCb) {
    this.loki = new loki(file, { 
      autosave: true, 
      autosaveInterval: 100,
      autoload: true,
      autoloadCallback: readyCb
    });
  }

  addServer(server) {
    let servers = this._getServersCollection();
    return servers.insert(server);
  }

  getServer(url) {
    let servers = this._getServersCollection();
    let server = servers.findOne({'url': url});
    if (server) {
      return trimLokiMeta(server);
    }
    return null;
  }

  getServers() {
    let servers = this._getServersCollection();
    return servers.chain()
                  .data()
                  .map(trimLokiMeta);
  }

  addChannel(server, channel) {
    channel.server = server.id;

    let channels = this._getChannelsCollection();
    channels.insert(channel);
  }

  getChannels(server) {
    let channels = this._getChannelsCollection();
    return channels.chain()
                   .find({server: server.id})
                   .simplesort('name')
                   .data()
                   .map(trimLokiMeta);
  }

  addMessage(server, channel, message) {
    message.server = server.id;
    message.channel = channel.id;

    let messages = this._getMessagesCollection();
    messages.insert(message);
  }

  getMessages(server, channel, options) {
    let limit = options.limit ? options.limit : 100;
    let offset = options.offset ? options.offset : 0;

    let messages = this._getMessagesCollection();
    return messages.chain()
                   .find({server: server.id, channel: channel.id})
                   .simplesort('postDate')
                   .offset(offset)
                   .limit(limit)
                   .data()
                   .map(trimLokiMeta);
  }

  _getServersCollection() {
    let servers = this.loki.getCollection('servers');
    if (!servers) {
      servers = this.loki.addCollection('servers', { indices: ['url'] });
    }
    return servers;
  }

  _getChannelsCollection() {
    let servers = this.loki.getCollection('channels');
    if (!servers) {
      servers = this.loki.addCollection('channels', { indices: ['server'] });
    }
    return servers;
  }

  _getMessagesCollection() {
    let servers = this.loki.getCollection('messages');
    if (!servers) {
      servers = this.loki.addCollection('messages', { indices: ['server', 'channel'] });
    }
    return servers;
  }
};

function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

function isInteger(value) {
  return Number.isInteger(value);
}

function cleanServerInfo(serverInfo) {
  return {
    version: isInteger(serverInfo.version) ? serverInfo.version : 1,
    name: isString(serverInfo.name) ? serverInfo.name : 'Unnamed Server',
    icon: isString(serverInfo.icon) ? serverInfo.icon : 'https://www.rioki.org/favicon.ico',
    lifetime: isInteger(serverInfo.lifetime) ? serverInfo.lifetime : 0
  };
}

class Server extends EventEmitter {
  constructor(storage, serverInfo) {
    super();

    this.storage  = storage;
    this.id       = serverInfo.id;
    this.url      = serverInfo.url;
    this.name     = serverInfo.name;
    this.icon     = serverInfo.icon;
    this.lifetime = serverInfo.lifetime;
  }
};

class Client extends EventEmitter {
  constructor(options) {
    super();

    this.servers = [];
    this.options = {...defaults, ...options};

    let onDbReady = () => {
      this.emit('ready');
    };

    this.storage = new Storage(this.options.storage, onDbReady);
  }

  async connect(url) {
    let serverInfo = this.storage.getServer(url);
    if (! serverInfo) {
      let infoUrl = `${url}/info`;
      console.log(infoUrl);
      serverInfo = cleanServerInfo(await http.get(infoUrl));
      serverInfo.url = url;
      serverInfo = this.storage.addServer(serverInfo);
    }

    let server = new Server(this.storage, serverInfo);
    this.servers.push(server)
    return server;
  }

  getServers() {
    return this.servers;
  }

  close() {
    this.emit('close');
  }
};

function createClient(options, callback) {
  if (callback) {
    let client = new Client(options);
    client.on('ready', () => callback(null, client));
  }
  else {
    return new Promise((resolve) => {
      let client = new Client(options);
      client.on('ready', () => resolve(client));
    });
  }
}

module.exports.Client = Client;
module.exports.createClient = createClient;
