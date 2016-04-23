var URLArgsProvider = require('../providers/URLArgsProvider');
var RequestRouter = require('../RequestRouter');
var ContextFactory = require('../ContextFactory');
var ModuleApiProviderBase = require('../base/ModuleApiProviderBase');
var EventEmitter = require('events').EventEmitter;

class BootstrapperBase {
  // Creates new instance of base Catbee bootstrapper of the Catbee's main module.
  constructor (catbeeConstructor) {
    this._catbeeConstructor = catbeeConstructor;
  }

  // Current constructor of the Catbee's main module.
  _catbeeConstructor = null;

  // Creates new full-configured instance of the Catbee application.
  create (configObject = {}) {
    var catbee = new this._catbeeConstructor();
    this.configure(configObject, catbee.locator);
    catbee.events = catbee.locator.resolveInstance(ModuleApiProviderBase);
    return catbee;
  }

  // Configures locator with all required type registrations.
  configure (configObject, locator) {
    var eventBus = new EventEmitter();
    eventBus.setMaxListeners(0);

    locator.registerInstance('eventBus', eventBus);
    locator.registerInstance('config', configObject);
    locator.register('urlArgsProvider', URLArgsProvider, configObject, true);
    locator.register('contextFactory', ContextFactory, configObject, true);
    locator.register('requestRouter', RequestRouter, configObject, true);
  }
}

module.exports = BootstrapperBase;
