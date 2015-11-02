/**
 * __BrowserBundle.js template file
 * @reference builders/BootstrapperBuilder
 */
var Catberry = require('./node_modules/catbee/browser/Catberry.js');
var BootstrapperBase = require('./node_modules/catbee/lib/base/BootstrapperBase.js');
var StoreDispatcher = require('./node_modules/catbee/lib/StoreDispatcher');
var ModuleApiProvider = require('./node_modules/catbee/browser/providers/ModuleApiProvider');
var CookieWrapper = require('./node_modules/catbee/browser/CookieWrapper');
var Logger = require('./node_modules/catberry/browser/Logger.js');

/*eslint-disable */
var stores = [ /**__stores**/ ];
var components = [ /**__components**/ ];
var routes = '__routes' || [];
/*eslint-enable */

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

    if (!('Promise' in window)) {
      window.Promise = locator.resolve('promise');
    }

    locator.register('storeDispatcher', StoreDispatcher, configObject, true);
    locator.register('moduleApiProvider', ModuleApiProvider, configObject, true);
    locator.register('cookieWrapper', CookieWrapper, configObject, true);
    locator.registerInstance('window', window);

    var loggerConfig = configObject.logger || {};
    var logger = new Logger(loggerConfig.levels);
    locator.registerInstance('logger', logger);

    window.onerror = function errorHandler(msg, uri, line) {
      logger.fatal(uri + ':' + line + ' ' + msg);
      return true;
    };

    routes.forEach((route) => locator.registerInstance('routeDefinition', route));
    stores.forEach((store) => locator.registerInstance('store', store));
    components.forEach((component) => locator.registerInstance('component', component));
  }
}

module.exports = new Bootstrapper();
