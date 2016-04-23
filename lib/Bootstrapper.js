'use strict';

var BootstrapperBase = require('./base/BootstrapperBase');
var ModuleApiProvider = require('./providers/ModuleApiProvider');
var CookieWrapper = require('./CookieWrapper');
var Catbee = require('./Catbee');

class Bootstrapper extends BootstrapperBase {
  // Creates new instance of server Catbee's bootstrapper.
  constructor () {
    super(Catbee);
  }

  // Configures Catbee's locator.
  configure (configObject, locator) {
    super.configure(configObject, locator);

    locator.register('moduleApiProvider', ModuleApiProvider, configObject);
    locator.register('cookieWrapper', CookieWrapper, configObject);

    var eventBus = locator.resolve('eventBus');
    process.on('uncaughtException', error => eventBus.emit('error', error));
  }
}

module.exports = new Bootstrapper();
