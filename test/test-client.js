
let chai = require('chai');

let desu = require('../src/index.js');

let assert = chai.assert;

describe('Client', function () {
  it('should be constructable without options', (done) => {
    let client = new desu.Client();
    client.on('error', done);
    client.on('close', done);
    client.on('ready', () => {
      client.close();
    });
  });

  it('should be constructable with parameters', (done) => {
    let options = {
      storage: '.test-client'
    };

    let client = new desu.Client(options);
    client.on('error', done);
    client.on('close', done);
    client.on('ready', () => {
      client.close();
    });
  });

  it('should be constructable with createClient without options', async () => {
    let client = await desu.createClient();
    await client.close();
  });

  it('should be constructable with createClient with options', async () => {
    let options = {
      storage: '.test-client'
    };

    let client = await desu.createClient(options);
    await client.close();
  });

  it('should connect to server', async () => {
    let server = await desu.createServer({
      name: 'Test Server',
      storage: '.test-server',
      port: 3002
    });

    let client = await desu.createClient({
      storage: '.test-client'
    });

    await client.connect('http://localhost:3002');

    let servers = client.getServers();
    assert.equal(1, servers.length);
    assert.equal('http://localhost:3002', servers[0].url);
    assert.equal('Test Server', servers[0].name);

    await client.close();
    await server.close();
  });
});