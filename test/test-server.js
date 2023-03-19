
let chai = require('chai');

let desu = require('../src/index.js');

let assert = chai.assert;

// This is a small helper to make code cleaner. 
// All input and output is considered to be JSON
let http = {
  get: async (url) => {
    let res = await fetch(url);
    if (res.status != 200) {
      throw `GET ${url} ${res.status}`;
    }
    let contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw `GET ${url} is not JSON`;
    }
    return res.json();
  },
  post: async (url, data) => {
    let res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (res.status != 200) {
      throw `GET ${urls} ${res.status}`;
    }
    return res.json();
  }
}

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

  it('should pass a messages', async () => {
    let options = {
      storage: '.test-server',
      port: '3001'
    };
    let server = await desu.createServer(options);
    server.storage.reset();

    let message = {
      body: "This is a cyphertext, really!"
    };

    let status = await http.post('http://localhost:3001/', message);
    assert.equal(true, status.submitted);

    let data = await http.get('http://localhost:3001/');
    assert.isOk(data.messages);
    assert.equal(1, data.messages.length);
    assert.isOk(data.messages[0].id); // the message number
    assert.isOk(data.messages[0].received); // the time recived
    assert.equal(message.body, data.messages[0].body);

    await server.close();
  }); 

  it('should pass messages', async () => {
    let options = {
      storage: '.test-server',
      port: '3001'
    };
    let server = await desu.createServer(options);
    server.storage.reset();

    let message1 = {
      body: "This is a cyphertext, really!"
    };
    let message2 = {
      body: "So thing thing happened."
    };

    let status = await http.post('http://localhost:3001/', message1);
    assert.equal(true, status.submitted);

    status = await http.post('http://localhost:3001/', message2);
    assert.equal(true, status.submitted);

    let data = await http.get('http://localhost:3001/');
    assert.isOk(data.messages);
    assert.equal(2, data.messages.length);
    assert.isOk(data.messages[0].id); 
    assert.isOk(data.messages[0].received);
    assert.equal(message1.body, data.messages[0].body);
    assert.isOk(data.messages[1].id); 
    assert.isOk(data.messages[1].received); 
    assert.equal(message2.body, data.messages[1].body);
    assert.isAbove(data.messages[1].id, data.messages[0].id);
    assert.isAtLeast(data.messages[1].received, data.messages[0].received);
    await server.close();
  }); 

  it('should respect limit', async () => {
    let options = {
      storage: '.test-server',
      port: '3001'
    };
    let server = await desu.createServer(options);
    server.storage.reset();

    let message1 = {
      body: "This is a cyphertext, really!"
    };
    let message2 = {
      body: "So thing thing happened."
    };

    let status = await http.post('http://localhost:3001/', message1);
    assert.equal(true, status.submitted);

    status = await http.post('http://localhost:3001/', message2);
    assert.equal(true, status.submitted);

    let data = await http.get('http://localhost:3001/?limit=1');
    assert.isOk(data.messages);
    assert.equal(1, data.messages.length);
    assert.equal(message1.body, data.messages[0].body);
    await server.close();
  }); 

  it('should respect offset', async () => {
    let options = {
      storage: '.test-server',
      port: '3001'
    };
    let server = await desu.createServer(options);
    server.storage.reset();

    let message1 = {
      body: "This is a cyphertext, really!"
    };
    let message2 = {
      body: "So thing thing happened."
    };

    let status = await http.post('http://localhost:3001/', message1);
    assert.equal(true, status.submitted);

    status = await http.post('http://localhost:3001/', message2);
    assert.equal(true, status.submitted);

    let data = await http.get('http://localhost:3001/?offset=1');
    assert.isOk(data.messages);
    assert.equal(1, data.messages.length);
    assert.equal(message2.body, data.messages[0].body);
    await server.close();
  }); 

  it('should respect offset and limit', async () => {
    let options = {
      storage: '.test-server',
      port: '3001'
    };
    let server = await desu.createServer(options);
    server.storage.reset();

    let message1 = {
      body: "This is a cyphertext, really!"
    };
    let message2 = {
      body: "So thing thing happened."
    };
    let message3 = {
      body: "Dear Sir, I come with a lucrative offer."
    };

    await http.post('http://localhost:3001/', message1);
    await http.post('http://localhost:3001/', message2);
    await http.post('http://localhost:3001/', message3);

    let data = await http.get('http://localhost:3001/?offset=1&limit=1');
    assert.isOk(data.messages);
    assert.equal(1, data.messages.length);
    assert.equal(message2.body, data.messages[0].body);
    await server.close();
  }); 

  it('should respect minTime', async () => {
    let options = {
      storage: '.test-server',
      port: '3001'
    };
    let server = await desu.createServer(options);
    server.storage.reset();

    let message1 = {
      body: "This is a cyphertext, really!"
    };
    let message2 = {
      body: "So thing thing happened."
    };
    let message3 = {
      body: "Dear Sir, I come with a lucrative offer."
    };

    await http.post('http://localhost:3001/', message1);
    let r1 = await http.post('http://localhost:3001/', message2);
    await http.post('http://localhost:3001/', message3);

    let data = await http.get(`http://localhost:3001/?minTime=${r1.received}`);
    assert.isOk(data.messages);
    assert.equal(2, data.messages.length);
    assert.equal(message2.body, data.messages[0].body);
    await server.close();
  }); 

  it('should prune messages', async () => {
    let options = {
      storage: '.test-server',
      port: '3001'
    };
    let server = await desu.createServer(options);
    server.storage.reset();

    let message1 = {
      body: "This is a cyphertext, really!"
    };
    let message2 = {
      body: "So thing thing happened."
    };
    let message3 = {
      body: "Dear Sir, I come with a lucrative offer."
    };

    await http.post('http://localhost:3001/', message1);
    let r1 = await http.post('http://localhost:3001/', message2);
    await http.post('http://localhost:3001/', message3);

    server.storage.prune(r1.received-1);

    let data = await http.get(`http://localhost:3001/`);
    assert.isOk(data.messages);
    assert.equal(2, data.messages.length);
    assert.equal(message2.body, data.messages[0].body);
    await server.close();
  }); 
});
