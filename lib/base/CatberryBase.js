var ServiceLocator = require('catberry-locator');

class CatberryBase {
  /**
   * Creates new instance of the basic Catbee application module
   * @constructor
   */
  constructor () {
    this.locator = new ServiceLocator();
    this.locator.registerInstance('serviceLocator', this.locator);
    this.locator.registerInstance('catberry', this);
  }

  /**
   * Current version of catbee.
   * @type {String}
   */
  version = '1.0.0';

  /**
   * Current object with events.
   * @type {ModuleApiProvider}
   */
  events = null;

  /**
   * Current service locator.
   * @type {ServiceLocator}
   */
  locator = null;
}

module.exports = CatberryBase;
