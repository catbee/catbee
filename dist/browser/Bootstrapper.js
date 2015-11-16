/**
 * __BrowserBundle.js template file
 * @reference builders/BootstrapperBuilder
 */
'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var Catberry = require('./node_modules/catberry/browser/Catberry.js');
var BootstrapperBase = require('./node_modules/catberry/lib/base/BootstrapperBase.js');
var ModuleApiProvider = require('./node_modules/catberry/browser/providers/ModuleApiProvider');
var CookieWrapper = require('./node_modules/catberry/browser/CookieWrapper');
var Logger = require('./node_modules/catberry/browser/Logger.js');
var util = require('util');

/*eslint-disable */
var watchers = [/**__watchers**/];
var components = [/**__components**/];
var signals = [/**__signals**/];
var routes = '__routes' || [];
/*eslint-enable */

var DEBUG_DOCUMENT_UPDATED = 'Document updated (%d watcher(s) changed)';
var DEBUG_COMPONENT_BOUND = 'Component "%s" is bound';
var DEBUG_COMPONENT_UNBOUND = 'Component "%s" is unbound';

/**
 * Creates new instance of the browser Catberry's bootstrapper.
 * @constructor
 * @extends BootstrapperBase
 */

var Bootstrapper = (function (_BootstrapperBase) {
  _inherits(Bootstrapper, _BootstrapperBase);

  function Bootstrapper() {
    _classCallCheck(this, Bootstrapper);

    _get(Object.getPrototypeOf(Bootstrapper.prototype), 'constructor', this).call(this, Catberry);

    this.create = this.create.bind(this);
  }

  /**
   * Configures Catberry's service locator.
   * @param {Object} configObject Application config object.
   * @param {ServiceLocator} locator Service locator to configure.
   */

  _createClass(Bootstrapper, [{
    key: 'configure',
    value: function configure(configObject, locator) {
      _get(Object.getPrototypeOf(Bootstrapper.prototype), 'configure', this).call(this, configObject, locator);

      locator.register('moduleApiProvider', ModuleApiProvider, configObject, true);
      locator.register('cookieWrapper', CookieWrapper, configObject, true);
      locator.register('logger', Logger, configObject, true);
      locator.registerInstance('window', window);

      var logger = locator.resolve('logger');
      var eventBus = locator.resolve('eventBus');
      this._wrapEventsWithLogger(configObject, eventBus, logger);

      window.onerror = function errorHandler(msg, uri, line) {
        logger.fatal(uri + ':' + line + ' ' + msg);
        return true;
      };

      routes.forEach(function (route) {
        return locator.registerInstance('routeDefinition', route);
      });
      watchers.forEach(function (watcher) {
        return locator.registerInstance('watcher', watcher);
      });
      signals.forEach(function (signal) {
        return locator.registerInstance('signal', signal);
      });
      components.forEach(function (component) {
        return locator.registerInstance('component', component);
      });
    }
  }, {
    key: '_wrapEventsWithLogger',
    value: function _wrapEventsWithLogger(config, eventBus, logger) {
      _get(Object.getPrototypeOf(Bootstrapper.prototype), '_wrapEventsWithLogger', this).call(this, config, eventBus, logger);
      var isRelease = Boolean(config.isRelease);

      if (isRelease) {
        return;
      }

      eventBus.on('documentUpdated', function (args) {
        logger.debug(util.format(DEBUG_DOCUMENT_UPDATED, args.length));
      }).on('componentBound', function (args) {
        logger.debug(util.format(DEBUG_COMPONENT_BOUND, args.element.tagName + (args.id ? '#' + args.id : '')));
      }).on('componentUnbound', function (args) {
        logger.debug(util.format(DEBUG_COMPONENT_UNBOUND, args.element.tagName + (args.id ? '#' + args.id : '')));
      });
    }
  }]);

  return Bootstrapper;
})(BootstrapperBase);

module.exports = new Bootstrapper();