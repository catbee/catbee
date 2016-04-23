var Catbee = require('./Catbee.js');
var BootstrapperBase = require('../lib/base/BootstrapperBase.js');
var ModuleApiProvider = require('./providers/ModuleApiProvider');
var CookieWrapper = require('./CookieWrapper');

// Creates new instance of the browser Catbee's bootstrapper.
class Bootstrapper extends BootstrapperBase {
  constructor () {
    super(Catbee);

    this.create = this.create.bind(this);
  }

  // Configures Catbee's service locator.
  configure (configObject, locator) {
    super.configure(configObject, locator);

    locator.register('moduleApiProvider', ModuleApiProvider, configObject, true);
    locator.register('cookieWrapper', CookieWrapper, configObject, true);
    locator.registerInstance('window', window);

    var logger = locator.resolve('logger');
    var eventBus = locator.resolve('eventBus');

    window.addEventListener('error', (error) => eventBus.emit('error', error));
  }
}

module.exports = new Bootstrapper();
