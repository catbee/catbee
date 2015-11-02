var BootstrapperBase = require('./base/BootstrapperBase');
var ModuleApiProvider = require('./providers/ModuleApiProvider');
var CookieWrapper = require('./CookieWrapper');
var BrowserBundleBuilder = require('./builders/BrowserBundleBuilder');
var BootstrapperBuilder = require('./builders/BootstrapperBuilder');
var ComponentFinder = require('./finders/ComponentFinder');
var InjectionFinder = require('./finders/InjectionFinder');
var SignalFinder = require('./finders/SignalFinder');
var WatcherFinder = require('./finders/WatcherFinder');
var Catberry = require('./Catberry');
var path = require('path');
var routes = [];
var Log4js = require('log4js');

try {
  routes = require(path.join(process.cwd(), 'routes'));
} catch (e) {
  // do nothing
}

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

    locator.register('moduleApiProvider', ModuleApiProvider, configObject);
    locator.register('cookieWrapper', CookieWrapper, configObject);
    locator.register('browserBundleBuilder', BrowserBundleBuilder, configObject, true);
    locator.register('bootstrapperBuilder', BootstrapperBuilder, configObject, true);
    locator.register('componentFinder', ComponentFinder, configObject, true);
    locator.register('injectionFinder', InjectionFinder, configObject, true);
    locator.register('signalFinder', SignalFinder, configObject, true);
    locator.register('watcherFinder', WatcherFinder, configObject, true);

    Log4js.configure(configObject.logger);
    var logger = Log4js.getLogger('catberry');
    locator.registerInstance('log4js', Log4js);
    locator.registerInstance('logger', logger);

    process.on('uncaughtException', error => logger.fatal(error));

    routes.forEach((routeDefinition) => locator.registerInstance('routeDefinition', routeDefinition));
  }
}

module.exports = new Bootstrapper();
