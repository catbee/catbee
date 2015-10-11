var Promise = require('promise');
var StateProvider = require('../providers/StateProvider');
var ComponentLoader = require('../loaders/ComponentLoader');
var SignalLoader = require('../loaders/SignalLoader');
var DocumentRenderer = require('../DocumentRenderer');
var RequestRouter = require('../RequestRouter');
var ContextFactory = require('../ContextFactory');
var EventEmitter = require('events').EventEmitter;

class BootstrapperBase {
  /**
   * Creates new instance of base Catberry bootstrapper.
   * of the Catberry's main module.
   * @constructor
   * @param {Function} catberryConstructor Constructor
   */
  constructor (catberryConstructor) {
    this._catberryConstructor = catberryConstructor;
  }

  /**
   * Current constructor of the Catberry's main module.
   * @type {Function}
   * @private
   */
  _catberryConstructor = null;

  /**
   * Creates new full-configured instance of the Catberry application.
   * @param {Object?} [configObject={}] Configuration object.
   * @returns {Catberry} Catberry application instance.
   */
  create (configObject = {}) {
    var catberry = new this._catberryConstructor();
    this.configure(configObject, catberry.locator);
    return catberry;
  }

  /**
   * Configures locator with all required type registrations.
   * @param {Object} configObject Configuration object.
   * @param {ServiceLocator} locator Service locator to configure.
   */
  configure (configObject, locator) {
    var eventBus = new EventEmitter();
    eventBus.setMaxListeners(0);
    locator.registerInstance('promise', Promise);
    locator.registerInstance('eventBus', eventBus);
    locator.registerInstance('config', configObject);
    locator.register('stateProvider', StateProvider, configObject, true);
    locator.register('contextFactory', ContextFactory, configObject, true);
    locator.register('componentLoader', ComponentLoader, configObject, true);
    locator.register('signalLoader', SignalLoader, configObject, true);
    locator.register('documentRenderer', DocumentRenderer, configObject, true);
    locator.register('requestRouter', RequestRouter, configObject, true);
  }
}

module.exports = BootstrapperBase;
