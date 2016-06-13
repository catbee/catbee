'use strict';

var URLArgsProvider = require('../providers/URLArgsProvider');
var RequestRouter = require('../RequestRouter');
var ContextFactory = require('../ContextFactory');
var ModuleApiProviderBase = require('../base/ModuleApiProviderBase');
var EventEmitter = require('events').EventEmitter;

class BootstrapperBase {
  /**
   * Creates new instance of base Catbee bootstrapper.
   * of the Catbee's main module.
   * @constructor
   * @param {Function} catbeeConstructor Constructor
   */
  constructor (catbeeConstructor) {
    /**
     * Current constructor of the Catbee's main module.
     * @type {Function}
     * @private
     */
    this._catbeeConstructor = catbeeConstructor;
  }

  /**
   * Creates new full-configured instance of the Catbee application.
   * @param {Object?} [configObject={}] Configuration object.
   * @returns {Catbee} Catbee application instance.
   */
  create (configObject) {
    configObject = configObject || {};
    var catbee = new this._catbeeConstructor();
    this.configure(configObject, catbee.locator);
    return catbee;
  }

  /**
   * Configures locator with all required type registrations.
   * @param {Object} configObject Configuration object.
   * @param {ServiceLocator} locator Service locator to configure.
   */
  configure (configObject, locator) {
    var eventBus = new EventEmitter();
    eventBus.setMaxListeners(0);

    locator.registerInstance('eventBus', eventBus);
    locator.registerInstance('config', configObject);
    locator.register('urlArgsProvider', URLArgsProvider, true);
    locator.register('contextFactory', ContextFactory, true);
    locator.register('requestRouter', RequestRouter, true);
  }
}

module.exports = BootstrapperBase;
