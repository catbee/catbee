var CatbeeBase = require('./base/CatbeeBase');

class Catbee extends CatbeeBase {
  // Creates new instance of the server-side Catbee.
  constructor () {
    super();
  }

  // Current request router.
  _router = null;


  // Gets connect/express middleware.
  getMiddleware () {
    this._router = this.locator.resolve('requestRouter');
    return this._router.route.bind(this._router);
  }
}

module.exports = Catbee;
