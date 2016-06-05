'use strict';

var BootstrapperBase = require('./base/BootstrapperBase');
var ModuleApiProvider = require('./providers/ModuleApiProvider');
var CookieWrapper = require('./CookieWrapper');
var Catbee = require('./Catbee');

class Bootstrapper extends BootstrapperBase {
  /**
   * Creates new instance of server Catbee's bootstrapper.
   * @constructor
   * @extends BootstrapperBase
   */
  constructor () {
    super(Catbee);
  }

  /**
   * Configures Catbee's locator.
   * @param {Object} configObject Config object.
   * @param {ServiceLocator} locator Service locator to configure.
   */
  configure (configObject, locator) {
    super.configure(configObject, locator);

    locator.register('moduleApiProvider', ModuleApiProvider, configObject);
    locator.register('cookieWrapper', CookieWrapper, configObject);
  }
}

module.exports = new Bootstrapper();
