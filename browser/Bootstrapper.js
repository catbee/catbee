'use strict';

var Catbee = require('./Catbee.js');
var BootstrapperBase = require('../lib/base/BootstrapperBase.js');
var ModuleApiProvider = require('./providers/ModuleApiProvider');
var CookieWrapper = require('./CookieWrapper');

class Bootstrapper extends BootstrapperBase {
  /**
   * Creates new instance of the browser Catbee's bootstrapper.
   * @constructor
   * @extends BootstrapperBase
   */
  constructor () {
    super(Catbee);

    this.create = this.create.bind(this);
  }

  /**
   * Configures Catbee's service locator.
   * @param {Object} configObject Application config object.
   * @param {ServiceLocator} locator Service locator to configure.
   */
  configure (configObject, locator) {
    super.configure(configObject, locator);

    locator.register('moduleApiProvider', ModuleApiProvider, true);
    locator.register('cookieWrapper', CookieWrapper, true);
    locator.registerInstance('window', window);
  }
}

module.exports = new Bootstrapper();
