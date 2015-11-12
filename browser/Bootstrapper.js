/**
 * __BrowserBundle.js template file
 * @reference builders/BootstrapperBuilder
 */
var Catberry = require('./node_modules/catbee/browser/Catberry.js');
var BootstrapperBase = require('./node_modules/catbee/lib/base/BootstrapperBase.js');
var StoreDispatcher = require('./node_modules/catbee/lib/StoreDispatcher');
var ModuleApiProvider = require('./node_modules/catbee/browser/providers/ModuleApiProvider');
var CookieWrapper = require('./node_modules/catbee/browser/CookieWrapper');
var Logger = require('./node_modules/catbee/browser/Logger.js');

var stores = [/** __stores **/];
var components = [/** __components **/];
var routes = '__routes' || [];

/**
 * Creates new instance of the browser Catberry's bootstrapper.
 * @constructor
 * @extends BootstrapperBase
 */
class Bootstrapper extends BootstrapperBase {
  constructor () {
    super(Catberry);
  }

  /**
   * Configures Catberry's service locator.
   * @param {Object} configObject Application config object.
   * @param {ServiceLocator} locator Service locator to configure.
   */
  configure (configObject, locator) {
    super.configure(configObject, locator);

    locator.register('storeDispatcher', StoreDispatcher, configObject, true);
    locator.register('moduleApiProvider', ModuleApiProvider, configObject, true);
    locator.register('cookieWrapper', CookieWrapper, configObject, true);
    locator.register('logger', Logger, configObject, true);
    locator.registerInstance('window', window);

    /**
     * @type {Logger|Object}
     */
    var logger = locator.resolve('logger');
    window.addEventListener('error', logger.onerror);

    routes.forEach((route) => locator.registerInstance('routeDefinition', route));
    stores.forEach((store) => locator.registerInstance('store', store));
    components.forEach((component) => locator.registerInstance('component', component));
  }
}

module.exports = new Bootstrapper();
