var BootstrapperBase = require('./base/BootstrapperBase');
var StoreDispatcher = require('./StoreDispatcher');
var ModuleApiProvider = require('./providers/ModuleApiProvider');
var CookieWrapper = require('./CookieWrapper');
var BrowserBundleBuilder = require('./builders/BrowserBundleBuilder');
var BootstrapperBuilder = require('./builders/BootstrapperBuilder');
var StoreFinder = require('./finders/StoreFinder');
var ComponentFinder = require('./finders/ComponentFinder');
var InjectionFinder = require('./finders/InjectionFinder');
var Catberry = require('./Catberry');

var routes = [];

class Bootstrapper extends BootstrapperBase {
  /**
   * Creates new instance of server Catberry's bootstrapper.
   * @constructor
   * @extends BootstrapperBase
   */
  constructor () {
    super(Catberry);
  }

  /**
   * Configures Catberry's locator.
   * @param {Object} configObject Config object.
   * @param {ServiceLocator} locator Service locator to configure.
   */
  configure (configObject, locator) {
    super.configure(configObject, locator);

    // if V8 still does not have promises then add it.
    if (!('Promise' in global)) {
      global.Promise = locator.resolve('promise');
    }

    locator.register('storeDispatcher', StoreDispatcher, configObject);
    locator.register('moduleApiProvider', ModuleApiProvider, configObject);
    locator.register('cookieWrapper', CookieWrapper, configObject);
    locator.register('browserBundleBuilder', BrowserBundleBuilder, configObject, true);
    locator.register('bootstrapperBuilder', BootstrapperBuilder, configObject, true);
    locator.register('storeFinder', StoreFinder, configObject, true);
    locator.register('componentFinder', ComponentFinder, configObject, true);
    locator.register('injectionFinder', InjectionFinder, configObject, true);

    routes.forEach((routeDefinition) => locator.registerInstance('routeDefinition', routeDefinition));
  }
}

module.exports = new Bootstrapper();
