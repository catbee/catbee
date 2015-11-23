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
var Logger = require('./Logger');
var path = require('path');
var util = require('util');
var hrTimeHelper = require('./helpers/hrTimeHelper');
var routes = [];

try {
  routes = require(path.join(process.cwd(), 'routes'));
} catch (e) {
  // do nothing
}

const INFO_SIGNAL_FILE_FOUND = 'Signal file found at %s';
const INFO_WATCHER_FOUND = 'Watcher "%s" found at %s';
const INFO_COMPONENT_FOUND = 'Component "%s" found at %s';
const INFO_BUNDLE_BUILT = 'Browser bundle has been built at %s (%s)';

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

    locator.register('moduleApiProvider', ModuleApiProvider, configObject);
    locator.register('cookieWrapper', CookieWrapper, configObject);
    locator.register('browserBundleBuilder', BrowserBundleBuilder, configObject, true);
    locator.register('bootstrapperBuilder', BootstrapperBuilder, configObject, true);
    locator.register('componentFinder', ComponentFinder, configObject, true);
    locator.register('injectionFinder', InjectionFinder, configObject, true);
    locator.register('signalFinder', SignalFinder, configObject, true);
    locator.register('watcherFinder', WatcherFinder, configObject, true);
    locator.register('logger', Logger, configObject, true);

    /**
     * @type {Logger|Object}
     */
    var logger = locator.resolve('logger');
    process.on('uncaughtException', error => logger.fatal(error));

    /**
     * @type {EventEmitter|Object}
     */
    var eventBus = locator.resolve('eventBus');
    this._wrapEventsWithLogger(configObject, eventBus, logger);

    routes.forEach(routeDefinition => locator.registerInstance('routeDefinition', routeDefinition));
  }

  _wrapEventsWithLogger (config, eventBus, logger) {
    super._wrapEventsWithLogger(config, eventBus, logger);

    eventBus
      .on('signalFileFound', args => {
        logger.info(util.format(
          INFO_SIGNAL_FILE_FOUND,
          args.path
        ));
      })
      .on('watcherFound', args => {
        logger.info(util.format(
          INFO_WATCHER_FOUND,
          args.name, args.path
        ));
      })
      .on('componentFound', args => {
        logger.info(util.format(
          INFO_COMPONENT_FOUND,
          args.name, args.path
        ));
      })
      .on('bundleBuilt', args => {
        logger.info(util.format(
          INFO_BUNDLE_BUILT, args.path,
          hrTimeHelper.toMessage(args.hrTime)
        ));
      });
  }
}

module.exports = new Bootstrapper();
