
let chai = require('chai');

let desu = require('../src/index.js');

let assert = chai.assert;

describe('Server', function () {

  it('should be constructable without parameters', (done) => {
    let server = new desu.Server();
    server.on('error', done);
    server.on('close', done);
    server.on('ready', () => {
      server.close();
    });
  });

  it('should be constructable with options', (done) => {
    let options = {
      storage: '.test-server',
      port: '3001',
      name: 'Test Server',
      icon: 'http://cdn.example.com/test.png'
    };
    let server = new desu.Server(options);
    server.on('error', done);
    server.on('close', done);
    server.on('ready', () => {
      server.close();
    });
    
  });

  it('should be constructable with createServer', async () => {
    let options = {
      storage: '.test-server',
      port: '3001'
    };
    let server = await desu.createServer(options);
    await server.close();
  });

  it('should be constructable with createServer with no options', async () => {
    let server = await desu.createServer();
    await server.close();
  });

  it('should publish the info route', async () => {
    let options = {
      storage: '.test-server',
      port: '3001',
      name: 'Test Server',
      icon: 'http://cdn.example.com/test.png'
    };
    let server = await desu.createServer(options);

    let res = await fetch('http://localhost:3001/info');
    assert.equal(200, res.status);

    let info = await res.json();
    assert.equal(1, info.version);
    assert.equal('Test Server', info.name);
    assert.equal('http://cdn.example.com/test.png', info.icon);
    assert.notEqual(0, info.time);

    await server.close();
  });

  it('should publish the info route, with prefix', async () => {
    let options = {
      storage: '.test-server',
      port: '3001',
      prefix: '/desu',
      name: 'Test Server',
      icon: 'http://cdn.example.com/test.png'
    };
    let server = await desu.createServer(options);

    let res = await fetch('http://localhost:3001/desu/info');
    assert.equal(200, res.status);

    let info = await res.json();
    assert.equal(1, info.version);
    assert.equal('Test Server', info.name);
    assert.equal('http://cdn.example.com/test.png', info.icon);
    assert.notEqual(0, info.time);

    await server.close();
  });

  it('should pass messages', async () => {
    let options = {
      storage: '.test-server',
      port: '3001'
    };
    let server = await desu.createServer(options);

    let message = {
      body: "This is a cyphertext, really!"
    };

    let res = await fetch('http://localhost:3001/', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message)
    });
    assert.equal(200, res.status);

    await server.close();
  }); 
});

