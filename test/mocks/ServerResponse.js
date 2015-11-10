var Writable = require('stream').Writable;

class ServerResponse extends Writable {
  constructor () {
    super();
    this.setHeaders = {};
  }

  result = '';

  status = 200;

  setHeaders = null;

  headersSent = false;

  writeHead (code, headers) {
    if (this.headersSent) {
      throw new Error('Headers were sent');
    }
    this.status = code;
    this.setHeaders = headers;
  }

  end () {
    super.end(...arguments);
  }

  _write (chunk, encoding, callback) {
    if (this.isEnded) {
      throw new Error('Write after EOF');
    }
    this.headersSent = true;
    this.result += chunk;
    callback();
  }
}

module.exports = ServerResponse;
