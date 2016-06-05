'use strict';

var ServiceLocator = require('catberry-locator');

/**
 * Implements the basic Catbee class for both server and browser environments.
 */
class CatbeeBase {
  /**
   * Creates a new instance of the basic Catbee application module.
   */
  constructor () {
    /**
     * Current version of Catbee.
     */
    this.version = '3.0.0-dev';

    /**
     * Current service locator.
     * @type {ServiceLocator}
     */
    this.locator = new ServiceLocator();

    this.locator.registerInstance('serviceLocator', this.locator);
    this.locator.registerInstance('catbee', this);
  }

  /**
   * Validate and register router definition in service locator
   * @param {Object} definition
   * @param {String} definition.expression
   */
  registerRoute (definition) {
    if (!definition || typeof definition !== 'object') {
      return;
    }

    this.locator.registerInstance('routeDefinition', definition);
  }
}

module.exports = CatbeeBase;
