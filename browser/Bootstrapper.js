/**
 * __BrowserBundle.js template file
 * @reference builders/BootstrapperBuilder
 */
var Catberry = require('./node_modules/catbee/dist/browser/Catberry.js');
var BootstrapperBase = require('./node_modules/catbee/dist/lib/base/BootstrapperBase.js');
var ModuleApiProvider = require('./node_modules/catbee/dist/browser/providers/ModuleApiProvider');
var CookieWrapper = require('./node_modules/catbee/dist/browser/CookieWrapper');
var Logger = require('./node_modules/catbee/dist/browser/Logger.js');
var util = require('util');

/*eslint-disable */
var watchers = [ /**__watchers**/ ];
var components = [ /**__components**/ ];
var signals = [ /**__signals**/ ];
var routes = '__routes' || [];
/*eslint-enable */

const DEBUG_DOCUMENT_UPDATED = 'Document updated (%d watcher(s) changed)';
const DEBUG_COMPONENT_BOUND = 'Component "%s" is bound';
const DEBUG_COMPONENT_UNBOUND = 'Component "%s" is unbound';

/**
 * Creates new instance of the browser Catberry's bootstrapper.
 * @constructor
 * @extends BootstrapperBase
 */
class Bootstrapper extends BootstrapperBase {
  constructor () {
    super(Catberry);

    this.create = this.create.bind(this);
  }

  /**
   * Configures Catberry's service locator.
   * @param {Object} configObject Application config object.
   * @param {ServiceLocator} locator Service locator to configure.
   */
  configure (configObject, locator) {
    super.configure(configObject, locator);

    locator.register('moduleApiProvider', ModuleApiProvider, configObject, true);
    locator.register('cookieWrapper', CookieWrapper, configObject, true);
    locator.register('logger', Logger, configObject, true);
    locator.registerInstance('window', window);

    var logger = locator.resolve('logger');
    var eventBus = locator.resolve('eventBus');
    this._wrapEventsWithLogger(configObject, eventBus, logger);

    window.onerror = function errorHandler (msg, uri, line) {
      logger.fatal(uri + ':' + line + ' ' + msg);
      return true;
    };

    routes.forEach(route => locator.registerInstance('routeDefinition', route));
    watchers.forEach(watcher => locator.registerInstance('watcher', watcher));
    signals.forEach(signal => locator.registerInstance('signal', signal));
    components.forEach(component => locator.registerInstance('component', component));
  }

  _wrapEventsWithLogger (config, eventBus, logger) {
    super._wrapEventsWithLogger(config, eventBus, logger);
    var isRelease = Boolean(config.isRelease);

    if (isRelease) {
      return;
    }

    eventBus
      .on('documentUpdated', args => {
        logger.debug(util.format(DEBUG_DOCUMENT_UPDATED, args.length));
      })
      .on('componentBound', args => {
        logger.debug(util.format(
          DEBUG_COMPONENT_BOUND,
          args.element.tagName + (args.id ? '#' + args.id : '')
        ));
      })
      .on('componentUnbound', args => {
        logger.debug(util.format(
          DEBUG_COMPONENT_UNBOUND,
          args.element.tagName + (args.id ? '#' + args.id : '')
        ));
      });
  }
}

module.exports = new Bootstrapper();
