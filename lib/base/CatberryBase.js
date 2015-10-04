var ServiceLocator = require('catberry-locator');

class CatberryBase {
  /**
   * Creates new instance of the basic Catberry application module
   * @constructor
   */
  constructor () {
    this.locator = new ServiceLocator();
    this.locator.registerInstance('serviceLocator', this.locator);
    this.locator.registerInstance('catberry', this);
  }

  /**
   * Current version of catberry.
   * @type {String}
   */
  version = '6.2.1';

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
