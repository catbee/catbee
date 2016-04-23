var CatbeeBase = require('../lib/base/CatbeeBase');

class Catbee extends CatbeeBase {
  // Creates new instance of the browser version of Catbee.
  constructor () {
    super();
  }

  // Current request router.
  _router = null;

  // Wraps current HTML document with Catbee event handlers.
  wrapDocument () {
    this._router = this.locator.resolve('requestRouter');
  }

  // Starts Catbee application when DOM is ready.
  startWhenReady () {
    if (window.catbee) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      window.document.addEventListener('DOMContentLoaded', () => {
        this.wrapDocument();
        window.catbee = this;
        resolve();
      });
    });
  }
}

module.exports = Catbee;
