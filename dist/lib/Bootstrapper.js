'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

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
var babel = require('catberry-es6');
var path = require('path');
var util = require('util');
var hrTimeHelper = require('./helpers/hrTimeHelper');
var routes = [];

try {
  routes = require(path.join(process.cwd(), 'routes'));
} catch (e) {
  // do nothing
}

var INFO_SIGNAL_FILE_FOUND = 'Signal file found at %s';
var INFO_WATCHER_FOUND = 'Watcher "%s" found at %s';
var INFO_COMPONENT_FOUND = 'Component "%s" found at %s';
var INFO_BUNDLE_BUILT = 'Browser bundle has been built at %s (%s)';

var Bootstrapper = (function (_BootstrapperBase) {
  _inherits(Bootstrapper, _BootstrapperBase);

  /**
   * Creates new instance of server Catberry's bootstrapper.
   * @constructor
   * @extends BootstrapperBase
   */

  function Bootstrapper() {
    _classCallCheck(this, Bootstrapper);

    _get(Object.getPrototypeOf(Bootstrapper.prototype), 'constructor', this).call(this, Catberry);
  }

  /**
   * Configures Catberry's locator.
   * @param {Object} configObject Config object.
   * @param {ServiceLocator} locator Service locator to configure.
   */

  _createClass(Bootstrapper, [{
    key: 'configure',
    value: function configure(configObject, locator) {
      _get(Object.getPrototypeOf(Bootstrapper.prototype), 'configure', this).call(this, configObject, locator);

      locator.register('moduleApiProvider', ModuleApiProvider, configObject);
      locator.register('cookieWrapper', CookieWrapper, configObject);
      locator.register('browserBundleBuilder', BrowserBundleBuilder, configObject, true);
      locator.register('bootstrapperBuilder', BootstrapperBuilder, configObject, true);
      locator.register('componentFinder', ComponentFinder, configObject, true);
      locator.register('injectionFinder', InjectionFinder, configObject, true);
      locator.register('signalFinder', SignalFinder, configObject, true);
      locator.register('watcherFinder', WatcherFinder, configObject, true);
      locator.register('logger', Logger, configObject, true);

      babel.register(locator);

      /**
       * @type {Logger|Object}
       */
      var logger = locator.resolve('logger');
      process.on('uncaughtException', function (error) {
        return logger.fatal(error);
      });

      /**
       * @type {EventEmitter|Object}
       */
      var eventBus = locator.resolve('eventBus');
      this._wrapEventsWithLogger(configObject, eventBus, logger);

      routes.forEach(function (routeDefinition) {
        return locator.registerInstance('routeDefinition', routeDefinition);
      });
    }
  }, {
    key: '_wrapEventsWithLogger',
    value: function _wrapEventsWithLogger(config, eventBus, logger) {
      _get(Object.getPrototypeOf(Bootstrapper.prototype), '_wrapEventsWithLogger', this).call(this, config, eventBus, logger);

      eventBus.on('signalFileFound', function (args) {
        logger.info(util.format(INFO_SIGNAL_FILE_FOUND, args.path));
      }).on('watcherFound', function (args) {
        logger.info(util.format(INFO_WATCHER_FOUND, args.name, args.path));
      }).on('componentFound', function (args) {
        logger.info(util.format(INFO_COMPONENT_FOUND, args.name, args.path));
      }).on('bundleBuilt', function (args) {
        logger.info(util.format(INFO_BUNDLE_BUILT, args.path, hrTimeHelper.toMessage(args.hrTime)));
      });
    }
  }]);

  return Bootstrapper;
})(BootstrapperBase);

module.exports = new Bootstrapper();