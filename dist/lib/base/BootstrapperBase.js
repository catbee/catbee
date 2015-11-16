'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var URLArgsProvider = require('../providers/URLArgsProvider');
var ComponentLoader = require('../loaders/ComponentLoader');
var SignalLoader = require('../loaders/SignalLoader');
var WatcherLoader = require('../loaders/WatcherLoader');
var DocumentRenderer = require('../DocumentRenderer');
var RequestRouter = require('../RequestRouter');
var ContextFactory = require('../ContextFactory');
var ModuleApiProviderBase = require('../base/ModuleApiProviderBase');
var EventEmitter = require('events').EventEmitter;
var moduleHelper = require('../helpers/moduleHelper');
var hrTimeHelper = require('../helpers/hrTimeHelper');
var util = require('util');
var uhr = require('catberry-uhr');

var INFO_COMPONENT_LOADED = 'Component "%s" loaded';
var INFO_SIGNAL_LOADED = 'Signal "%s" loaded';
var INFO_WATCHER_LOADED = 'Watcher "%s" loaded';
var INFO_ALL_SIGNALS_LOADED = 'All signals loaded';
var INFO_ALL_WATCHERS_LOADED = 'All watchers loaded';
var INFO_ALL_COMPONENTS_LOADED = 'All components loaded';
var DEBUG_DOCUMENT_RENDERED = 'Document rendered for URI %s';
var DEBUG_RENDER_COMPONENT = 'Component "%s%s" is being rendered...';
var DEBUG_COMPONENT_RENDERED = 'Component "%s%s" rendered%s';

var BootstrapperBase = (function () {
  /**
   * Creates new instance of base Catberry bootstrapper.
   * of the Catberry's main module.
   * @constructor
   * @param {Function} catberryConstructor Constructor
   */

  function BootstrapperBase(catberryConstructor) {
    _classCallCheck(this, BootstrapperBase);

    this._catberryConstructor = null;

    this._catberryConstructor = catberryConstructor;
  }

  /**
   * Current constructor of the Catberry's main module.
   * @type {Function}
   * @private
   */

  _createClass(BootstrapperBase, [{
    key: 'create',

    /**
     * Creates new full-configured instance of the Catberry application.
     * @param {Object?} [configObject={}] Configuration object.
     * @returns {Catberry} Catberry application instance.
     */
    value: function create() {
      var configObject = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var catberry = new this._catberryConstructor();
      this.configure(configObject, catberry.locator);
      catberry.events = catberry.locator.resolveInstance(ModuleApiProviderBase);
      return catberry;
    }

    /**
     * Configures locator with all required type registrations.
     * @param {Object} configObject Configuration object.
     * @param {ServiceLocator} locator Service locator to configure.
     */
  }, {
    key: 'configure',
    value: function configure(configObject, locator) {
      var eventBus = new EventEmitter();
      eventBus.setMaxListeners(0);
      locator.registerInstance('eventBus', eventBus);
      locator.registerInstance('config', configObject);
      locator.register('urlArgsProvider', URLArgsProvider, configObject, true);
      locator.register('contextFactory', ContextFactory, configObject, true);
      locator.register('componentLoader', ComponentLoader, configObject, true);
      locator.register('watcherLoader', WatcherLoader, configObject, true);
      locator.register('signalLoader', SignalLoader, configObject, true);
      locator.register('documentRenderer', DocumentRenderer, configObject, true);
      locator.register('requestRouter', RequestRouter, configObject, true);

      uhr.register(locator);
    }
  }, {
    key: '_wrapEventsWithLogger',
    value: function _wrapEventsWithLogger(config, eventBus, logger) {
      var isRelease = Boolean(config.isRelease);

      eventBus.on('componentLoaded', function (args) {
        return logger.info(util.format(INFO_COMPONENT_LOADED, args.name));
      }).on('signalLoaded', function (args) {
        return logger.info(util.format(INFO_SIGNAL_LOADED, args.name));
      }).on('watcherLoaded', function (args) {
        return logger.info(util.format(INFO_WATCHER_LOADED, args.name));
      }).on('allWatchersLoaded', function () {
        return logger.info(INFO_ALL_WATCHERS_LOADED);
      }).on('allSignalsLoaded', function () {
        return logger.info(INFO_ALL_SIGNALS_LOADED);
      }).on('allComponentsLoaded', function () {
        return logger.info(INFO_ALL_COMPONENTS_LOADED);
      }).on('error', function (error) {
        return logger.error(error);
      });

      if (isRelease) {
        return;
      }

      eventBus.on('componentRender', function (args) {
        var id = args.context.attributes[moduleHelper.ATTRIBUTE_ID];
        logger.debug(util.format(DEBUG_RENDER_COMPONENT, moduleHelper.getTagNameForComponentName(args.name), id ? '#' + id : ''));
      }).on('componentRendered', function (args) {
        var id = args.context.attributes[moduleHelper.ATTRIBUTE_ID];
        logger.debug(util.format(DEBUG_COMPONENT_RENDERED, moduleHelper.getTagNameForComponentName(args.name), id ? '#' + id : '', util.isArray(args.hrTime) ? ' (' + hrTimeHelper.toMessage(args.hrTime) + ')' : ''));
      }).on('documentRendered', function (args) {
        logger.debug(util.format(DEBUG_DOCUMENT_RENDERED, args.location.toString()));
      });
    }
  }]);

  return BootstrapperBase;
})();

module.exports = BootstrapperBase;