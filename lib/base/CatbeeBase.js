var ServiceLocator = require('catberry-locator');

class CatbeeBase {
  /**
   * Creates new instance of the basic Catbee application module
   * @constructor
   */
  constructor () {
    this.locator = new ServiceLocator();
    this.locator.registerInstance('serviceLocator', this.locator);
    this.locator.registerInstance('catbee', this);
  }

  // Current version of catbee.
  version = '3.0.0-dev';

  // Current object with events.
  events = null;

  // Current service locator.
  locator = null;
}

module.exports = CatbeeBase;
