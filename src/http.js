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

module.exports = http;